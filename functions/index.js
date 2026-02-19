const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("dotenv").config();

admin.initializeApp();

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("TG_BOT_TOKEN / TG_CHAT_ID not set");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
    }),
  });

  if (!res.ok) {
    console.log("Telegram error:", await res.text());
  }
}

exports.notifyBooking = functions.database
  .ref("/bookings/{id}")
  .onCreate(async (snap, ctx) => {
    const b = snap.val() || {};

    const msg =
      `✅ НОВАЯ БРОНЬ\n` +
      `🎮 Активность: ${b.activity || "-"}\n` +
      `👤 Имя: ${b.name || "-"}\n` +
      `📞 Телефон: ${b.phone || "-"}\n` +
      `🆔 ID: ${ctx.params.id}`;

    await sendTelegram(msg);
  });
