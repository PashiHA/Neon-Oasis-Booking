const crypto = require("crypto");
const admin = require("firebase-admin");

let ResendLib = null;
try {
  ResendLib = require("resend");
} catch (_) {
  // resend может быть не установлен — тогда email просто не отправим
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function getEnv(name) {
  return process.env[name];
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error("Request body is not valid JSON");
  }
}

function initAdmin() {
  if (admin.apps.length) return;

  const serviceAccountJson = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  // ✅ используем твою переменную (она уже есть в Vercel)
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
  return crypto.randomBytes(16).toString("hex");
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
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

    const body = await readBody(req);

    const { name, phone, email, service, date, time, quantity } = body || {};
    if (!name || !phone || !service || !date || !time || !quantity) {
      return sendJson(res, 400, { error: "Заполните все обязательные поля" });
    }

    initAdmin();
    const db = admin.database();

    const capacity = { VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 };
    const max = capacity[service] || 1;

    // серверная проверка занятости
    const snap = await db.ref("bookings").orderByChild("date").equalTo(date).once("value");
    const all = snap.val() || {};
    const used = Object.values(all)
      .filter((b) => b.service === service && b.time === time)
      .reduce((s, b) => s + (Number(b.quantity) || 1), 0);

    const q = Number(quantity) || 1;
    if (used + q > max) {
      return sendJson(res, 409, {
        error: `На выбранный таймслот осталось только ${Math.max(0, max - used)} мест`,
      });
    }

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
      quantity: q,
      status: "new",
      createdAt,
      editableUntil,
      editTokenHash: sha256(editToken),
    });

    // editUrl может строиться даже без PUBLIC_SITE_URL
    const publicSiteUrl = (getEnv("PUBLIC_SITE_URL") || "").replace(/\/$/, "");
    const editUrl = publicSiteUrl
      ? `${publicSiteUrl}/booking/edit?bid=${bookingId}&token=${editToken}`
      : `/booking/edit?bid=${bookingId}&token=${editToken}`;

    // email опционально
    let emailSent = false;
    if (email) {
      const resendKey = getEnv("RESEND_API_KEY");
      const mailFrom = getEnv("MAIL_FROM");

      if (resendKey && mailFrom && ResendLib?.Resend) {
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
            <p><b>Кол-во:</b> ${q}</p>
            <p><b>Ссылка для изменения:</b></p>
            <p><a href="${publicSiteUrl ? editUrl : "#"}">${publicSiteUrl ? editUrl : "Ссылка появится после настройки PUBLIC_SITE_URL"}</a></p>
            <p><small>Изменение доступно до начала времени (за 15 минут закрывается).</small></p>
          `,
        });
        emailSent = true;
      }
    }

    return sendJson(res, 200, { bookingId, editUrl, emailSent });
  } catch (err) {
    console.error("create booking error:", err);
    return sendJson(res, 500, { error: "Server error", details: String(err?.message || err) });
  }
};
