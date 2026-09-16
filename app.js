const clock = document.getElementById("clock");
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
let rounds = 0;
let focusedMinutes = 0;

function format(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function renderRing() {
  const progress = remaining / totalSeconds;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function render() {
  clock.textContent = format(remaining);
  phase.textContent = currentMode;
  document.title = `${format(remaining)} — FocusFlow`;
  renderRing();
}

function tick() {
  if (remaining > 0) {
    remaining -= 1;
    render();
  } else {
    stop();
    rounds += 1;
    roundsEl.textContent = rounds;
    if (currentMode === "Focus") {
      focusedMinutes += totalSeconds / 60;
      focusTimeEl.textContent = `${focusedMinutes}m`;
    }
    render();
    setTimeout(() => alert("Time's up! Take a break."), 50);
  }
}

function start() {
  if (running) return;
  running = true;
  startLabel.textContent = "Pause";
  startBtn.querySelector(".btn-icon").textContent = "❚❚";
  dial.classList.add("running");
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

// Disable the ring transition on reset so it snaps back instantly
ring.style.strokeDasharray = CIRCUMFERENCE;
render();
