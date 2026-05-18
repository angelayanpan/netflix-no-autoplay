// Netflix No Autoplay Banner - Content Script

let enabled = true;
const STORAGE_KEY = "netflix_no_autoplay_enabled";

// Load user preference
chrome.storage.local.get([STORAGE_KEY], (result) => {
  if (result[STORAGE_KEY] === undefined) {
    enabled = true;
    chrome.storage.local.set({ [STORAGE_KEY]: true });
  } else {
    enabled = result[STORAGE_KEY];
  }
  if (enabled) init();
});

// Listen for toggle from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE") {
    enabled = msg.enabled;
    if (!enabled) {
      observer.disconnect();
    } else {
      pauseBannerVideos();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
});

// Only match videos inside banner/billboard containers, never on watch pages
function isBannerVideo(video) {
  if (window.location.pathname.startsWith("/watch")) return false;
  return !!video.closest('[data-uia="billboard"]');
}

function pauseBannerVideos() {
  document.querySelectorAll('[data-uia="billboard"] video').forEach(pause);
}

function pause(video) {
  if (!video) return;

  video.pause();
  video.muted = true;

  if (!video._playOverridden) {
    video._playOverridden = true;
    const originalPlay = video.play.bind(video);
    video.play = function () {
      // Always allow play on watch pages
      if (window.location.pathname.startsWith("/watch")) return originalPlay();

      // Re-check storage so toggle takes effect without refresh
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          const isEnabled = result[STORAGE_KEY] === undefined ? true : result[STORAGE_KEY];
          if (!isEnabled || !isBannerVideo(video)) {
            originalPlay().then(resolve).catch(resolve);
          } else {
            console.log("[Netflix No Autoplay] Blocked banner autoplay");
            resolve();
          }
        });
      });
    };
  }

  video.addEventListener("play", onPlay);
}

function onPlay(e) {
  if (!enabled) return;
  if (window.location.pathname.startsWith("/watch")) return;
  const video = e.target;
  if (isBannerVideo(video)) video.pause();
}

// Watch for dynamically injected banner videos (Netflix is a SPA)
const observer = new MutationObserver(() => {
  if (enabled) pauseBannerVideos();
});

function init() {
  pauseBannerVideos();
  observer.observe(document.body, { childList: true, subtree: true });
}