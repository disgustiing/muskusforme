require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================

const PORT = process.env.PORT || 8080;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

const CHECK_INTERVAL = 60 * 1000; // 1 минута

// ================= FIXED STREAMERS =================

const STREAMERS = [
  "yarospetarda",
  "bersklarion_",
  "serega_pirat",
  "raidstacija0904"
];

// ================= TWITCH TOKEN =================

let twitchAccessToken = null;

async function getTwitchToken() {
  try {
    const response = await axios.post(
      `https://id.twitch.tv/oauth2/token`,
      null,
      {
        params: {
          client_id: TWITCH_CLIENT_ID,
          client_secret: TWITCH_CLIENT_SECRET,
          grant_type: "client_credentials",
        },
      }
    );

    twitchAccessToken = response.data.access_token;
    console.log("✅ Twitch token обновлён");

    // Обновлять токен каждые 24 часа
    setTimeout(getTwitchToken, 24 * 60 * 60 * 1000);

  } catch (error) {
    console.error("❌ Ошибка получения Twitch токена:", error.message);
    setTimeout(getTwitchToken, 60 * 1000);
  }
}

// ================= TELEGRAM =================

async function sendTelegram(message) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }
    );
  } catch (error) {
    console.error("❌ Ошибка отправки в Telegram:", error.message);
  }
}

// ================= TWITCH CHECK =================

async function isStreamerLive(username) {
  try {
    const response = await axios.get(
      `https://api.twitch.tv/helix/streams`,
      {
        params: { user_login: username },
        headers: {
          "Client-ID": TWITCH_CLIENT_ID,
          Authorization: `Bearer ${twitchAccessToken}`,
        },
      }
    );

    return response.data.data.length > 0;

  } catch (error) {
    console.error(`❌ Ошибка проверки ${username}:`, error.message);
    return false;
  }
}

// ================= LIVE STATUS TRACKING =================

const liveStatus = {};

// ================= MAIN LOOP =================

async function checkStreamers() {
  try {
    for (const streamer of STREAMERS) {
      const live = await isStreamerLive(streamer);

      if (live && !liveStatus[streamer]) {
        console.log(`🔴 ${streamer} вышел в эфир`);
        await sendTelegram(`🔴 ${streamer} начал стрим!\nhttps://twitch.tv/${streamer}`);
      }

      liveStatus[streamer] = live;
    }
  } catch (error) {
    console.error("❌ Ошибка цикла проверки:", error.message);
  }

  setTimeout(checkStreamers, CHECK_INTERVAL);
}

// ================= STATUS ROUTE =================

app.get("/", (req, res) => {
  res.send("🚀 Twitch → Telegram bot работает");
});

app.get("/status", async (req, res) => {
  const status = {};

  for (const streamer of STREAMERS) {
    const live = await isStreamerLive(streamer);
    status[streamer] = live ? "🔴 LIVE" : "⚫ OFFLINE";
  }

  res.json(status);
});

// ================= START SERVER =================

app.listen(PORT, async () => {
  console.log(`🚀 Server started on port ${PORT}`);

  await getTwitchToken();
  await sendTelegram("🤖 Twitch бот запущен");

  checkStreamers();
});
