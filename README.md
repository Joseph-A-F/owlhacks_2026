# Bubble File Manager 🫧

A beginner-friendly Electron file manager for our HCI hackathon. It uses a Pinterest-style freeform board, colored bubbles, and a small persistent state file.

## What this version does

- **Orange bubbles** = folders
- **Blue bubbles** = images
- **Green bubbles** = text files with a preview
- **Gray bubbles** = other file types
- Create folders with **+ → New folder** or by right-clicking the board
- Rename files/folders with the **✎** button or right-click → Rename
- Drag files/folders from Windows Explorer/Finder directly into the board
- Drag bubbles anywhere on the board
- Resize bubbles with the white corner handle
- Bubble position, size, and order are saved automatically
- Double-click a file to open it with the computer's normal/default application
- Single-click images/text for an in-app preview
- Add the current folder to the left sidebar as a shortcut
- Navigate through folders at any depth
- Create the original Images/Documents/Miscellaneous sample template

## The important persistence idea

The app creates a hidden-ish project file called `.bubble-state.json` inside the folder you chose as the Home folder.

That file stores things like:

```json
{
  "folders": {
    ".": {
      "order": ["Images", "Documents"],
      "items": {
        "Images": { "x": 30, "y": 30, "width": 170, "height": 170 }
      }
    }
  },
  "shortcuts": [
    { "name": "Images", "path": "Images" }
  ]
}
```

The actual files stay normal files on the computer. `.bubble-state.json` only remembers how Bubble File Manager should display them.

## Project structure

```text
bubble-file-manager/
├── package.json
├── main.js                 # Filesystem + Electron main process
├── preload.js              # Small safe bridge to main.js
├── template-assets/        # Sample images copied into new templates
└── renderer/
    ├── index.html          # UI structure
    ├── style.css           # Ocean/bubble visual design
    └── renderer.js         # UI behavior and mouse/drag logic
```

### How the three JavaScript files work together

```text
renderer.js
   ↓ window.api.listDir(...)
preload.js
   ↓ IPC
main.js
   ↓ Node fs
Your actual files/folders
```

**`renderer.js`** is where you should look first when learning the UI. It contains the bubble creation, moving, resizing, navigation, and drag-and-drop code.

**`preload.js`** is intentionally small. It exposes only the operations the webpage needs.

**`main.js`** performs real filesystem operations. It is also where Electron creates the application window.

## Running during the hackathon

Install Node.js first, then from this folder:

```bash
npm install
npm start
```

Bun can also run the project:

```bash
bun install
bun run start
```

## Building an executable

```bash
npm run dist
```

The finished installer/executable appears in `dist/`.

- Windows → `.exe`
- macOS → `.dmg`
- Linux → `.AppImage`

For a Windows hackathon demo, run the build on Windows if possible.

## Suggested team split

### Person 1 — Main/Electron
Work mainly in `main.js`.

Learn:
- `fs.readdirSync`
- `fs.copyFileSync`
- `fs.mkdirSync`
- Electron `ipcMain`
- Electron `shell.openPath`

### Person 2 — UI/HTML/CSS
Work mainly in `renderer/index.html` and `renderer/style.css`.

Learn:
- HTML elements
- CSS classes
- absolute positioning
- animations
- responsive layout

### Person 3 — UI interactions
Work mainly in `renderer/renderer.js`.

Learn:
- DOM creation
- click events
- pointer events
- drag/drop events
- navigation

### Person 4 — Persistence/testing
Focus on the `.bubble-state.json` logic in `main.js` and test:
- resize → close → reopen
- move → close → reopen
- rename
- nested folders
- dropped files
- duplicate filenames

### Senior teammate — integration
Review IPC boundaries, resolve merge conflicts, package the executable, and keep the final demo build stable.

## Easy next features

1. Recent files list
2. Search bar
3. Video thumbnail generation
4. Delete/trash support
5. Undo/redo for rename/move/resize
6. Custom bubble shapes
7. Keyboard shortcuts


## Hackathon stability revision

This version intentionally keeps the workflow simple: **Upload Files** and **Create Template** are always-visible sidebar buttons. Folder creation and renaming were removed because Electron does not reliably support the browser `prompt()` dialog used by the earlier prototype.

- Single-click an image/text file: preview it inside Bubble File Manager.
- Double-click a file: open it with the computer's normal/default application.
- Double-click a folder: enter the folder.
- Drag files from Windows Explorer/Finder into the board to copy them in.
- Resize and move bubbles; those changes remain in `.bubble-state.json`.
- The `+ Add Shortcut` button adds the current folder to the sidebar.
