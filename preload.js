// =============================================================================
// preload.js — the secure bridge between the UI and Electron's filesystem APIs.
// =============================================================================
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("api", {
  listDir: (rootPath, folderPath) => ipcRenderer.invoke("fs:list", { rootPath, folderPath }),
  readText: (filePath) => ipcRenderer.invoke("fs:readText", filePath),
  readImage: (filePath) => ipcRenderer.invoke("fs:readImage", filePath),
  createTemplate: (rootPath) => ipcRenderer.invoke("fs:createTemplate", rootPath),
  chooseFiles: () => ipcRenderer.invoke("dialog:chooseFiles"),
  copyEntriesInto: (destFolder, sourcePaths) => ipcRenderer.invoke("fs:copyEntriesInto", { destFolder, sourcePaths }),
  chooseFolder: () => ipcRenderer.invoke("dialog:chooseFolder"),
  saveLayout: (rootPath, folderPath, items) => ipcRenderer.invoke("fs:saveLayout", { rootPath, folderPath, items }),
  getState: (rootPath) => ipcRenderer.invoke("fs:getState", rootPath),
  saveShortcuts: (rootPath, shortcuts) => ipcRenderer.invoke("fs:saveShortcuts", { rootPath, shortcuts }),
  openPath: (filePath) => ipcRenderer.invoke("shell:openPath", filePath),
  // Electron gives us the real OS path for an item dragged from Explorer/Finder.
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
