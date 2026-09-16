const clock = document.getElementById("clock");
const minVal = document.getElementById("minVal");
const secVal = document.getElementById("secVal");
const phase = document.getElementById("phase");
const startBtn = document.getElementById("startBtn");
const startLabel = document.getElementById("startLabel");
const resetBtn = document.getElementById("resetBtn");
const roundsEl = document.getElementById("rounds");
const focusTimeEl = document.getElementById("focusTime");
const ring = document.getElementById("ringProgress");
const dial = document.querySelector(".dial");
const modeButtons = document.querySelectorAll(".mode");

const CIRCUMFERENCE = 2 * Math.PI * 110; // r = 110

let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let currentMode = "Focus";
let timerId = null;
let running = false;
let editing = false;
let rounds = 0;
let focusedMinutes = 0;

const pad = (n) => String(n).padStart(2, "0");
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function renderRing() {
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function render() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  if (!editing) {
    minVal.value = pad(m);
    secVal.value = pad(s);
  }
  phase.textContent = currentMode;
  document.title = `${pad(m)}:${pad(s)} — FocusFlow`;
  renderRing();
}

/* ---------- Completion sound (Web Audio, no files needed) ---------- */
let audioCtx = null;

function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
}

function playChime() {
  try {
    unlockAudio();
    if (!audioCtx) return;
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = audioCtx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.42);
    });
  } catch (e) {
    /* Audio unavailable — the on-screen alert still fires. */
  }
}

/* ---------- Timer ---------- */
function tick() {
  if (remaining > 0) {
    remaining -= 1;
    render();
  } else {
    stop();
    rounds += 1;
    roundsEl.textContent = rounds;
    if (currentMode === "Focus" || currentMode === "Custom") {
      focusedMinutes += Math.round(totalSeconds / 60);
      focusTimeEl.textContent = `${focusedMinutes}m`;
    }
    render();
    playChime();
    const wasFocus = currentMode === "Focus" || currentMode === "Custom";
    showToast(wasFocus ? "Time's up! Take a break. 🎉" : "Break's over — ready to focus?");
  }
}

/* ---------- Non-blocking toast ---------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
}

function start() {
  if (running || totalSeconds <= 0) return;
  minVal.blur();
  secVal.blur();
  running = true;
  startLabel.textContent = "Pause";
  startBtn.querySelector(".btn-icon").textContent = "❚❚";
  dial.classList.add("running");
  unlockAudio(); // allow the chime to play later (needs a user gesture)
  timerId = setInterval(tick, 1000);
}

function stop() {
  running = false;
  startLabel.textContent = "Start";
  startBtn.querySelector(".btn-icon").textContent = "▶";
  dial.classList.remove("running");
  clearInterval(timerId);
  timerId = null;
}

function reset() {
  stop();
  remaining = totalSeconds;
  render();
}

/* ---------- Editable time ---------- */
function readSegments() {
  const m = clamp(parseInt(minVal.value, 10) || 0, 0, 99);
  const s = clamp(parseInt(secVal.value, 10) || 0, 0, 59);
  let total = m * 60 + s;
  if (total <= 0) total = 60; // never allow a zero-length timer
  return total;
}

function commitTime() {
  const newTotal = readSegments();
  if (newTotal !== totalSeconds) {
    totalSeconds = newTotal;
    remaining = totalSeconds;
    modeButtons.forEach((b) => b.classList.remove("active"));
    currentMode = "Custom";
  }
  render();
}

[minVal, secVal].forEach((seg) => {
  const isMin = seg === minVal;

  seg.addEventListener("focus", () => {
    if (running) {
      seg.blur();
      return;
    }
    editing = true;
    seg.select();
  });

  // Keep only digits as the user types (maxlength caps the length).
  seg.addEventListener("input", () => {
    const cleaned = seg.value.replace(/\D/g, "");
    if (cleaned !== seg.value) seg.value = cleaned;
  });

  seg.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      seg.blur();
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const max = isMin ? 99 : 59;
      let v = parseInt(seg.value, 10) || 0;
      v += e.key === "ArrowUp" ? 1 : -1;
      if (v < 0) v = max;
      if (v > max) v = 0;
      seg.value = pad(v);
      // Live-preview the change while still editing.
      totalSeconds = readSegments();
      remaining = totalSeconds;
      modeButtons.forEach((b) => b.classList.remove("active"));
      currentMode = "Custom";
      phase.textContent = currentMode;
      renderRing();
      seg.select();
    }
  });

  seg.addEventListener("blur", () => {
    editing = false;
    commitTime();
  });
});

/* ---------- Controls & modes ---------- */
startBtn.addEventListener("click", () => {
  running ? stop() : start();
});

resetBtn.addEventListener("click", reset);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    totalSeconds = Number(btn.dataset.minutes) * 60;
    currentMode = btn.textContent;
    reset();
  });
});

ring.style.strokeDasharray = CIRCUMFERENCE;
render();
