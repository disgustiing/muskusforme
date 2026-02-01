const express = require("express");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STREAMERS_FILE = "./streamers.json";
const CHECK_INTERVAL = 60 * 1000;

// ===== ENV =====
const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  throw new Error("❌ Twitch env не заданы");
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("❌ Telegram env не заданы");
}

// ===== STREAMERS FILE =====
function loadStreamers() {
  if (!fs.existsSync(STREAMERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(STREAMERS_FILE, "utf-8"));
}

function saveStreamers(list) {
  fs.writeFileSync(STREAMERS_FILE, JSON.stringify(list, null, 2));
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

// ===== TWITCH CHECK =====
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

// ===== TELEGRAM COMMANDS =====
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const text = msg.text.trim();
  const parts = text.split(" ");
  const cmd = parts[0];
  const arg = parts[1];

  let streamers = loadStreamers();

  if (cmd === "/add" && arg) {
    if (!streamers.includes(arg)) {
      streamers.push(arg);
      saveStreamers(streamers);
      await sendTelegram(`✅ Стример ${arg} добавлен`);
    } else {
      await sendTelegram(`⚠️ ${arg} уже есть в списке`);
    }
  }

  if (cmd === "/remove" && arg) {
    streamers = streamers.filter(s => s !== arg);
    saveStreamers(streamers);
    await sendTelegram(`🗑️ Стример ${arg} удалён`);
  }

  if (cmd === "/list") {
    if (streamers.length === 0) {
      await sendTelegram("📭 Список стримеров пуст");
    } else {
      await sendTelegram("📺 Стримеры:\n" + streamers.join("\n"));
    }
  }

  if (cmd === "/status") {
    if (streamers.length === 0) {
      await sendTelegram("📭 Нет стримеров");
    } else {
      let text = "📡 Статус:\n";
      for (const s of streamers) {
        const live = await isLive(s);
        text += `${live ? "🔴" : "⚫"} ${s}\n`;
      }
      await sendTelegram(text);
    }
  }

  res.sendStatus(200);
});

// ===== MAIN LOOP =====
const liveStatus = {};

async function loop() {
  try {
    const streamers = loadStreamers();
    for (const s of streamers) {
      if (!(s in liveStatus)) liveStatus[s] = false;

      const live = await isLive(s);
      if (live && !liveStatus[s]) {
        await sendTelegram(`🔴 ${s} только что начал стрим!\nhttps://twitch.tv/${s}`);
      }
      liveStatus[s] = live;
    }
  } catch (e) {
    console.error("❌ Ошибка цикла:", e.message);
  }
  setTimeout(loop, CHECK_INTERVAL);
}

// ===== WEB =====
app.get("/", (_, res) => {
  res.send("🚀 Twitch → Telegram bot работает");
});

// ===== START =====
app.listen(PORT, "0.0.0.0", async () => {
  console.log("🚀 Server started on port", PORT);
  await getTwitchToken();
  await sendTelegram("✅ Бот запущен и готов");
  loop();
});
