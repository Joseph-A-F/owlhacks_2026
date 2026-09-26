# Bubble File Manager

A bubble-themed, Pinterest-style file manager built with Electron.
Orange bubbles = folders, blue = images, green = text files (with a text preview inside).

## How the project is organized

```
bubble-file-manager/
├── package.json        <- project metadata + scripts + electron-builder config
├── main.js              <- the MAIN process: creates the window, all real file access
├── preload.js            <- the secure bridge between main.js and the webpage
└── renderer/              <- the RENDERER process: the actual UI (basically a website)
    ├── index.html          <- page structure (sidebar, topbar, board)
    ├── style.css            <- bubble theme, colors, ocean caustics background
    └── renderer.js           <- UI logic: navigation, resizing, previews, shortcuts
```

### Why split into main / preload / renderer?

Electron apps are secretly **two programs talking to each other**:

- **`main.js`** runs in real Node.js. It's the only place allowed to read your
  actual hard drive (`fs.readdirSync`, etc). It creates the window and answers
  requests from the UI.
- **`renderer/renderer.js`** runs inside a Chromium browser window — think of
  it as a webpage. For security, a webpage is NOT allowed to touch your files
  directly (imagine if any website could read your hard drive!).
- **`preload.js`** is the narrow, safe doorway between the two. It exposes
  exactly the functions we choose (`listDir`, `readText`, `readImage`, etc.)
  as `window.api.something()` inside the renderer — nothing more.

So the flow for, say, opening a folder is:
`renderer.js` calls `window.api.listDir(path)`
→ `preload.js` forwards that over IPC to `main.js`
→ `main.js` actually calls `fs.readdirSync`
→ the result travels back the same path to `renderer.js`, which draws bubbles.

## Running it while you build (development mode)

You'll need [Node.js](https://nodejs.org) installed (Bun works too — see note
at the bottom).

```bash
cd bubble-file-manager
npm install       # downloads Electron itself
npm start         # launches the app window
```

Click **"+ New Template"**, pick (or create) an empty folder on your computer,
and the app will create `Images/`, `Documents/`, and `Miscellaneous/`
subfolders inside it with a sample file each — ready to click, resize, and
explore.

## Building a real, double-clickable executable

This is what turns the project into a `.exe` (Windows), `.dmg` (Mac), or
`.AppImage` (Linux) that you can hand to someone with no dev tools installed:

```bash
npm run dist
```

This runs **electron-builder** (configured in `package.json` under `"build"`),
which bundles your code + a copy of Chromium + Node into a single installer,
and drops it in a new `dist/` folder. That's the file you'd submit or demo
from at the end of the hackathon.

A few notes:
- The first `npm run dist` will download some extra packaging tools — do this
  early, not five minutes before judging, in case the wifi is slow.
- Building a Windows `.exe` from a Mac (or vice versa) is possible but fiddly;
  if you can, build **on the OS you're demoing on**.
- `electron-builder` picks up icons, app name, etc. from the `"build"` block
  in `package.json` — feel free to add an `icon.ico`/`icon.icns` there later.

## Using Bun instead of npm

Bun can run this project too — it's just a faster JS runtime/package manager.
Swap the commands above for:

```bash
bun install
bun run start
bun run dist
```

Electron itself still runs on Node under the hood, but Bun's `install`/`run`
are drop-in replacements for `npm install`/`npm run`.

## Uploading real files

Click **+ → Upload** in the sidebar. This opens your OS's normal "choose a
file" window — pick one or more files, and they get copied into whichever
folder you're currently looking at in the app (not necessarily Home; if
you're inside `Images/`, that's where they land). If a file with the same
name already exists there, the copy gets renamed automatically (`photo
(1).jpg`) instead of overwriting anything, same as a regular file manager.

Under the hood this is two IPC calls, same pattern as everything else:
`dialog:chooseFiles` opens the native picker in `main.js`, and
`fs:copyFilesInto` does the actual `fs.copyFileSync` work. See the "UPLOAD
SYSTEM" section near the bottom of `main.js`.

## Sample images

A freshly created template's `Images/` folder now comes with two real
bundled sample photos (not placeholder text) so there's something to click,
resize, and preview immediately. They're copied in from `template-assets/`
at the project root — feel free to swap those two files for your own, or
add more; anything you put in `template-assets/` gets copied in the next
time you build a template into a NEW folder (it won't touch a folder that
was already set up).

## How to open the code and replace what you already have

If you already unzipped an earlier version of this project and have it
running, you don't need to start over from scratch:

1. **Open the project in a code editor** — [VS
   Code](https://code.visualstudio.com/) is the easiest: File → Open Folder
   → pick your `bubble-file-manager` folder. That gives you a file tree on
   the left and lets you open/edit any of the files mentioned in this
   README directly.
2. **Replace the changed files.** Unzip this new version somewhere separate
   (e.g. a `bubble-file-manager-new` folder next to your old one), then
   copy these files/folders over your existing project, overwriting the old
   ones:
   - `main.js`
   - `preload.js`
   - `renderer/` (the whole folder)
   - `template-assets/` (the whole folder — this is new)
   - `package.json`
   - `README.md`
   Leave your existing `node_modules/` folder alone — you don't need to
   touch it unless a change specifically adds a new dependency (none of
   today's changes do).
3. **Run it again** the same way as before — no need to re-run `npm
   install` for this update:
   ```bash
   npm start
   ```

If you'd rather not juggle files by hand, the simplest option is: delete
your old `bubble-file-manager` folder entirely, unzip this new one in its
place, then `npm install` once and `npm start`. That guarantees everything
matches exactly, just costs you one extra `npm install` wait.

## Recent changes

- **Fixed bubble resizing.** The drag handle used to live *inside* a circle
  that had `overflow: hidden` — which visually clipped the handle away right
  where you needed to grab it. Bubbles are now square/rounded-rectangle
  "cards" with a thin colored outline (orange = folder, blue = image, green
  = text), and the handle lives on the un-clipped outer box, so it's always
  reachable. See the comments above `.card` in `renderer/style.css` and
  above `buildBubble()` in `renderer/renderer.js` for the full explanation.
- **Sidebar is now category tabs.** Instead of pinned shortcuts, the sidebar
  lists one tab per top-level folder inside your chosen root (e.g. "Images",
  "Documents", "Miscellaneous") so you can jump straight into any of them.
  The active one is highlighted. The "+" button at the bottom opens a small
  flyout with "Upload" (left visually present but disabled — a stretch goal)
  and "Template" (same folder-picker + starter-layout flow as before).

## About the ocean caustics background

By default the background is a **pure CSS animation** (a drifting gradient
plus two layered dot patterns) — it needs no files and never breaks, but it's
an approximation, not real footage.

You asked to use a real animated gif instead of one I generate. I didn't want
to hot-link to a random gif from a stock/AI-image site inside your code,
since most of what's out there isn't actually free to redistribute and a
random external link can silently break the day of your demo (bad if
judging depends on wifi). Instead, the app is already wired to use a real
one the moment you add it yourself:

1. Grab a free ocean-caustics loop from somewhere with a clear free license,
   e.g. [Pexels](https://www.pexels.com/search/videos/ocean%20caustics/) or
   [Pixabay](https://pixabay.com/videos/search/caustics/).
2. Save it as `renderer/assets/ocean-caustics.gif` (exact name).
3. Reload the app — it'll appear automatically in place of the CSS version.

No file there yet? The `<img>` tag's `onerror` handler in `index.html`
quietly hides itself, so you just see the CSS caustics underneath — nothing
ever shows a broken-image icon.

### Using a video instead of a gif

Videos compress *much* smaller than gifs for the same look, which matters if
you're emailing the project around during the hackathon. If you download an
`.mp4` instead:

- Save it as `renderer/assets/ocean-caustics.mp4`
- In `renderer/index.html`, swap the `<img id="bgGif" ...>` line for:
  ```html
  <video id="bgGif" autoplay loop muted playsinline
         src="assets/ocean-caustics.mp4"></video>
  ```
- No other changes needed — the CSS (`#bgGif { ... }`) already sizes and
  layers either element the same way.

## Where to go next (ideas for extending it)

- **Drag-and-drop reordering** of bubbles (currently they resize but don't
  reorder — you'd track a saved order per-folder, e.g. in a small JSON file).
- **Video thumbnails**: main.js could shell out to `ffmpeg` to grab a frame,
  then hand it back the same way `fs:readImage` does.
- **Recents list**: keep a small array (like the shortcuts list) of the last
  N files opened, updated in `openFullPreview()`.
- **Nested "files inside files"**: the current code already supports this —
  any folder, at any depth, works the same way. Try creating a folder inside
  `Images/` and opening it.
