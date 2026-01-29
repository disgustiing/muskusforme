

import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# === Настройки ===
STREAMERS = ["raidstacija0904", "66petarda_rus"]
CHECK_INTERVAL = 60  # время между проверками в секундах (можно поменять на 3600 для часа)

TWITCH_CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TWITCH_CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# === Получение OAuth токена Twitch ===
def get_twitch_token():
    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": TWITCH_CLIENT_ID,
        "client_secret": TWITCH_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    resp = requests.post(url, params=params).json()
    return resp["access_token"]

TWITCH_TOKEN = get_twitch_token()
HEADERS = {
    "Client-ID": TWITCH_CLIENT_ID,
    "Authorization": f"Bearer {TWITCH_TOKEN}"
}

# === Проверка онлайн статуса ===
def is_live(user_login):
    url = f"https://api.twitch.tv/helix/streams?user_login={user_login}"
    resp = requests.get(url, headers=HEADERS).json()
    return bool(resp.get("data"))

# === Отправка уведомления в Telegram ===
def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": message})

# === Основной цикл ===
if __name__ == "__main__":
    print("Bot started!")
    
    # --- TEST: проверка Telegram ---
    send_telegram("✅ Test message: Telegram работает!")

    live_status = {s: False for s in STREAMERS}

    while True:
        for streamer in STREAMERS:
            currently_live = is_live(streamer)
            if currently_live and not live_status[streamer]:
                send_telegram(f"🔴 {streamer} только что начал стрим!")
            live_status[streamer] = currently_live
        time.sleep(CHECK_INTERVAL)
