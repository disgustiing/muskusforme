const express = require("express");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const STREAMERS_FILE = "./streamers.json";

// ====== helpers ======
function loadStreamers() {
  if (!fs.existsSync(STREAMERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(STREAMERS_FILE, "utf-8"));
}

function saveStreamers(list) {
  fs.writeFileSync(STREAMERS_FILE, JSON.stringify(list, null, 2));
}

// ====== routes ======
app.get("/", (req, res) => {
  res.send("Twitch watcher is alive 🚀");
});

app.get("/streamers", (req, res) => {
  res.json(loadStreamers());
});

app.post("/subscribe", (req, res) => {
  const { streamers, telegramId } = req.body;

  if (!Array.isArray(streamers) || !telegramId) {
    return res.status(400).json({ error: "Bad data" });
  }

  const current = loadStreamers();

  streamers.forEach(name => {
    if (!current.find(s => s.name === name)) {
      current.push({
        name,
        telegramId,
        live: false
      });
    }
  });

  saveStreamers(current);
  res.json({ ok: true, streamers: current });
});

// ====== debug ======
console.log("=== APP START ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", PORT);

// ====== start ======
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server started on port", PORT);
});
