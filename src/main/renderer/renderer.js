// =============================================================================
// renderer.js — runs INSIDE the app window (the "webpage" half of Electron).
// It never touches the filesystem directly. Every disk operation goes through
// `window.api.<name>(...)`, which preload.js exposed for us. main.js does the
// real work and hands back the result.
// =============================================================================

// `root`  = the real folder on disk the app is currently pointed at.
// `stack` = the navigation trail of folders we've drilled into, each entry
//           being { name, path }, so we can render breadcrumbs and jump back.
let root = null;
let stack = [];

const board = document.getElementById("board");
const crumbTrail = document.getElementById("crumbTrail");
const homeCrumb = document.getElementById("homeCrumb");
const tabsEl = document.getElementById("tabs");
const addBtn = document.getElementById("addBtn");
const flyout = document.getElementById("flyout");
const templateOption = document.getElementById("templateOption");
const uploadOption = document.getElementById("uploadOption");

// -----------------------------------------------------------------------
// The "+" button: toggles a small flyout with "Upload" (intentionally
// disabled for now — a stretch goal) and "Template" (builds the starter
// Images/Documents/Miscellaneous layout inside a folder you choose).
// -----------------------------------------------------------------------
addBtn.onclick = (e) => {
  e.stopPropagation();
  flyout.hidden = !flyout.hidden;
};
// Clicking anywhere else closes the flyout.
document.addEventListener("click", () => { flyout.hidden = true; });

templateOption.onclick = async (e) => {
  e.stopPropagation();
  flyout.hidden = true;
  const chosen = await window.api.chooseFolder();
  if (!chosen) return; // user cancelled the dialog
  await window.api.createTemplate(chosen);
  root = chosen;
  stack = [{ name: "Home", path: root }];
  await renderTabs();
  await renderBoard();
};

// -----------------------------------------------------------------------
// UPLOAD: opens the OS's native file picker, then copies whatever you
// chose into the folder you're CURRENTLY VIEWING (the last entry on the
// nav stack) — so "Upload" always drops files where you're looking.
// -----------------------------------------------------------------------
uploadOption.onclick = async (e) => {
  e.stopPropagation();
  flyout.hidden = true;

  if (!root) {
    alert("Create a template first (Template button) so there's a folder to upload into.");
    return;
  }

  const filePaths = await window.api.chooseFiles();
  if (filePaths.length === 0) return; // user cancelled

  const destFolder = stack[stack.length - 1].path;
  await window.api.copyFilesInto(destFolder, filePaths);

  // Refresh whatever's currently on screen so the new files show up as
  // bubbles right away. Also refresh the sidebar tabs, in case you
  // uploaded directly into Home and created a new top-level folder-worthy
  // file (tabs only reflect folders, but this keeps things in sync).
  await renderBoard();
  await renderTabs();
  highlightActiveTab();
};

homeCrumb.onclick = () => {
  if (!root) return;
  stack = [{ name: "Home", path: root }];
  renderBoard();
  highlightActiveTab();
};

// -----------------------------------------------------------------------
// SIDEBAR TABS — one per top-level folder inside root (e.g. "Images",
// "Documents", "Miscellaneous", or whatever you renamed them to), so you
// can jump straight into any top-level category with one click.
// -----------------------------------------------------------------------
async function renderTabs() {
  tabsEl.innerHTML = "";
  if (!root) return;

  const items = await window.api.listDir(root);
  const folders = items.filter((i) => i.type === "folder");

  for (const folder of folders) {
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = folder.name;
    tab.dataset.path = folder.path;
    tab.onclick = () => {
      stack = [{ name: "Home", path: root }, { name: folder.name, path: folder.path }];
      renderBoard();
      highlightActiveTab();
    };
    tabsEl.appendChild(tab);
  }
}

function highlightActiveTab() {
  const activePath = stack.length > 1 ? stack[1].path : null;
  [...tabsEl.children].forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.path === activePath);
  });
}

// -----------------------------------------------------------------------
// Draw the current folder's contents as bubbles on the board.
// -----------------------------------------------------------------------
async function renderBoard() {
  board.innerHTML = "";
  const current = stack[stack.length - 1];
  drawBreadcrumbs();

  const items = await window.api.listDir(current.path);

  if (items.length === 0) {
    const hint = document.createElement("div");
    hint.style.opacity = 0.6;
    hint.textContent = "This folder is empty.";
    board.appendChild(hint);
    return;
  }

  for (const item of items) {
    board.appendChild(await buildBubble(item));
  }
}

function drawBreadcrumbs() {
  crumbTrail.innerHTML = "";
  stack.slice(1).forEach((entry, i) => {
    const span = document.createElement("span");
    span.className = "crumb" + (i === stack.length - 2 ? " active" : "");
    span.textContent = " / " + entry.name;
    span.onclick = () => {
      stack = stack.slice(0, i + 2);
      renderBoard();
      highlightActiveTab();
    };
    crumbTrail.appendChild(span);
  });
}

// -----------------------------------------------------------------------
// Build one bubble (card) for a single file/folder entry.
//
//   .bubble               outer wrapper (card + name label)
//     .card                 the outlined box — sized in JS, resizable
//       .card-content         clips image/text/icon overflow
//       .resize               drag handle (sibling of card-content, so it
//                              is NEVER clipped by card-content's overflow)
//     .name                 label underneath, per the original spec
// -----------------------------------------------------------------------
async function buildBubble(item) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${item.type}`;

  const card = document.createElement("div");
  card.className = "card";
  card.style.width = card.style.height = "130px"; // default size

  const content = document.createElement("div");
  content.className = "card-content";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = await window.api.readImage(item.path); // main.js hands back a data URL
    content.appendChild(img);
  } else if (item.type === "text") {
    content.textContent = (item.preview || "").slice(0, 60) + "...";
  } else if (item.type === "folder") {
    content.textContent = "📁";
  } else {
    content.textContent = "📦"; // generic/default icon for anything else
  }

  // Resize handle — a SIBLING of .card-content, both children of .card.
  // Because .card itself has no `overflow: hidden`, this handle is always
  // fully visible/clickable at the corner, unlike the old circle design.
  const handle = document.createElement("div");
  handle.className = "resize";
  handle.onmousedown = (e) => startResize(e, card);

  card.appendChild(content);
  card.appendChild(handle);

  const label = document.createElement("div");
  label.className = "name";
  label.textContent = item.name;

  bubble.appendChild(card);
  bubble.appendChild(label);

  bubble.onclick = (e) => {
    if (e.target === handle) return; // dragging shouldn't also trigger a click
    if (item.type === "folder") {
      stack.push({ name: item.name, path: item.path });
      renderBoard();
      highlightActiveTab();
    } else {
      openFullPreview(item);
    }
  };

  return bubble;
}

// -----------------------------------------------------------------------
// Dragging a card's corner handle resizes that card only (both width and
// height together, so it stays square).
// -----------------------------------------------------------------------
function startResize(e, card) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startSize = card.offsetWidth;

  function onMove(ev) {
    const newSize = Math.max(70, Math.min(280, startSize + (ev.clientX - startX)));
    card.style.width = card.style.height = newSize + "px";
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// -----------------------------------------------------------------------
// "Full display" preview — a simple modal-style overlay.
// -----------------------------------------------------------------------
async function openFullPreview(item) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
  });
  overlay.onclick = () => overlay.remove();

  const box = document.createElement("div");
  Object.assign(box.style, {
    background: "#0b2436", padding: "24px", borderRadius: "12px",
    maxWidth: "80%", maxHeight: "80%", overflow: "auto", color: "#eaf6ff",
  });
  box.onclick = (e) => e.stopPropagation();

  if (item.type === "image") {
    const img = document.createElement("img");
    img.style.maxWidth = "100%";
    img.src = await window.api.readImage(item.path);
    box.appendChild(img);
  } else if (item.type === "text") {
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.textContent = await window.api.readText(item.path);
    box.appendChild(pre);
  } else {
    // Default/other files: hand off to the OS's own app for that file type.
    window.api.openPath(item.path);
    return;
  }

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
