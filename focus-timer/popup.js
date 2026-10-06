const $ = (id) => document.getElementById(id);
let state = IDLE;
let settings = DEFAULTS;

const send = (type) => chrome.runtime.sendMessage({ type });

function remainingMs() {
  if (state.phase === "idle") return settings.focusMin * 60000;
  return state.paused ? state.remainingMs : Math.max(0, state.endsAt - Date.now());
}

function render() {
  const ms = remainingMs();
  const total = Math.ceil(ms / 1000);
  $("time").textContent = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
  document.body.classList.toggle("break", state.phase === "break");

  const names = { idle: "Tayyar", focus: "Focus", break: "Break" };
  $("phase").textContent = names[state.phase] + (state.paused ? " (ruka hua)" : "");

  if (state.phase === "idle") {
    $("main").textContent = "Shuru karein";
    $("second").hidden = true;
  } else {
    $("main").textContent = state.paused ? "Jari rakhein" : "Rokein";
    $("second").hidden = false;
  }
}

async function refreshCount() {
  const n = await getTodayCount();
  $("count").textContent = `Aaj ki mukammal sessions: ${n}`;
}

$("main").onclick = () => {
  if (state.phase === "idle") send("start");
  else send(state.paused ? "resume" : "pause");
};
$("second").onclick = () => send("reset");

$("save").onclick = async () => {
  const clamp = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
  const next = {
    focusMin: clamp(+$("focusMin").value, 1, 120, DEFAULTS.focusMin),
    breakMin: clamp(+$("breakMin").value, 1, 60, DEFAULTS.breakMin),
    blocklist: $("blocklist").value.split("\n").map(normalizeEntry).filter(Boolean)
  };
  await chrome.storage.local.set({ settings: next });
  settings = next;
  await send("refresh");
  render();
  $("msg").textContent = "Save ho gaya.";
};

chrome.storage.onChanged.addListener(async () => {
  state = await getState();
  render();
  refreshCount();
});

(async () => {
  state = await getState();
  settings = await getSettings();
  $("focusMin").value = settings.focusMin;
  $("breakMin").value = settings.breakMin;
  $("blocklist").value = settings.blocklist.join("\n");
  render();
  refreshCount();
  setInterval(render, 500);
})();
