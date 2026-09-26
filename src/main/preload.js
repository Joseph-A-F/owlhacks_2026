// =============================================================================
// preload.js — THE SECURE BRIDGE
// =============================================================================
// This file runs in a special context: it can see Node.js AND the eventual
// webpage, but only briefly, before the page loads. Its only job is to hand
// the renderer a small, safe, whitelisted API — instead of giving the whole
// webpage raw access to Node/fs (which would be a big security hole, especially
// if you ever load any remote/untrusted content).
//
// Whatever we attach here shows up in renderer.js as `window.api.<name>`.
// =============================================================================

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Ask main to list a folder's contents
  listDir: (folderPath) => ipcRenderer.invoke("fs:list", folderPath),

  // Ask main to read a text file fully (for the "full preview" view)
  readText: (filePath) => ipcRenderer.invoke("fs:readText", filePath),

  // Ask main to turn an image file into a data URL we can put in <img src>
  readImage: (filePath) => ipcRenderer.invoke("fs:readImage", filePath),

  // Ask main to build the starter Images/Documents/Miscellaneous template
  createTemplate: (rootPath) => ipcRenderer.invoke("fs:createTemplate", rootPath),

  // --- Upload system ---
  // Open the native "choose files" dialog; returns the paths picked.
  chooseFiles: () => ipcRenderer.invoke("dialog:chooseFiles"),
  // Copy those files into a destination folder inside the app.
  copyFilesInto: (destFolder, filePaths) =>
    ipcRenderer.invoke("fs:copyFilesInto", { destFolder, filePaths }),

  // Open the OS "choose a folder" dialog
  chooseFolder: () => ipcRenderer.invoke("dialog:chooseFolder"),

  // Open a file in its default system app (e.g. double-click a .pdf)
  openPath: (filePath) => ipcRenderer.invoke("shell:openPath", filePath),
});
