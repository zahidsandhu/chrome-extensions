const DEFAULTS = {
  focusMin: 25,
  breakMin: 5,
  blocklist: [
    "facebook.com", "instagram.com", "tiktok.com", "x.com",
    "twitter.com", "youtube.com/shorts", "reddit.com", "netflix.com"
  ]
};
const IDLE = { phase: "idle", paused: false, endsAt: 0, remainingMs: 0 };

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULTS, ...(settings || {}) };
}
async function getState() {
  const { state } = await chrome.storage.local.get("state");
  return { ...IDLE, ...(state || {}) };
}
function setState(state) { return chrome.storage.local.set({ state }); }

function pad(n) { return String(n).padStart(2, "0"); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
async function getTodayCount() {
  const { stats } = await chrome.storage.local.get("stats");
  return stats && stats.date === todayKey() ? stats.count : 0;
}
async function bumpCount() {
  const count = (await getTodayCount()) + 1;
  await chrome.storage.local.set({ stats: { date: todayKey(), count } });
}

function normalizeEntry(line) {
  return line.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

// "youtube.com/shorts" sirf shorts block karta hai, "facebook.com" poori site
function isBlocked(url, list) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname.toLowerCase();
  return list.some((raw) => {
    const e = normalizeEntry(raw);
    if (!e) return false;
    const i = e.indexOf("/");
    const domain = i === -1 ? e : e.slice(0, i);
    const prefix = i === -1 ? "" : e.slice(i);
    const hostOk = host === domain || host.endsWith("." + domain);
    return hostOk && (prefix === "" || path.startsWith(prefix));
  });
}
