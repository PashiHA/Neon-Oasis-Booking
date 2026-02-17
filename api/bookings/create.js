import crypto from "crypto";
import admin from "firebase-admin";
import { Resend } from "resend";

/**
 * Используем твою переменную:
 * - REACT_APP_FIREBASE_DATABASE_URL (у тебя уже есть)
 *
 * Добавь в Vercel (Server-only):
 * - FIREBASE_SERVICE_ACCOUNT_JSON
 * - RESEND_API_KEY
 * - MAIL_FROM
 * - PUBLIC_SITE_URL
 */

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function initAdmin() {
  if (admin.apps.length) return;

  const serviceAccountJson = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const databaseURL =
    process.env.REACT_APP_FIREBASE_DATABASE_URL || mustEnv("REACT_APP_FIREBASE_DATABASE_URL");

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

// По умолчанию: редактирование до начала слота - 15 минут
function calcEditableUntil(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);

  // Важно: тут берём UTC. Если у тебя в Молдове (+2), и ты хочешь строго локально —
  // лучше хранить/считать в локальном времени. Но для начала оставим так.
  const slotUtc = Date.UTC(y, m - 1, d, hh, mm, 0);
  return slotUtc - 15 * 60 * 1000;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    initAdmin();

    const db = admin.database();

    const {
      name,
      phone,
      email,
      service,
      date,
      time,
      quantity,
    } = req.body || {};

    if (!name || !phone || !service || !date || !time || !quantity) {
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    }

    // ✅ вместимость, включая ПК
    const capacity = { VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 };
    const max = capacity[service] || 1;

    // ✅ серверная проверка занятости
    const snap = await db.ref("bookings").orderByChild("date").equalTo(date).once("value");
    const all = snap.val() || {};
    const used = Object.values(all)
      .filter((b) => b.service === service && b.time === time)
      .reduce((s, b) => s + (Number(b.quantity) || 1), 0);

    const q = Number(quantity) || 1;
    if (used + q > max) {
      return res.status(409).json({
        error: `На выбранный таймслот осталось только ${Math.max(0, max - used)} мест`,
      });
    }

    // ✅ создаём бронь
    const editToken = makeToken();
    const createdAt = Date.now();
    const editableUntil = calcEditableUntil(date, time);

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
      editTokenHash: sha256(editToken), // ✅ храним ХЭШ, не токен
    });

    const publicSiteUrl = mustEnv("PUBLIC_SITE_URL").replace(/\/$/, "");
    const editUrl = `${publicSiteUrl}/booking/edit?bid=${bookingId}&token=${editToken}`;

    // ✅ отправка письма (если указан email)
    let emailSent = false;
    if (email) {
      const resendKey = mustEnv("RESEND_API_KEY");
      const mailFrom = mustEnv("MAIL_FROM");

      const resend = new Resend(resendKey);

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
          <p><a href="${editUrl}">${editUrl}</a></p>
          <p><small>Изменение доступно до начала времени (за 15 минут закрывается).</small></p>
        `,
      });

      emailSent = true;
    }

    return res.status(200).json({
      bookingId,
      editUrl,     // можешь показать на сайте
      emailSent,   // true/false
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
}
