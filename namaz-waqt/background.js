importScripts("common.js");

async function scheduleToday(force = false) {
  const s = await getSettings();
  let cache;
  try {
    cache = await getTimings(s, force);
  } catch (e) {
    console.error(e);
    chrome.alarms.create("retry", { delayInMinutes: 30 });
    return;
  }

  const all = await chrome.alarms.getAll();
  for (const a of all) if (a.name.startsWith("prayer:")) await chrome.alarms.clear(a.name);

  const now = Date.now();
  for (const p of PRAYERS) {
    const at = toDate(cache.times[p.key]).getTime();
    const early = at - s.before * 60000;
    if (s.before > 0 && early > now) chrome.alarms.create(`prayer:${p.key}:before`, { when: early });
    if (at > now) chrome.alarms.create(`prayer:${p.key}:now`, { when: at });
  }

  const midnight = new Date();
  midnight.setHours(24, 0, 30, 0);
  chrome.alarms.create("midnight", { when: midnight.getTime() });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "midnight" || alarm.name === "retry") return scheduleToday();
  if (!alarm.name.startsWith("prayer:")) return;

  const [, key, kind] = alarm.name.split(":");
  const p = PRAYERS.find((x) => x.key === key);
  const s = await getSettings();
  const isNow = kind === "now";
  chrome.notifications.create(alarm.name + ":" + Date.now(), {
    type: "basic",
    iconUrl: "icon128.png",
    title: isNow ? `${p.ur} کا وقت ہو گیا` : `${p.ur} میں ${s.before} منٹ باقی`,
    message: isNow ? `${p.en} ka waqt ho gaya hai.` : `${p.en} ka waqt qareeb hai.`,
    priority: 2,
    requireInteraction: isNow
  });
});

chrome.runtime.onInstalled.addListener(() => scheduleToday(true));
chrome.runtime.onStartup.addListener(() => scheduleToday());
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "reschedule") scheduleToday(true);
});
