// api/bookings/update.js
const crypto = require("crypto");
const admin = require("firebase-admin");

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
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

function initAdmin() {
  if (admin.apps.length) return;

  const serviceAccountJson = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
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

// Проверка вместимости при изменении
async function checkCapacity(db, bookingId, next) {
  const capacity = { VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 };
  const max = capacity[next.service] || 1;

  const snap = await db.ref("bookings").orderByChild("date").equalTo(next.date).once("value");
  const all = snap.val() || {};

  const used = Object.entries(all)
    .filter(([id, b]) => {
      if (id === bookingId) return false;
      if (b.status === "cancelled") return false;
      return b.service === next.service && b.time === next.time && b.date === next.date;
    })
    .reduce((sum, [, b]) => sum + (Number(b.quantity) || 1), 0);

  const q = Number(next.quantity) || 1;
  if (used + q > max) {
    return { ok: false, error: `На выбранный таймслот осталось только ${Math.max(0, max - used)} мест` };
  }
  return { ok: true };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

    initAdmin();
    const db = admin.database();

    const body = await readBody(req);
    const bid = String(body?.bid || "").trim();
    const token = String(body?.token || "").trim();
    const patch = body?.patch || null;

    if (!bid || !token || !patch) {
      return sendJson(res, 400, { error: "bid, token, patch are required" });
    }

    const bookingRef = db.ref(`bookings/${bid}`);
    const snap = await bookingRef.once("value");
    const booking = snap.val();

    if (!booking) return sendJson(res, 404, { error: "Бронь не найдена" });

    // запрет редактирования после времени editableUntil
    const now = Date.now();
    if (booking.editableUntil && now > booking.editableUntil) {
      return sendJson(res, 403, { error: "Время для изменения брони истекло" });
    }

    // токен
    if (sha256(token) !== booking.editTokenHash) {
      return sendJson(res, 403, { error: "Неверная ссылка/код" });
    }

    if (booking.status === "cancelled") {
      return sendJson(res, 409, { error: "Эта бронь уже отменена" });
    }

    // что разрешаем менять
    const allowed = ["service", "date", "time", "quantity", "name", "phone", "email"];
    const next = { ...booking };
    for (const k of allowed) {
      if (k in patch) next[k] = patch[k];
    }

    // нормализуем
    next.service = String(next.service || "").trim();
    next.date = String(next.date || "").trim();
    next.time = String(next.time || "").trim();
    next.name = String(next.name || "").trim();
    next.phone = String(next.phone || "").trim();
    next.email = String(next.email || "").trim();
    next.quantity = Number(next.quantity) || 1;

    if (!next.service || !next.date || !next.time || !next.name || !next.phone) {
      return sendJson(res, 400, { error: "Некорректные данные" });
    }

    // проверяем вместимость если меняют слот/кол-во/сервис
    const needCapacityCheck =
      next.service !== booking.service ||
      next.date !== booking.date ||
      next.time !== booking.time ||
      next.quantity !== booking.quantity;

    if (needCapacityCheck) {
      const cap = await checkCapacity(db, bid, next);
      if (!cap.ok) return sendJson(res, 409, { error: cap.error });
    }

    await bookingRef.update({
      service: next.service,
      date: next.date,
      time: next.time,
      quantity: next.quantity,
      name: next.name,
      phone: next.phone,
      email: next.email,
      updatedAt: now,
    });

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("update booking error:", err);
    return sendJson(res, 500, { error: "Server error", details: String(err?.message || err) });
  }
};
