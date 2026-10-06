const $ = (id) => document.getElementById(id);
const status = (t) => ($("status").textContent = t);

$("size").oninput = () => ($("sizeVal").textContent = $("size").value);
$("opacity").oninput = () => ($("opVal").textContent = $("opacity").value);

// Ye function website ke andar chalta hai
function injectImage(src, width, opacity) {
  const img = document.createElement("img");
  img.src = src;
  img.className = "__image_placer";
  img.draggable = false;
  Object.assign(img.style, {
    position: "absolute",
    left: window.scrollX + 100 + "px",
    top: window.scrollY + 100 + "px",
    width: width + "px",
    height: "auto",
    opacity: opacity,
    zIndex: 2147483647,
    cursor: "move",
    userSelect: "none",
  });

  let dx = 0, dy = 0, dragging = false;
  img.addEventListener("mousedown", (e) => {
    dragging = true;
    dx = e.pageX - img.offsetLeft;
    dy = e.pageY - img.offsetTop;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    img.style.left = e.pageX - dx + "px";
    img.style.top = e.pageY - dy + "px";
  });
  document.addEventListener("mouseup", () => (dragging = false));
  img.addEventListener("wheel", (e) => {
    e.preventDefault();
    const w = img.offsetWidth + (e.deltaY < 0 ? 20 : -20);
    img.style.width = Math.max(30, w) + "px";
  }, { passive: false });
  img.addEventListener("dblclick", () => img.remove());

  document.body.appendChild(img);
}

function clearImages() {
  document.querySelectorAll(".__image_placer").forEach((el) => el.remove());
}

async function run(func, args = []) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args });
    return true;
  } catch (e) {
    status("Is page par extension nahi chal sakti (jaise chrome:// pages).");
    return false;
  }
}

$("add").onclick = () => {
  const file = $("file").files[0];
  if (!file) return status("Pehle image chunein.");
  const reader = new FileReader();
  reader.onload = async () => {
    const ok = await run(injectImage, [reader.result, +$("size").value, $("opacity").value / 100]);
    if (ok) status("Image lag gayi.");
  };
  reader.readAsDataURL(file);
};

$("clear").onclick = async () => {
  if (await run(clearImages)) status("Sab images hat gayin.");
};
