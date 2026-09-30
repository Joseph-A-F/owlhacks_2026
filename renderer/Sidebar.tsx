import type { ReactNode } from 'react';
import { useStore } from './store';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const root = useStore(state => state.root);
  const navigateTo = useStore(state => state.navigateTo);
  const openRoot = useStore(state => state.openRoot);
  const shortcuts = useStore(state => state.shortcuts);
  const addShortcutToCurrentFolder = useStore(state => state.addShortcutToCurrentFolder);
  const removeShortcut = useStore(state => state.removeShortcut);
  const refreshCurrentFolder = useStore(state => state.refreshCurrentFolder);

  const handleHomeClick = () => {
    if (root) navigateTo(0);
  };

  const handleShortcutClick = async (shortcutPath: string) => {
    if (!root) return;
    try {
      // Navigate to shortcut path logic can be complex as in original,
      // For now we'll just reconstruct the stack if needed, or simply re-open root and navigate
      // In the original, it did a series of pushes. 
      // To keep it simple, we can call openRoot with the absolute path, but shortcuts are relative.
      // Assuming window.api handles the relative to absolute resolution or we do it here.
      const pieces = shortcutPath.split(/[\\/]/);
      let running = root;
      // Note: Full implementation of reconstructing the stack would go here
      // For brevity, we call a simplified approach assuming `api.listDir` can handle it
      // we can do a sequence of navigateInto, or we can just fetch and set state.
      // Let's implement the reconstruction here as it was in original
      const newStack = [{ name: "Home", path: root }];
      if (shortcutPath !== ".") {
        for (const piece of pieces) {
          running = `${running}${running.includes("\\") ? "\\" : "/"}${piece}`;
          newStack.push({ name: piece, path: running });
        }
      }
      const items = await window.api.listDir(root, newStack[newStack.length - 1].path);
      useStore.setState({ stack: newStack, currentItems: items, panX: 0, panY: 0, zoom: 1 });
    } catch {
      alert("That shortcut no longer exists.");
    }
  };

  const handleUploadFiles = async () => {
    if (!root) {
      const chosen = await window.api.chooseFolder();
      if (chosen) await openRoot(chosen);
      return;
    }
    const filePaths = await window.api.chooseFiles();
    if (!filePaths.length) return;
    try {
      const { stack } = useStore.getState();
      const currentFolder = stack[stack.length - 1];
      await window.api.copyEntriesInto(currentFolder.path, filePaths);
      await refreshCurrentFolder();
    } catch (error) {
      console.error(error);
      alert(String(error));
    }
  };

  const handleTemplateFolder = async () => {
    const chosen = await window.api.chooseFolder();
    if (!chosen) return;
    await window.api.createTemplate(chosen);
    await openRoot(chosen);
  };

  return (
    <>
      <aside className="sidebar">
        <div className="brand">🫧<span>Bubble</span></div>
        <button className="side-home" onClick={handleHomeClick}>⌂ Home</button>

        <div className="section-title">SHORTCUTS</div>
        <div className="shortcuts">
          {shortcuts.map(shortcut => (
            <div key={shortcut.path} className="shortcut-row">
              <button
                className="shortcut"
                title={`Go to ${shortcut.path}`}
                onClick={() => handleShortcutClick(shortcut.path)}
              >
                ★ {shortcut.name}
              </button>
              <button
                className="remove-shortcut"
                title="Delete shortcut"
                aria-label={`Delete shortcut for ${shortcut.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeShortcut(shortcut.path);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          className="add-shortcut"
          title="Add the current folder as a shortcut"
          onClick={(e) => {
            e.stopPropagation();
            if (root) addShortcutToCurrentFolder();
          }}
        >
          ＋ Add Shortcut
        </button>

        <div className="sidebar-actions">
          <button className="action-button" onClick={handleUploadFiles}>⬆ Upload Files</button>
          <button className="action-button" onClick={handleTemplateFolder}>Open Folder</button>
        </div>
      </aside>
      {children}
    </>
  );
}

