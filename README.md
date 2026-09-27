# Bubble File Manager 🫧

A beginner-friendly Electron file manager for our HCI hackathon. It uses a Pinterest-style freeform board, colored bubbles, and a small persistent state file.

## What this version does

- **Orange bubbles** = folders
- **Blue bubbles** = images
- **Green bubbles** = text files with a preview
- **Gray bubbles** = other file types
- Drag files/folders from Windows Explorer/Finder directly into the board
- Drag bubbles anywhere on the board
- Pan around the board by clicking and dragging the background, and zoom with Ctrl/Cmd + scroll
- Resize bubbles with the white corner handle
- Right-click a bubble to delete it
- Bubble position, size, and order are saved automatically
- Double-click a file to open it with the computer's normal/default application
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
npx electron-builder
```

The finished installer/executable appears in `dist/`.

- Windows → `.exe`
- macOS → `.dmg`
- Linux → `.AppImage`
