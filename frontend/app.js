const searchInput = document.getElementById("searchInput");
const tracksList = document.getElementById("tracksList");
const resultCount = document.getElementById("resultCount");

const currentTitle = document.getElementById("currentTitle");
const currentArtist = document.getElementById("currentArtist");
const modalTitle = document.getElementById("modalTitle");
const modalArtist = document.getElementById("modalArtist");
const modalStatus = document.getElementById("modalStatus");

const audioEl = document.getElementById("audioEl");

const miniPlayBtn = document.getElementById("miniPlayBtn");
const modalPlayBtn = document.getElementById("modalPlayBtn");
const expandBtn = document.getElementById("expandBtn");
const modalOverlay = document.getElementById("modalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");

const miniProgressTrack = document.getElementById("miniProgressTrack");
const miniProgressFill = document.getElementById("miniProgressFill");
const miniProgressHandle = document.getElementById("miniProgressHandle");
const miniTimeCurrent = document.getElementById("miniTimeCurrent");
const miniTimeDuration = document.getElementById("miniTimeDuration");

const modalProgressTrack = document.getElementById("modalProgressTrack");
const modalProgressFill = document.getElementById("modalProgressFill");
const modalProgressHandle = document.getElementById("modalProgressHandle");
const modalTimeCurrent = document.getElementById("modalTimeCurrent");
const modalTimeDuration = document.getElementById("modalTimeDuration");

const playerBar = document.getElementById("playerBar");
const heroDisc = document.getElementById("heroDisc");
const miniDisc = document.getElementById("miniDisc");
const modalDisc = document.getElementById("modalDisc");
const visualizer = document.getElementById("visualizer");

let currentTrack = null;
let visualizerTimer = null;

// ---- build the fake visualizer bars once ----
const VISUALIZER_BARS = 28;
for (let i = 0; i < VISUALIZER_BARS; i++) {
  const bar = document.createElement("span");
  visualizer.appendChild(bar);
}

/* =========================
   SEARCH (same API as before)
========================= */

async function searchTracks(query) {
  const search = query.trim();

  if (!search) {
    resultCount.textContent = "";

    tracksList.innerHTML = `
      <div class="empty">
        <strong>Search for a song</strong>
        Type a song title or artist above.
      </div>
    `;

    return;
  }

  tracksList.innerHTML = `
    <div class="empty">
      Searching...
    </div>
  `;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/search?q=${encodeURIComponent(search)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed");
    }

    renderTracks(data.results);
  } catch (error) {
    console.error("SEARCH ERROR:", error);

    resultCount.textContent = "";

    tracksList.innerHTML = `
      <div class="empty">
        <strong>Search failed</strong>
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}

function renderTracks(trackList) {
  resultCount.textContent = `${trackList.length} ${
    trackList.length === 1 ? "result" : "results"
  }`;

  if (trackList.length === 0) {
    tracksList.innerHTML = `
      <div class="empty">
        No matching songs found.
      </div>
    `;

    return;
  }

  tracksList.innerHTML = trackList
    .map((track) => {
      return `
        <article
          class="track"
          data-url="${escapeAttribute(track.url)}"
        >
          <div class="track-icon">
            ♪
          </div>

          <div class="track-info">
            <div class="track-title">
              ${escapeHTML(track.title)}
            </div>

            <div class="track-artist">
              ${escapeHTML(track.artist || "Unknown artist")}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".track").forEach((trackElement) => {
    trackElement.addEventListener("click", () => {
      const url = trackElement.dataset.url;

      const title = trackElement
        .querySelector(".track-title")
        .textContent.trim();
      const artist = trackElement
        .querySelector(".track-artist")
        .textContent.trim();

      markActiveTrack(trackElement);

      playTrack({
        title,
        artist,
        url,
      });
    });
  });
}

function markActiveTrack(activeElement) {
  document.querySelectorAll(".track").forEach((el) => {
    el.classList.remove("active");
    el.querySelector(".track-icon").innerHTML = "♪";
  });

  activeElement.classList.add("active");
  activeElement.querySelector(".track-icon").innerHTML =
    '<div class="eq"><span></span><span></span><span></span></div>';
}

/* =========================
   PLAYBACK (same API as before, custom UI)
========================= */

async function playTrack(track) {
  currentTrack = track;

  setTitle(track.title, "Loading...");
  setModalStatus("");

  enablePlayerControls(true);

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/audio?url=${encodeURIComponent(track.url)}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load audio");
    }

    setTitle(data.title || track.title, track.artist);

    audioEl.src = data.url;
    await audioEl.play();
  } catch (error) {
    console.error("PLAY ERROR:", error);

    setTitle(track.title, "Failed to load audio");
    setModalStatus(error.message);
    setPlayingState(false);
  }
}

function setTitle(title, artist) {
  currentTitle.textContent = title;
  currentArtist.textContent = artist;
  modalTitle.textContent = title;
  modalArtist.textContent = artist;
}

function setModalStatus(message) {
  modalStatus.textContent = message ? `⚠ ${message}` : "";
}

function enablePlayerControls(enabled) {
  miniPlayBtn.disabled = !enabled;
  expandBtn.disabled = !enabled;
}

/* =========================
   PLAY / PAUSE
========================= */

function togglePlay() {
  if (!currentTrack) return;

  if (audioEl.paused) {
    audioEl.play();
  } else {
    audioEl.pause();
  }
}

miniPlayBtn.addEventListener("click", togglePlay);
modalPlayBtn.addEventListener("click", togglePlay);

audioEl.addEventListener("play", () => setPlayingState(true));
audioEl.addEventListener("pause", () => setPlayingState(false));
audioEl.addEventListener("ended", () => setPlayingState(false));

function setPlayingState(isPlaying) {
  document.body.classList.toggle("is-playing", isPlaying);

  [[miniPlayBtn], [modalPlayBtn]].forEach(([btn]) => {
    btn.querySelector(".icon-play").style.display = isPlaying ? "none" : "";
    btn.querySelector(".icon-pause").style.display = isPlaying ? "" : "none";
  });

  if (isPlaying) {
    startVisualizer();
  } else {
    stopVisualizer();
  }
}

/* =========================
   PROGRESS / SEEK / SKIP
========================= */

audioEl.addEventListener("loadedmetadata", () => {
  const duration = formatTime(audioEl.duration);
  miniTimeDuration.textContent = duration;
  modalTimeDuration.textContent = duration;
});

audioEl.addEventListener("timeupdate", () => {
  if (!audioEl.duration) return;

  const ratio = audioEl.currentTime / audioEl.duration;
  updateProgressUI(ratio);

  const current = formatTime(audioEl.currentTime);
  miniTimeCurrent.textContent = current;
  modalTimeCurrent.textContent = current;
});

function updateProgressUI(ratio) {
  const percent = `${Math.min(100, Math.max(0, ratio * 100))}%`;

  miniProgressFill.style.width = percent;
  miniProgressHandle.style.left = percent;

  modalProgressFill.style.width = percent;
  modalProgressHandle.style.left = percent;
}

function seekFromClick(event, track) {
  if (!audioEl.duration) return;

  const rect = track.getBoundingClientRect();
  const ratio = Math.min(
    1,
    Math.max(0, (event.clientX - rect.left) / rect.width),
  );

  audioEl.currentTime = ratio * audioEl.duration;
  updateProgressUI(ratio);
}

miniProgressTrack.addEventListener("click", (e) =>
  seekFromClick(e, miniProgressTrack),
);
modalProgressTrack.addEventListener("click", (e) =>
  seekFromClick(e, modalProgressTrack),
);

function skip(seconds) {
  if (!audioEl.duration) return;

  audioEl.currentTime = Math.min(
    audioEl.duration,
    Math.max(0, audioEl.currentTime + seconds),
  );
}

document.querySelectorAll(".skip-btn").forEach((btn) => {
  btn.addEventListener("click", () => skip(Number(btn.dataset.skip)));
});

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

/* =========================
   FULLSCREEN MODAL
========================= */

expandBtn.addEventListener("click", () => {
  modalOverlay.classList.add("open");
});

modalCloseBtn.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function closeModal() {
  modalOverlay.classList.remove("open");
}

/* =========================
   VISUALIZER (decorative)
========================= */

function startVisualizer() {
  stopVisualizer();

  const bars = visualizer.querySelectorAll("span");

  visualizerTimer = setInterval(() => {
    bars.forEach((bar) => {
      const height = 4 + Math.random() * 28;
      bar.style.height = `${height}px`;
    });
  }, 120);
}

function stopVisualizer() {
  if (visualizerTimer) {
    clearInterval(visualizerTimer);
    visualizerTimer = null;
  }

  visualizer.querySelectorAll("span").forEach((bar) => {
    bar.style.height = "4px";
  });
}

/* =========================
   SEARCH INPUT WIRING
========================= */

function handleSearch() {
  searchTracks(searchInput.value);
}

searchInput.addEventListener("input", handleSearch);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSearch();
  }
});

/* =========================
   HELPERS
========================= */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
