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
    minVal.textContent = pad(m);
    secVal.textContent = pad(s);
  }
  phase.textContent = currentMode;
  document.title = `${pad(m)}:${pad(s)} — FocusFlow`;
  renderRing();
}

/* ---------- Completion sound (Web Audio, no files needed) ---------- */
let audioCtx = null;

function playChime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    // Three ascending notes for a gentle "ding-ding-ding".
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
    /* Audio not available — the on-screen alert still fires. */
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
    setTimeout(() => alert("Time's up! Take a break."), 60);
  }
}

function start() {
  if (running || totalSeconds <= 0) return;
  minVal.blur();
  secVal.blur();
  running = true;
  startLabel.textContent = "Pause";
  startBtn.querySelector(".btn-icon").textContent = "❚❚";
  dial.classList.add("running");
  // Unlock audio on the first user gesture so the chime can play later.
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
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
function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function applyTime() {
  const m = clamp(parseInt(minVal.textContent, 10) || 0, 0, 99);
  const s = clamp(parseInt(secVal.textContent, 10) || 0, 0, 59);
  totalSeconds = m * 60 + s;
  if (totalSeconds <= 0) totalSeconds = 60; // never allow a zero timer
  remaining = totalSeconds;
  modeButtons.forEach((b) => b.classList.remove("active"));
  currentMode = "Custom";
}

[minVal, secVal].forEach((seg) => {
  const isMin = seg === minVal;

  seg.addEventListener("focus", () => {
    if (running) {
      seg.blur();
      return;
    }
    editing = true;
    selectAll(seg);
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
      let v = parseInt(seg.textContent, 10) || 0;
      v += e.key === "ArrowUp" ? 1 : -1;
      if (v < 0) v = max;
      if (v > max) v = 0;
      seg.textContent = pad(v);
      applyTime();
      renderRing();
      selectAll(seg);
      return;
    }
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
    if (allowed.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    // Cap at 2 digits unless some text is selected (which will be replaced).
    const hasSelection = window.getSelection().toString().length > 0;
    if (seg.textContent.length >= 2 && !hasSelection) e.preventDefault();
  });

  seg.addEventListener("blur", () => {
    editing = false;
    const m = clamp(parseInt(minVal.textContent, 10) || 0, 0, 99);
    const s = clamp(parseInt(secVal.textContent, 10) || 0, 0, 59);
    let newTotal = m * 60 + s;
    if (newTotal <= 0) newTotal = 60;
    if (newTotal !== totalSeconds) {
      totalSeconds = newTotal;
      remaining = totalSeconds;
      modeButtons.forEach((b) => b.classList.remove("active"));
      currentMode = "Custom";
    }
    render();
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
