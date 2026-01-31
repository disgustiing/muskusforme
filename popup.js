const textarea = document.getElementById("streamers");
const status = document.getElementById("status");
const saveBtn = document.getElementById("save");

// загрузка при открытии popup
browser.storage.local.get("streamers").then(data => {
  if (data.streamers) {
    textarea.value = data.streamers.join(", ");
  }
});

saveBtn.addEventListener("click", () => {
  const streamers = textarea.value
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  browser.storage.local.set({ streamers });

  status.textContent = "Сохранено ✔";

  // 👇 сюда позже добавим fetch на сервер
  console.log("Стримеры:", streamers);
});
