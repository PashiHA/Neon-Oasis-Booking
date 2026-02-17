import crypto from "crypto";
import admin from "firebase-admin";

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

// проверка вместимости при смене слота/кол-ва
async function checkCapacity(db, bookingId, nextData) {
  const capacity = { VR: 4, PS5: 2, Billiard: 2, Autosim: 2, PC: 5 };
  const max = capacity[nextData.service] || 1;

  const snap = await db.ref("bookings").orderByChild("date").equalTo(nextData.date).once("value");
  const all = snap.val() || {};

  const used = Object.entries(all)
    .filter(([id, b]) =>
      id !== bookingId &&
      b.service === nextData.service &&
      b.date === nextData.date &&
      b.time === nextData.time
    )
    .reduce((s, [, b]) => s + (Number(b.quantity) || 1), 0);

  const q = Number(nextData.quantity) || 1;
  if (used + q > max) {
    return { ok: false, error: `На выбранный таймслот осталось только ${Math.max(0, max - used)} мест` };
  }

  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    initAdmin();
    const db = admin.database();

    const { bid, token, patch } = req.body || {};
    if (!bid || !token || !patch) {
      return res.status(400).json({ error: "bid, token, patch are required" });
    }

    const bookingRef = db.ref(`bookings/${bid}`);
    const snap = await bookingRef.once("value");
    const booking = snap.val();

    if (!booking) {
      return res.status(404).json({ error: "Бронь не найдена" });
    }

    // ✅ проверяем срок редактирования
    const now = Date.now();
    if (booking.editableUntil && now > booking.editableUntil) {
      return res.status(403).json({ error: "Время для изменения брони истекло" });
    }

    // ✅ проверяем токен
    const tokenHash = sha256(token);
    if (tokenHash !== booking.editTokenHash) {
      return res.status(403).json({ error: "Неверный код/ссылка для изменения" });
    }

    // ✅ формируем новые данные (что разрешаем менять)
    const allowed = ["service", "date", "time", "quantity", "name", "phone", "email"];
    const next = { ...booking };
    for (const k of allowed) {
      if (k in patch) next[k] = patch[k];
    }

    // приведение типов
    next.quantity = Number(next.quantity) || 1;

    // ✅ если меняют слот/количество/сервис — проверяем вместимость
    const needCapacityCheck =
      next.service !== booking.service ||
      next.date !== booking.date ||
      next.time !== booking.time ||
      next.quantity !== booking.quantity;

    if (needCapacityCheck) {
      const cap = await checkCapacity(db, bid, next);
      if (!cap.ok) return res.status(409).json({ error: cap.error });
    }

    // ✅ обновляем
    await bookingRef.update({
      service: next.service,
      date: next.date,
      time: next.time,
      quantity: next.quantity,
      name: next.name,
      phone: next.phone,
      email: next.email || "",
      updatedAt: now,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
}
