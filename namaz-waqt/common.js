const PRAYERS = [
  { key: "Fajr",    ur: "فجر",   en: "Fajr" },
  { key: "Dhuhr",   ur: "ظہر",   en: "Zuhr" },
  { key: "Asr",     ur: "عصر",   en: "Asr" },
  { key: "Maghrib", ur: "مغرب",  en: "Maghrib" },
  { key: "Isha",    ur: "عشاء",  en: "Isha" }
];

// method 1 = Karachi (Pakistan), school 1 = Hanafi Asr
const DEFAULTS = { city: "Faisalabad", country: "Pakistan", method: 1, school: 1, before: 10 };

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULTS, ...(settings || {}) };
}

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function toDate(hhmm, base = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

async function fetchTimings(s) {
  const d = new Date();
  const day = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timingsByCity/${day}` +
    `?city=${encodeURIComponent(s.city)}&country=${encodeURIComponent(s.country)}` +
    `&method=${s.method}&school=${s.school}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Shehar ya country nahi mila (" + res.status + ")");
  const json = await res.json();
  const times = {};
  PRAYERS.forEach((p) => (times[p.key] = json.data.timings[p.key].slice(0, 5)));
  const cache = { date: dateKey(d), sig: sig(s), times };
  await chrome.storage.local.set({ cache });
  return cache;
}

function sig(s) { return [s.city, s.country, s.method, s.school].join("|"); }

async function getTimings(s, force = false) {
  const { cache } = await chrome.storage.local.get("cache");
  if (!force && cache && cache.date === dateKey() && cache.sig === sig(s)) return cache;
  return fetchTimings(s);
}
