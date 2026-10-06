const $ = (id) => document.getElementById(id);
const original = new URLSearchParams(location.search).get("u") || "";
try { $("site").textContent = new URL(original).hostname; } catch {}
if (/^https?:\/\//.test(original)) $("open").href = original;

$("back").onclick = () => (history.length > 1 ? history.back() : window.close());

async function tick() {
  const st = await getState();
  if (st.phase !== "focus" || st.paused) {
    $("active").hidden = true;
    $("done").hidden = false;
    return;
  }
  $("active").hidden = false;
  $("done").hidden = true;
  const s = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000));
  $("time").textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
tick();
setInterval(tick, 1000);
