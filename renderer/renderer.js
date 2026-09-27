// =============================================================================
// renderer.js — the UI side of the app
// =============================================================================
// Think of this file as the "brain" of the webpage.
// It draws bubbles, handles mouse/drag events, and asks preload.js to perform
// filesystem operations. The important idea: UI state is saved after changes,
// so resizing/rearranging survives closing and reopening the app.

let root = null;
let stack = [];
let currentItems = [];
let shortcuts = [];
let dragState = null;
let saveTimer = null;
let contextTarget = null;
let panX = 0;
let panY = 0;
let zoom = 1;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

const board = document.getElementById("board");
const breadcrumbs = document.getElementById("breadcrumbs");
const shortcutsEl = document.getElementById("shortcuts");
const addShortcut = document.getElementById("addShortcut");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const currentFolder = () => stack[stack.length - 1];

function applyTransform() {
  const content = document.getElementById("board-content");
  if (content) {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
}

board.addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey || (e.deltaZ !== undefined && Math.abs(e.deltaY) < 1)) {
    e.preventDefault();
    const oldZoom = zoom;

    // Exponential zoom for smooth scaling whether using mouse wheel (large delta) or trackpad (small delta)
    const zoomFactor = Math.exp(-e.deltaY * 0.005);
    zoom = clamp(zoom * zoomFactor, 0.1, 5);

    const rect = board.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (zoom / oldZoom);
    panY = mouseY - (mouseY - panY) * (zoom / oldZoom);
  } else {
    // If we want standard wheel to zoom instead of pan, we could do it here, but typically wheel pans.
    // However, if the user explicitly wants zoom on standard wheel, we can change this.
    // For now, keep standard wheel as pan, and ctrl+wheel as zoom.
    panX -= e.deltaX;
    panY -= e.deltaY;
  }
  applyTransform();
}, { passive: false });

board.addEventListener("pointerdown", (e) => {
  if (e.target === board || e.target.id === "board-content" || e.target.closest(".empty-state") || (e.target.closest(".welcome") && e.target.tagName !== "BUTTON")) {
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    board.setPointerCapture(e.pointerId);
  }
});
board.addEventListener("pointermove", (e) => {
  if (isPanning) {
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
    applyTransform();
  }
});
const endPan = (e) => {
  if (isPanning) {
    isPanning = false;
    board.releasePointerCapture(e.pointerId);
  }
};
board.addEventListener("pointerup", endPan);
board.addEventListener("pointercancel", endPan);

// -----------------------------------------------------------------------------
// Starting the app
// -----------------------------------------------------------------------------
document.getElementById("chooseHome").onclick = chooseHome;
document.getElementById("quickTemplate").onclick = createTemplateFromDialog;
document.getElementById("homeSide").onclick = () => {
  if (root) navigateTo(0);
};
document.getElementById("uploadButton").onclick = uploadFiles;
document.getElementById("templateButton").onclick = createTemplateFromDialog;
document.getElementById("addShortcut").onclick = async (event) => {
  event.stopPropagation();
  if (!root) return;
  await addShortcutToCurrentFolder();
};

// We intentionally do not use prompt(), because Electron does not support
// the browser prompt dialog reliably. Folder creation/renaming was removed
// from this hackathon version so the main workflow stays simple and stable.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelector(".overlay")?.remove();
  }
});

async function chooseHome() {
  const chosen = await window.api.chooseFolder();
  if (!chosen) return;
  await openRoot(chosen);
}

async function createTemplateFromDialog() {
  const chosen = await window.api.chooseFolder();
  if (!chosen) return;
  await window.api.createTemplate(chosen);
  await openRoot(chosen);
}

async function openRoot(folderPath) {
  root = folderPath;
  stack = [{ name: "Home", path: root }];
  const state = await window.api.getState(root);
  shortcuts = Array.isArray(state.shortcuts) ? state.shortcuts : [];
  panX = 0; panY = 0; zoom = 1;
  await renderAll();
}

// -----------------------------------------------------------------------------
// Navigation + sidebar shortcuts
// -----------------------------------------------------------------------------
function navigateTo(index) {
  stack = stack.slice(0, index + 1);
  panX = 0; panY = 0; zoom = 1;
  renderAll();
}

function navigateInto(item) {
  stack.push({ name: item.name, path: item.path });
  panX = 0; panY = 0; zoom = 1;
  renderAll();
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = "";
  stack.forEach((entry, index) => {
    const crumb = document.createElement("button");
    crumb.className = "crumb" + (index === stack.length - 1 ? " active" : "");
    crumb.textContent = index === 0 ? "⌂ Home" : entry.name;
    crumb.onclick = () => navigateTo(index);
    breadcrumbs.appendChild(crumb);
    if (index < stack.length - 1) {
      const slash = document.createElement("span");
      slash.textContent = " / ";
      slash.className = "slash";
      breadcrumbs.appendChild(slash);
    }
  });
}

async function renderShortcuts() {
  shortcutsEl.innerHTML = "";
  for (const shortcut of shortcuts) {
    const row = document.createElement("div");
    row.className = "shortcut-row";

    const button = document.createElement("button");
    button.className = "shortcut";
    button.textContent = `★ ${shortcut.name}`;
    button.title = `Go to ${shortcut.path}`;
    button.onclick = async () => {
      try {
        // Shortcuts are stored as paths relative to Home. Rebuild the absolute
        // path one folder at a time so this works on Windows, macOS, and Linux.
        stack = [{ name: "Home", path: root }];
        if (shortcut.path !== ".") {
          const pieces = shortcut.path.split(/[\\/]/);
          let running = root;
          for (const piece of pieces) {
            running = `${running}${running.includes("\\") ? "\\" : "/"}${piece}`;
            stack.push({ name: piece, path: running });
          }
        }
        panX = 0; panY = 0; zoom = 1;
        await window.api.listDir(root, stack[stack.length - 1].path);
        await renderAll();
      } catch {
        alert("That shortcut no longer exists.");
      }
    };

    // A small × removes only the shortcut; it does not delete the real folder.
    const remove = document.createElement("button");
    remove.className = "remove-shortcut";
    remove.textContent = "×";
    remove.title = "Delete shortcut";
    remove.setAttribute("aria-label", `Delete shortcut for ${shortcut.name}`);
    remove.onclick = async (event) => {
      event.stopPropagation();
      shortcuts = shortcuts.filter((item) => item.path !== shortcut.path);
      await window.api.saveShortcuts(root, shortcuts);
      await renderShortcuts();
    };

    row.append(button, remove);
    shortcutsEl.appendChild(row);
  }
}

async function addShortcutToCurrentFolder() {
  const targetPath = currentFolder().path;
  const relative = targetPath === root ? "." : targetPath.slice(root.length + 1);
  const name = relative === "." ? "Home" : relative.split(/[\\/]/).pop();
  if (!shortcuts.some((item) => item.path === relative)) {
    shortcuts.push({ name, path: relative });
    await window.api.saveShortcuts(root, shortcuts);
    await renderShortcuts();
  }
}

// -----------------------------------------------------------------------------
// Board rendering
// -----------------------------------------------------------------------------
async function renderAll() {
  if (!root) return;
  renderBreadcrumbs();
  await renderShortcuts();
  await renderBoard();
}

async function renderBoard() {
  board.innerHTML = "";
  const boardContent = document.createElement("div");
  boardContent.id = "board-content";
  board.appendChild(boardContent);
  applyTransform();

  const folder = currentFolder();
  currentItems = await window.api.listDir(root, folder.path);

  if (currentItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div>🫧</div><strong>Nothing here yet</strong><span>Drop files here or right-click to create a folder.</span>`;
    boardContent.appendChild(empty);
    return;
  }

  // The board itself is the coordinate system. Each bubble gets an absolute
  // x/y position saved in .bubble-state.json.
  for (const item of currentItems) {
    boardContent.appendChild(await buildBubble(item));
  }

  // Give new items sensible positions without changing existing positions.
  layoutNewItems();
}

function layoutNewItems() {
  const gap = 24;
  const defaultSize = 150;
  const cols = Math.max(1, Math.floor((board.clientWidth - 40) / (defaultSize + gap)));
  let newIndex = 0;

  for (const item of currentItems) {
    if (item.x !== null && item.y !== null) continue;
    item.x = 25 + (newIndex % cols) * (defaultSize + gap);
    item.y = 25 + Math.floor(newIndex / cols) * (defaultSize + gap);
    newIndex++;
  }

  for (const bubble of board.querySelectorAll(".bubble")) {
    const item = bubble.__item;
    if (item) positionBubble(bubble, item);
  }

  scheduleSave();
}

async function buildBubble(item) {
  const bubble = document.createElement("article");
  bubble.className = `bubble ${item.type}`;
  bubble.__item = item;
  bubble.title = "Drag to move • drag the corner to resize • double-click to open";

  const card = document.createElement("div");
  card.className = "card";

  const content = document.createElement("div");
  content.className = "card-content";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = await window.api.readImage(item.path);
    img.alt = item.name;
    content.appendChild(img);
  } else if (item.type === "text") {
    const preview = document.createElement("div");
    preview.className = "text-preview";
    preview.textContent = item.preview || "(empty text file)";
    content.appendChild(preview);
  } else if (item.type === "folder") {
    content.innerHTML = "<div class='folder-icon'>📁</div>";
  } else {
    content.innerHTML = "<div class='other-icon'>📦</div>";
  }

  const handle = document.createElement("div");
  handle.className = "resize";
  handle.title = "Resize";
  handle.onpointerdown = (event) => startResize(event, item, card);

  card.append(content, handle);

  const label = document.createElement("div");
  label.className = "name";
  label.textContent = item.name;

  bubble.append(card, label);
  positionBubble(bubble, item);

  // Dragging the bubble moves it freely around the board.
  card.onpointerdown = (event) => {
    if (event.target === handle) return;
    startMove(event, item, bubble);
  };

  // Single-click intentionally does nothing. This keeps the bubble from
  // opening while the user is trying to move it. Double-click is the only
  // action that opens/enters an item.
  bubble.ondblclick = async (event) => {
    if (event.target === handle) return;
    if (item.type === "folder") navigateInto(item);
    else await window.api.openPath(item.path);
  };

  bubble.oncontextmenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    showContextMenu(event.clientX, event.clientY, item, bubble);
  };

  return bubble;
}

function positionBubble(bubble, item) {
  bubble.style.left = `${item.x}px`;
  bubble.style.top = `${item.y}px`;
  const card = bubble.querySelector(".card");
  card.style.width = `${item.width}px`;
  card.style.height = `${item.height}px`;
}

function startMove(event, item, bubble) {
  if (event.button !== 0) return;
  event.preventDefault();
  bubble.setPointerCapture?.(event.pointerId);
  dragState = {
    type: "move",
    item,
    bubble,
    startX: event.clientX,
    startY: event.clientY,
    originalX: item.x,
    originalY: item.y,
  };
  bubble.classList.add("dragging");
  bubble.onpointermove = moveBubble;
  bubble.onpointerup = endBubbleDrag;
  bubble.onpointercancel = endBubbleDrag;
}

function moveBubble(event) {
  if (!dragState) return;
  const { item, bubble, startX, startY, originalX, originalY } = dragState;
  item.x = originalX + (event.clientX - startX) / zoom;
  item.y = originalY + (event.clientY - startY) / zoom;
  positionBubble(bubble, item);
}

function startResize(event, item, card) {
  event.preventDefault();
  event.stopPropagation();
  card.setPointerCapture?.(event.pointerId);
  dragState = {
    type: "resize",
    item,
    card,
    startX: event.clientX,
    startY: event.clientY,
    originalWidth: item.width,
    originalHeight: item.height,
  };
  card.classList.add("resizing");
  card.onpointermove = resizeBubble;
  card.onpointerup = endResize;
  card.onpointercancel = endResize;
}

function resizeBubble(event) {
  if (!dragState) return;
  const { item, card, startX, startY, originalWidth, originalHeight } = dragState;
  item.width = clamp(originalWidth + (event.clientX - startX) / zoom, 90, 420);
  item.height = clamp(originalHeight + (event.clientY - startY) / zoom, 90, 420);
  card.style.width = `${item.width}px`;
  card.style.height = `${item.height}px`;
}

function endBubbleDrag() {
  if (!dragState) return;
  dragState.bubble.classList.remove("dragging");
  dragState.bubble.onpointermove = null;
  dragState.bubble.onpointerup = null;
  dragState.bubble.onpointercancel = null;
  dragState = null;
  scheduleSave();
}

function endResize() {
  if (!dragState) return;
  dragState.card.classList.remove("resizing");
  dragState.card.onpointermove = null;
  dragState.card.onpointerup = null;
  dragState.card.onpointercancel = null;
  dragState = null;
  scheduleSave();
}

// Save after a short pause so moving an item doesn't write to disk on every
// single mouse pixel. The final position is still persisted almost instantly.
function scheduleSave() {
  if (!root || !currentFolder()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.api.saveLayout(root, currentFolder().path, currentItems).catch(showError);
  }, 180);
}

// -----------------------------------------------------------------------------
// Uploading files
// -----------------------------------------------------------------------------
async function uploadFiles() {
  if (!root) {
    await chooseHome();
    return;
  }
  const filePaths = await window.api.chooseFiles();
  if (!filePaths.length) return;
  try {
    await window.api.copyEntriesInto(currentFolder().path, filePaths);
    await renderBoard();
  } catch (error) {
    showError(error);
  }
}

// -----------------------------------------------------------------------------
// Native drag-and-drop
// -----------------------------------------------------------------------------
board.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  board.classList.add("drag-over");
});

board.addEventListener("dragleave", (event) => {
  if (!board.contains(event.relatedTarget)) board.classList.remove("drag-over");
});

board.addEventListener("drop", async (event) => {
  event.preventDefault();
  board.classList.remove("drag-over");
  if (!root) return;

  const paths = [];
  for (const file of [...event.dataTransfer.files]) {
    try {
      const filePath = window.api.getPathForFile(file);
      if (filePath) paths.push(filePath);
    } catch {
      // Ignore a dropped browser object that has no local filesystem path.
    }
  }

  if (!paths.length) return;
  try {
    await window.api.copyEntriesInto(currentFolder().path, paths);
    createDropRipple(event.clientX, event.clientY);
    await renderBoard();
  } catch (error) {
    showError(error);
  }
});

// -----------------------------------------------------------------------------
// Full preview modal
// -----------------------------------------------------------------------------
async function openPreview(item) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.onclick = (event) => {
    if (event.target === overlay) overlay.remove();
  };

  const box = document.createElement("div");
  box.className = "preview-box";
  const close = document.createElement("button");
  close.className = "close-preview";
  close.textContent = "×";
  close.onclick = () => overlay.remove();
  box.appendChild(close);

  const title = document.createElement("h2");
  title.textContent = item.name;
  box.appendChild(title);

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = await window.api.readImage(item.path);
    box.appendChild(img);
  } else if (item.type === "text") {
    const pre = document.createElement("pre");
    pre.textContent = await window.api.readText(item.path);
    box.appendChild(pre);
  } else {
    const message = document.createElement("p");
    message.textContent = "This file type is best opened with its normal desktop application.";
    box.appendChild(message);
    const open = document.createElement("button");
    open.className = "primary-button";
    open.textContent = "Open with default app";
    open.onclick = () => window.api.openPath(item.path);
    box.appendChild(open);
  }

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function createDropRipple(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  const ripple = document.createElement("div");
  ripple.className = "drop-ripple";
  ripple.style.left = `${clientX - rect.left}px`;
  ripple.style.top = `${clientY - rect.top}px`;
  board.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function showError(error) {
  console.error(error);
  alert(error?.message || String(error));
}

function showContextMenu(x, y, item, bubble) {
  document.getElementById("context-menu")?.remove();

  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "context-menu-item";
  deleteBtn.onclick = async () => {
    menu.remove();
    try {
      await window.api.deleteItem(item.path);
      currentItems = currentItems.filter((i) => i.path !== item.path);
      bubble.remove();
      scheduleSave();
    } catch (err) {
      showError(err);
    }
  };

  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (menu && menu.contains(e.target)) return;
      menu.remove();
      document.removeEventListener("click", closeMenu);
    });
  }, 50);
}

// Autosave before the window is left. The debounced save normally handles this,
// but this also gives the project a clear final-save point for a demo.
window.addEventListener("beforeunload", () => {
  if (root && currentFolder() && currentItems.length) {
    window.api.saveLayout(root, currentFolder().path, currentItems);
  }
});
