// =============================================================================
// main.js — Electron's MAIN process
// =============================================================================
// This side has access to the real filesystem. The renderer (the UI) never
// touches fs directly; it asks this file to do safe, specific operations via
// IPC. Keeping that boundary makes the project easier to understand and safer.

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
const TEXT_EXT = [".txt", ".md", ".js", ".json", ".css", ".html", ".ts", ".log", ".csv"];
const STATE_FILE = ".bubble-state.json";
const TEMPLATE_ASSETS_DIR = [
  path.join(__dirname, "../../template-assets"),
  path.join(__dirname, "../template-assets"),
  path.join(__dirname, "template-assets"),
  path.join(app.getAppPath(), "template-assets")
].find((p) => fs.existsSync(p)) || path.join(__dirname, "template-assets");

function classify(fullPath, isDirectory) {
  if (isDirectory) return "folder";
  const ext = path.extname(fullPath).toLowerCase();
  if (IMAGE_EXT.includes(ext)) return "image";
  if (TEXT_EXT.includes(ext)) return "text";
  return "other";
}

function safeReadState(rootPath) {
  const statePath = path.join(rootPath, STATE_FILE);
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return { version: 1, folders: {}, shortcuts: [] };
  }
}

function safeWriteState(rootPath, state) {
  const statePath = path.join(rootPath, STATE_FILE);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function relativeKey(rootPath, targetPath) {
  const rel = path.relative(rootPath, targetPath);
  return rel || ".";
}

function listFolder(rootPath, folderPath) {
  const state = safeReadState(rootPath);
  const folderKey = relativeKey(rootPath, folderPath);
  const folderState = state.folders[folderKey] || { items: {}, order: [] };

  const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.name !== STATE_FILE)
    .map((entry) => {
      const fullPath = path.join(folderPath, entry.name);
      const type = classify(fullPath, entry.isDirectory());
      const saved = folderState.items[entry.name] || {};
      const item = {
        name: entry.name,
        path: fullPath,
        type,
        x: Number.isFinite(saved.x) ? saved.x : null,
        y: Number.isFinite(saved.y) ? saved.y : null,
        width: Number.isFinite(saved.width) ? saved.width : 150,
        height: Number.isFinite(saved.height) ? saved.height : 150,
      };

      if (type === "text") {
        try {
          item.preview = fs.readFileSync(fullPath, "utf8").slice(0, 180);
        } catch {
          item.preview = "";
        }
      }
      return item;
    });

  // Preserve the user's saved order. New items are appended naturally.
  const byName = new Map(entries.map((item) => [item.name, item]));
  const ordered = [];
  for (const name of folderState.order || []) {
    if (byName.has(name)) {
      ordered.push(byName.get(name));
      byName.delete(name);
    }
  }
  for (const item of entries) {
    if (byName.has(item.name)) {
      ordered.push(item);
      byName.delete(item.name);
    }
  }
  return ordered;
}

function ensureFolderState(state, folderKey) {
  if (!state.folders[folderKey]) {
    state.folders[folderKey] = { items: {}, order: [] };
  }
  return state.folders[folderKey];
}

function uniqueDestination(destFolder, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  let destName = originalName;
  let counter = 1;
  while (fs.existsSync(path.join(destFolder, destName))) {
    destName = `${base} (${counter})${ext}`;
    counter++;
  }
  return path.join(destFolder, destName);
}

function copyEntryRecursive(sourcePath, destinationFolder) {
  const sourceStat = fs.statSync(sourcePath);
  const originalName = path.basename(sourcePath);
  const destinationPath = uniqueDestination(destinationFolder, originalName);

  if (sourceStat.isDirectory()) {
    fs.mkdirSync(destinationPath, { recursive: true });
    for (const child of fs.readdirSync(sourcePath)) {
      copyEntryRecursive(path.join(sourcePath, child), destinationPath);
    }
  } else {
    fs.copyFileSync(sourcePath, destinationPath);
  }
  return path.basename(destinationPath);
}

function createWindow() {
  const preloadPath = [
    path.join(__dirname, "../preload/preload.js"),
    path.join(__dirname, "preload.js")
  ].find((p) => fs.existsSync(p)) || path.join(__dirname, "preload.js");

  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    titleBarStyle: 'hiddenInset',
    backgroundColor: "#012a3a",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const indexPath = [
      path.join(__dirname, "../renderer/index.html"),
      path.join(__dirname, "out/renderer/index.html"),
      path.join(app.getAppPath(), "out/renderer/index.html"),
      path.join(__dirname, "renderer/index.html")
    ].find((p) => fs.existsSync(p)) || path.join(__dirname, "renderer/index.html");
    win.loadFile(indexPath);
  }
}

// -----------------------------------------------------------------------------
// Filesystem IPC
// -----------------------------------------------------------------------------
ipcMain.handle("fs:deleteItem", async (_event, filePath) => {
  return shell.trashItem(filePath);
});


ipcMain.handle("fs:list", async (_event, { rootPath, folderPath }) => {
  return listFolder(rootPath, folderPath);
});

ipcMain.handle("fs:readText", async (_event, filePath) => {
  return fs.readFileSync(filePath, "utf8");
});

ipcMain.handle("fs:readImage", async (_event, filePath) => {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "svg" ? "svg+xml" : ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${buffer.toString("base64")}`;
});

ipcMain.handle("fs:createTemplate", async (_event, rootPath) => {
  const textLayout = {
    Documents: [
      { file: "welcome.txt", content: "Welcome to Bubble File Manager!\n\nTry resizing, dragging, renaming, and opening this file.\nYour layout is saved automatically." },
    ],
    Miscellaneous: [
      { file: "readme.txt", content: "Files that do not fit the image/text categories can live here.\n\nTry creating your own folders and dropping files into them." },
    ],
  };

  fs.mkdirSync(rootPath, { recursive: true });

  for (const folderName of ["Images", "Documents", "Miscellaneous"]) {
    fs.mkdirSync(path.join(rootPath, folderName), { recursive: true });
  }

  for (const [folderName, samples] of Object.entries(textLayout)) {
    for (const sample of samples) {
      const samplePath = path.join(rootPath, folderName, sample.file);
      if (!fs.existsSync(samplePath)) fs.writeFileSync(samplePath, sample.content);
    }
  }

  const imagesPath = path.join(rootPath, "Images");
  if (fs.existsSync(TEMPLATE_ASSETS_DIR)) {
    for (const fileName of fs.readdirSync(TEMPLATE_ASSETS_DIR)) {
      if (fileName === "README.txt") continue;
      const src = path.join(TEMPLATE_ASSETS_DIR, fileName);
      const dest = path.join(imagesPath, fileName);
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    }
  }

  const state = safeReadState(rootPath);
  safeWriteState(rootPath, state);
  return rootPath;
});

ipcMain.handle("dialog:chooseFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("dialog:chooseFiles", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle("fs:copyEntriesInto", async (_event, { destFolder, sourcePaths }) => {
  return sourcePaths.map((sourcePath) => copyEntryRecursive(sourcePath, destFolder));
});

ipcMain.handle("fs:saveLayout", async (_event, { rootPath, folderPath, items }) => {
  const state = safeReadState(rootPath);
  const folderKey = relativeKey(rootPath, folderPath);
  const folderState = ensureFolderState(state, folderKey);

  folderState.order = items.map((item) => item.name);
  folderState.items = {};
  for (const item of items) {
    folderState.items[item.name] = {
      x: Math.round(item.x),
      y: Math.round(item.y),
      width: Math.round(item.width),
      height: Math.round(item.height),
    };
  }
  safeWriteState(rootPath, state);
  return true;
});

ipcMain.handle("fs:getState", async (_event, rootPath) => safeReadState(rootPath));

ipcMain.handle("fs:saveShortcuts", async (_event, { rootPath, shortcuts }) => {
  const state = safeReadState(rootPath);
  state.shortcuts = shortcuts;
  safeWriteState(rootPath, state);
  return true;
});

ipcMain.handle("shell:openPath", async (_event, filePath) => shell.openPath(filePath));

// -----------------------------------------------------------------------------
// App Lifecycle
// -----------------------------------------------------------------------------
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
