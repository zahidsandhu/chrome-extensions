importScripts("common.js");

function notify(title, message) {
  chrome.notifications.create("focus:" + Date.now(), {
    type: "basic", iconUrl: "icon128.png", title, message, priority: 2
  });
}

async function updateBadge(st) {
  if (st.phase === "idle") return chrome.action.setBadgeText({ text: "" });
  const ms = st.paused ? st.remainingMs : Math.max(0, st.endsAt - Date.now());
  chrome.action.setBadgeText({ text: st.paused ? "II" : String(Math.ceil(ms / 60000)) });
  chrome.action.setBadgeBackgroundColor({ color: st.phase === "focus" ? "#d94436" : "#2f7d6d" });
}

async function applyState() {
  const st = await getState();
  await chrome.alarms.clear("phaseEnd");
  await chrome.alarms.clear("tick");
  if (st.phase !== "idle" && !st.paused) {
    chrome.alarms.create("phaseEnd", { when: st.endsAt });
    chrome.alarms.create("tick", { periodInMinutes: 1 });
  }
  updateBadge(st);
}

async function blockingActive() {
  const st = await getState();
  return st.phase === "focus" && !st.paused;
}

async function checkTab(tabId, url) {
  if (!url || !(await blockingActive())) return;
  const s = await getSettings();
  if (isBlocked(url, s.blocklist)) {
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") + "?u=" + encodeURIComponent(url) });
  }
}

async function enforceAll() {
  if (!(await blockingActive())) return;
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) checkTab(t.id, t.url);
}

chrome.tabs.onUpdated.addListener((tabId, change) => { if (change.url) checkTab(tabId, change.url); });

async function onPhaseEnd() {
  const st = await getState();
  const s = await getSettings();
  if (st.phase === "focus") {
    await bumpCount();
    await setState({ phase: "break", paused: false, endsAt: Date.now() + s.breakMin * 60000, remainingMs: 0 });
    notify("Focus mukammal", `Shabash! Ab ${s.breakMin} minute ka break lein.`);
  } else if (st.phase === "break") {
    await setState(IDLE);
    notify("Break khatam", "Agla focus session shuru karne ke liye tayyar?");
  }
  await applyState();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "phaseEnd") onPhaseEnd();
  if (alarm.name === "tick") getState().then(updateBadge);
});

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    const st = await getState();
    const s = await getSettings();
    const now = Date.now();
    if (msg.type === "start") {
      await setState({ phase: "focus", paused: false, endsAt: now + s.focusMin * 60000, remainingMs: 0 });
    } else if (msg.type === "pause" && st.phase !== "idle" && !st.paused) {
      await setState({ ...st, paused: true, remainingMs: Math.max(0, st.endsAt - now) });
    } else if (msg.type === "resume" && st.paused) {
      await setState({ ...st, paused: false, endsAt: now + st.remainingMs });
    } else if (msg.type === "reset") {
      await setState(IDLE);
    }
    await applyState();
    await enforceAll();
    send({ ok: true });
  })();
  return true;
});

async function init() {
  const st = await getState();
  // browser band tha aur session ka waqt guzar gaya: purana session saaf kar dein
  if (st.phase !== "idle" && !st.paused && st.endsAt < Date.now()) await setState(IDLE);
  await applyState();
}
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
