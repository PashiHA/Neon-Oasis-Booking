// api/bookings/cancel.js
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

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

    initAdmin();
    const db = admin.database();

    const body = await readBody(req);
    const bid = String(body?.bid || "").trim();
    const token = String(body?.token || "").trim();

    if (!bid || !token) return sendJson(res, 400, { error: "bid and token are required" });

    const bookingRef = db.ref(`bookings/${bid}`);
    const snap = await bookingRef.once("value");
    const booking = snap.val();

    if (!booking) return sendJson(res, 404, { error: "Бронь не найдена" });

    // токен
    if (sha256(token) !== booking.editTokenHash) {
      return sendJson(res, 403, { error: "Неверная ссылка/код" });
    }

    if (booking.status === "cancelled") {
      return sendJson(res, 200, { ok: true, already: true });
    }

    await bookingRef.update({
      status: "cancelled",
      cancelledAt: Date.now(),
    });

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("cancel booking error:", err);
    return sendJson(res, 500, { error: "Server error", details: String(err?.message || err) });
  }
};
