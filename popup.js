const KEY = "netflix_no_autoplay_enabled";
const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

// Read state fresh every time popup opens
chrome.storage.local.get([KEY], (result) => {
  const enabled = result[KEY] === undefined ? true : result[KEY];
  toggle.checked = enabled;
  updateStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ [KEY]: enabled }, () => {
    updateStatus(enabled);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE", enabled }, () => {
          void chrome.runtime.lastError;
        });
      }
    });
  });
});

function updateStatus(enabled) {
  status.textContent = enabled
    ? "Active — banner video is blocked."
    : "Disabled — banner plays normally.";
}
