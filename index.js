const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== НАСТРОЙКИ =====
const STREAMERS = ["raidstacija0904", "66petarda_rus"];
const CHECK_INTERVAL = 60 * 1000;

// ===== ENV =====
const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

// ===== ПРОВЕРКИ =====
if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error("❌ Twitch env не заданы");
  process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌ Telegram env не заданы");
  process.exit(1);
}

// ===== TWITCH TOKEN =====
let twitchToken = null;

async function getTwitchToken() {
  const r = await axios.post(
    "https://id.twitch.tv/oauth2/token",
    null,
    {
      params: {
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials",
      },
    }
  );
  twitchToken = r.data.access_token;
  console.log("✅ Twitch token получен");
}

// ===== CHECK STREAM =====
async function isLive(user) {
  const r = await axios.get(
    `https://api.twitch.tv/helix/streams?user_login=${user}`,
    {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${twitchToken}`,
      },
    }
  );
  return r.data.data.length > 0;
}

// ===== TELEGRAM =====
async function sendTelegram(text) {
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }
  );
}

// ===== MAIN LOOP =====
const liveStatus = {};
STREAMERS.forEach(s => (liveStatus[s] = false));

async function loop() {
  try {
    for (const s of STREAMERS) {
      const live = await isLive(s);
      if (live && !liveStatus[s]) {
        await sendTelegram(`🔴 ${s} только что начал стрим!`);
      }
      liveStatus[s] = live;
    }
  } catch (e) {
    console.error("❌ Loop error:", e.message);
  }
  setTimeout(loop, CHECK_INTERVAL);
}

// ===== WEB (для Railway healthcheck) =====
app.get("/", (req, res) => {
  res.send("🚀 Twitch → Telegram bot работает");
});

// ===== START =====
app.listen(PORT, "0.0.0.0", async () => {
  console.log("🚀 Server started on port", PORT);
  await getTwitchToken();
  await sendTelegram("✅ Бот запущен и работает");
  loop();
});
