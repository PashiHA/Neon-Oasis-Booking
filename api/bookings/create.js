// api/bookings/create.js
// Создание брони + (опционально) отправка письма со ссылкой на изменение
// Работает на Vercel как Node Serverless Function (CommonJS)

const crypto = require("crypto");
const admin = require("firebase-admin");

let ResendLib = null;
try {
  ResendLib = require("resend");
} catch (_) {
  // Если resend не установлен — письмо не отправим, но бронь создадим
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getEnv(name) {
  return process.env[name];
}

async function readBody(req) {
  // Иногда req.body не заполнен — читаем raw
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body is not valid JSON");
  }
}

function initAdmin() {
  if (admin.apps.length) return;

  // ✅ берём Service Account JSON (добавить в Vercel)
  const serviceAccountJson = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  // ✅ у тебя уже есть это в Vercel
  const databaseURL =
    getEnv("REACT_APP_FIREBASE_DATABASE_URL") || mustEnv("REACT_APP_FIREBASE_DATABASE_URL");

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    databaseURL,
  });
}

function sha256(x) {
  return crypto.createHash("sha256").update(x).digest("hex");
}

function makeToken() {
  return crypto.randomBytes(16).toString("hex"); // 32 символа
}

// редактирование до начала слота - 15 минут
function editableUntilMs(dateStr, timeStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  const slotUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  return slotUtc - 15 * 60 * 1000;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    const body = await readBody(req);

    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const email = String(body?.email || "").trim();
    const service = String(body?.service || "").trim();
    const date = String(body?.date || "").trim();
    const time = String(body?.time || "").trim();
    const quantity = Number(body?.quantity) || 1;

    if (!name || !phone || !service || !date || !time || !quantity) {
      return sendJson(res, 400, { error: "Заполните все обязательные поля" });
    }

    // ✅ инициализация админки Firebase
    initAdmin();
    const db = admin.database();

    // ✅ вместимость, включая ПК
    const capacity = { VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 };
    const max = capacity[service] || 1;

    // ✅ серверная проверка занятости слота
    const snap = await db.ref("bookings").orderByChild("date").equalTo(date).once("value");
    const all = snap.val() || {};

    const used = Object.values(all)
      .filter((b) => b.service === service && b.time === time)
      .reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);

    if (used + quantity > max) {
      return sendJson(res, 409, {
        error: `На выбранный таймслот осталось только ${Math.max(0, max - used)} мест`,
      });
    }

    // ✅ создаём бронь
    const editToken = makeToken();
    const createdAt = Date.now();
    const editableUntil = editableUntilMs(date, time);

    const newRef = db.ref("bookings").push();
    const bookingId = newRef.key;

    await newRef.set({
      bookingId,
      name,
      phone,
      email: email || "",
      service,
      date,
      time,
      quantity,
      status: "new",
      createdAt,
      editableUntil,
      editTokenHash: sha256(editToken), // ✅ храним хэш токена
    });

    // ✅ формируем ссылку (нужна переменная PUBLIC_SITE_URL, иначе будет относительная)
    const publicSiteUrl = String(getEnv("PUBLIC_SITE_URL") || "").replace(/\/$/, "");
    const editUrl = publicSiteUrl
      ? `${publicSiteUrl}/booking/edit?bid=${bookingId}&token=${editToken}`
      : `/booking/edit?bid=${bookingId}&token=${editToken}`;

    // ✅ Отправка письма (опционально)
    let emailSent = false;
    let emailError = null;

    if (email) {
      const resendKey = getEnv("RESEND_API_KEY");
      const mailFrom = getEnv("MAIL_FROM");

      // Логи в Vercel Runtime Logs (очень полезно для отладки)
      console.log("EMAIL RECEIVED:", email);
      console.log("RESEND_API_KEY exists:", !!resendKey);
      console.log("MAIL_FROM:", mailFrom || "(missing)");
      console.log("PUBLIC_SITE_URL:", publicSiteUrl || "(missing)");

      try {
        if (!resendKey) throw new Error("Missing env var: RESEND_API_KEY");
        if (!mailFrom) throw new Error("Missing env var: MAIL_FROM");
        if (!ResendLib?.Resend) throw new Error("Package 'resend' is not installed. Run: npm i resend");

        const resend = new ResendLib.Resend(resendKey);

        await resend.emails.send({
          from: mailFrom,
          to: email,
          subject: `Neon Oasis — бронь ${bookingId}`,
          html: `
            <p>Бронь создана ✅</p>
            <p><b>Номер:</b> ${bookingId}</p>
            <p><b>Развлечение:</b> ${service}</p>
            <p><b>Дата/время:</b> ${date} ${time}</p>
            <p><b>Кол-во:</b> ${quantity}</p>
            <p><b>Ссылка для изменения брони:</b></p>
            <p><a href="${editUrl}">${editUrl}</a></p>
            <p><small>Изменение доступно до начала времени (за 15 минут закрывается).</small></p>
          `,
        });

        emailSent = true;
      } catch (e) {
        emailError = String(e?.message || e);
        console.error("EMAIL SEND ERROR:", e);
      }
    }

    return sendJson(res, 200, {
      bookingId,
      editUrl,
      emailSent,
      emailError, // если письмо не отправилось — тут будет причина
    });
  } catch (err) {
    console.error("create booking error:", err);
    return sendJson(res, 500, {
      error: "Server error",
      details: String(err?.message || err),
    });
  }
};
