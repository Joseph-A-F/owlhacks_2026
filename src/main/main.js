// =============================================================================
// main.js — the ELECTRON "MAIN" PROCESS
// =============================================================================
// Electron apps have two kinds of process:
//   1. MAIN process  (this file) — runs in Node.js, has full filesystem access,
//      creates windows, and is the only place allowed to touch the disk safely.
//   2. RENDERER process (renderer/renderer.js) — runs in a Chromium window,
//      basically a webpage. For SECURITY it does NOT get direct fs access.
//
// The two talk to each other over "IPC" (Inter-Process Communication).
// Renderer asks -> "hey main, list this folder for me" -> Main replies with data.
// This file defines what main is willing to do when asked.
// =============================================================================

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// File extensions we treat as "images" -> blue bubble
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
// File extensions we treat as "text" -> green bubble w/ text preview
const TEXT_EXT = [".txt", ".md", ".js", ".json", ".css", ".html", ".ts", ".log"];

// -----------------------------------------------------------------------
// Decide what "kind" a file is, so the renderer knows what color bubble
// and what preview to draw. Folders are orange, images blue, text green,
// everything else falls back to a generic icon bubble.
// -----------------------------------------------------------------------
function classify(fullPath, isDirectory) {
  if (isDirectory) return "folder";
  const ext = path.extname(fullPath).toLowerCase();
  if (IMAGE_EXT.includes(ext)) return "image";
  if (TEXT_EXT.includes(ext)) return "text";
  return "other";
}

// -----------------------------------------------------------------------
// Create the main application window.
// -----------------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#012a3a",
    webPreferences: {
      // preload.js is the ONLY bridge between main and renderer.
      preload: path.join(__dirname, "preload.js"),
      // Keep the renderer sandboxed — it can't require() Node modules directly.
      // This is the safe, modern Electron pattern.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

// -----------------------------------------------------------------------
// IPC HANDLERS — these are the only filesystem operations the renderer
// is allowed to trigger. Each one is called from renderer.js via
// window.api.<name>(...) which is defined in preload.js.
// -----------------------------------------------------------------------

// List the contents of a folder as an array of { name, path, type, preview? }
ipcMain.handle("fs:list", async (_event, folderPath) => {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  return entries.map((entry) => {
    const fullPath = path.join(folderPath, entry.name);
    const type = classify(fullPath, entry.isDirectory());

    const item = { name: entry.name, path: fullPath, type };

    // For text files, grab the first ~120 characters to show inside the bubble.
    if (type === "text") {
      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        item.preview = raw.slice(0, 120);
      } catch {
        item.preview = "";
      }
    }
    return item;
  });
});

// Read a text file's FULL contents (used when opening the full preview view).
ipcMain.handle("fs:readText", async (_event, filePath) => {
  return fs.readFileSync(filePath, "utf8");
});

// Convert an image file on disk into a data URL the renderer's <img> can show.
// (Renderer can't use file:// paths directly under our security settings, so
// we base64-encode the bytes here in main and hand back a data: URL.)
ipcMain.handle("fs:readImage", async (_event, filePath) => {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || "png";
  return `data:image/${ext};base64,${buffer.toString("base64")}`;
});

// Real sample images we ship WITH the app (see template-assets/), so a
// freshly created template has something visual to click and resize right
// away instead of just placeholder text.
const TEMPLATE_ASSETS_DIR = path.join(__dirname, "template-assets");

// Build the starter template: Images / Documents / Miscellaneous folders.
// Images gets two real bundled sample photos; Documents/Miscellaneous get a
// small sample text file. Safe to call more than once — it skips anything
// that already exists, so re-running it never overwrites your real files.
ipcMain.handle("fs:createTemplate", async (_event, rootPath) => {
  // Text-file samples, keyed by which folder they belong in.
  const textLayout = {
    Documents: [{ file: "welcome.txt", content: "This is a sample text file.\nOpen it, resize its bubble, and explore!" }],
    Miscellaneous: [{ file: "readme.txt", content: "Anything that isn't clearly an image or text file lands here." }],
  };

  for (const folderName of Object.keys(textLayout)) {
    const folderPath = path.join(rootPath, folderName);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
    for (const sample of textLayout[folderName]) {
      const samplePath = path.join(folderPath, sample.file);
      if (!fs.existsSync(samplePath)) fs.writeFileSync(samplePath, sample.content);
    }
  }

  // Images folder gets real bundled sample photos, copied byte-for-byte
  // from template-assets/ next to this file.
  const imagesPath = path.join(rootPath, "Images");
  if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath);
  if (fs.existsSync(TEMPLATE_ASSETS_DIR)) {
    for (const fileName of fs.readdirSync(TEMPLATE_ASSETS_DIR)) {
      const src = path.join(TEMPLATE_ASSETS_DIR, fileName);
      const dest = path.join(imagesPath, fileName);
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    }
  }

  return rootPath;
});

// Let the user pick a real folder on their computer to use as the "Home" root
// (this is how the app points at a real place instead of only the sample data).
ipcMain.handle("dialog:chooseFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Open a file with whatever the OS's default app is (double-click behavior).
ipcMain.handle("shell:openPath", async (_event, filePath) => {
  return shell.openPath(filePath);
});

// -----------------------------------------------------------------------
// UPLOAD SYSTEM
// Two steps: (1) let the user pick one or more real files from anywhere on
// their computer via the native OS file dialog, then (2) copy those files
// into whichever folder they're currently viewing in the app.
// -----------------------------------------------------------------------

// Step 1: open the native "choose files" dialog. Returns an array of full
// paths to the files the user picked (or [] if they cancelled).
ipcMain.handle("dialog:chooseFiles", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
  });
  if (result.canceled) return [];
  return result.filePaths;
});

// Step 2: copy each chosen file into destFolder. If a file with the same
// name already exists there, we don't overwrite it — we add "(1)", "(2)",
// etc. to the copy's name instead, the same way a real OS file manager does.
ipcMain.handle("fs:copyFilesInto", async (_event, { destFolder, filePaths }) => {
  const copiedNames = [];

  for (const srcPath of filePaths) {
    const original = path.basename(srcPath);
    const ext = path.extname(original);
    const base = path.basename(original, ext);

    let destName = original;
    let counter = 1;
    // Keep bumping the counter until we find a name that isn't taken.
    while (fs.existsSync(path.join(destFolder, destName))) {
      destName = `${base} (${counter})${ext}`;
      counter++;
    }

    fs.copyFileSync(srcPath, path.join(destFolder, destName));
    copiedNames.push(destName);
  }

  return copiedNames;
});

// -----------------------------------------------------------------------
// Standard Electron app lifecycle boilerplate.
// -----------------------------------------------------------------------
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
