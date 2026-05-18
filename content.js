// Netflix No Autoplay Banner - Content Script

let enabled = true;
const STORAGE_KEY = "netflix_no_autoplay_enabled";

// Load user preference
chrome.storage.local.get([STORAGE_KEY], (result) => {
  enabled = result[STORAGE_KEY] !== false; // default ON
  if (enabled) init();
});

// Listen for toggle from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE") {
    enabled = msg.enabled;
    if (!enabled) {
      // Re-allow videos to play naturally (just stop intercepting)
      observer.disconnect();
    } else {
      pauseBannerVideos();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
});

function pauseBannerVideos() {
  // Target the hero/billboard video elements Netflix uses
  // They typically live inside .billboard, .hero, or have a data-videoid attr
  const videos = document.querySelectorAll(
    '.billboard video, .hero-image-wrapper video, [data-videoid] video, video[data-videoid]'
  );

  videos.forEach(pause);

  // Also catch any video that is positioned absolute and full-width (the banner pattern)
  document.querySelectorAll("video").forEach((vid) => {
    const style = vid.getAttribute("style") || "";
    const isBanner =
      style.includes("position: absolute") &&
      style.includes("width: 100%") &&
      style.includes("height: 100%");
    if (isBanner) pause(vid);
  });
}

function pause(video) {
  if (!video) return;

  // Pause and mute
  video.pause();
  video.muted = true;

  // Override play() so Netflix's JS can't restart it
  if (!video._playOverridden) {
    video._playOverridden = true;
    const originalPlay = video.play.bind(video);
    video.play = function () {
      if (!enabled) return originalPlay(); // restored when toggled off
      console.log("[Netflix No Autoplay] Blocked autoplay on banner video");
      return Promise.resolve(); // silently swallow the play() call
    };
  }

  // Also listen for any attempt to unpause via the 'play' event
  video.addEventListener("play", onPlay);
}

function onPlay(e) {
  if (!enabled) return;
  const video = e.target;
  // Only intercept if it looks like the banner (not the actual content player)
  const style = video.getAttribute("style") || "";
  const isBanner =
    style.includes("position: absolute") &&
    style.includes("width: 100%") &&
    style.includes("height: 100%");
  if (isBanner) {
    video.pause();
  }
}

// Watch for dynamically injected banner videos (Netflix is a SPA)
const observer = new MutationObserver(() => {
  if (enabled) pauseBannerVideos();
});

function init() {
  pauseBannerVideos();
  observer.observe(document.body, { childList: true, subtree: true });
}
