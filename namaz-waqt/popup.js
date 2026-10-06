const $ = (id) => document.getElementById(id);
let times = null;

function fmt12(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

function nextPrayer() {
  const now = new Date();
  for (const p of PRAYERS) {
    const at = toDate(times[p.key]);
    if (at > now) return { p, at };
  }
  const tomorrow = toDate(times.Fajr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { p: PRAYERS[0], at: tomorrow };
}

function renderList() {
  const { p: next } = nextPrayer();
  const ul = $("list");
  ul.innerHTML = "";
  for (const p of PRAYERS) {
    const li = document.createElement("li");
    if (p.key === next.key) li.className = "active";
    const left = document.createElement("span");
    left.textContent = p.ur;
    const en = document.createElement("span");
    en.className = "en";
    en.textContent = p.en;
    left.appendChild(en);
    const t = document.createElement("span");
    t.className = "time";
    t.textContent = fmt12(times[p.key]);
    li.append(left, t);
    ul.appendChild(li);
  }
}

function tick() {
  if (!times) return;
  const { p, at } = nextPrayer();
  const diff = Math.max(0, Math.floor((at - new Date()) / 1000));
  $("nextName").textContent = p.ur;
  $("count").textContent = `${pad(Math.floor(diff / 3600))}:${pad(Math.floor((diff % 3600) / 60))}:${pad(diff % 60)}`;
}

async function load(force = false) {
  const s = await getSettings();
  $("city_in").value = s.city;
  $("country_in").value = s.country;
  $("method").value = s.method;
  $("school").value = s.school;
  $("before").value = s.before;
  $("city").textContent = `${s.city}, ${s.country}`;
  try {
    const cache = await getTimings(s, force);
    times = cache.times;
    $("msg").textContent = "";
    renderList();
    tick();
  } catch (e) {
    $("msg").textContent = "Auqat nahi mil sake. Internet ya shehar ka naam check karein.";
  }
}

$("save").onclick = async () => {
  const settings = {
    city: $("city_in").value.trim() || DEFAULTS.city,
    country: $("country_in").value.trim() || DEFAULTS.country,
    method: +$("method").value,
    school: +$("school").value,
    before: +$("before").value
  };
  await chrome.storage.local.set({ settings });
  chrome.runtime.sendMessage({ type: "reschedule" });
  await load(true);
  if (times) $("msg").textContent = "Save ho gaya.";
};

load();
setInterval(tick, 1000);
