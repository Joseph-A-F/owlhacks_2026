import { create } from 'zustand';
import type { FileSystemItem, Shortcut, StackEntry } from './types';

interface AppState {
    root: string | null;
    stack: StackEntry[];
    currentItems: FileSystemItem[];
    shortcuts: Shortcut[];

    panX: number;
    panY: number;
    zoom: number;

    setPan: (x: number, y: number) => void;
    setZoom: (z: number) => void;
    openRoot: (folderPath: string) => Promise<void>;
    navigateTo: (index: number) => Promise<void>;
    navigateInto: (item: FileSystemItem) => Promise<void>;
    updateItemPosition: (path: string, x: number, y: number) => void;
    updateItemSize: (path: string, width: number, height: number) => void;
    saveLayout: () => void;
    addShortcutToCurrentFolder: () => Promise<void>;
    removeShortcut: (path: string) => Promise<void>;
    refreshCurrentFolder: () => Promise<void>;
}

export const useStore = create<AppState>()((set, get) => ({
    root: null,
    stack: [],
    currentItems: [],
    shortcuts: [],
    panX: 0,
    panY: 0,
    zoom: 1,

    setPan: (x, y) => set({ panX: x, panY: y }),
    setZoom: (z) => set({ zoom: z }),

    openRoot: async (folderPath) => {
        const stack = [{ name: "Home", path: folderPath }];
        const state = await window.api.getState(folderPath);
        const shortcuts = Array.isArray(state.shortcuts) ? state.shortcuts : [];
        const items = await window.api.listDir(folderPath, folderPath);

        set({ root: folderPath, stack, shortcuts, currentItems: items, panX: 0, panY: 0, zoom: 1 });
    },

    navigateTo: async (index) => {
        const { root, stack } = get();
        if (!root) return;
        const newStack = stack.slice(0, index + 1);
        const items = await window.api.listDir(root, newStack[newStack.length - 1].path);
        set({ stack: newStack, currentItems: items, panX: 0, panY: 0, zoom: 1 });
    },

    navigateInto: async (item) => {
        const { root, stack } = get();
        if (!root) return;
        const newStack = [...stack, { name: item.name, path: item.path }];
        const items = await window.api.listDir(root, item.path);
        set({ stack: newStack, currentItems: items, panX: 0, panY: 0, zoom: 1 });
    },

    updateItemPosition: (path, x, y) => {
        set((state) => ({
            currentItems: state.currentItems.map(item =>
                item.path === path ? { ...item, x, y } : item
            )
        }));
    },

    updateItemSize: (path, width, height) => {
        set((state) => ({
            currentItems: state.currentItems.map(item =>
                item.path === path ? { ...item, width, height } : item
            )
        }));
    },

    saveLayout: () => {
        const { root, stack, currentItems } = get();
        if (!root || stack.length === 0) return;
        const currentFolder = stack[stack.length - 1];
        window.api.saveLayout(root, currentFolder.path, currentItems).catch(console.error);
    },

    addShortcutToCurrentFolder: async () => {
        const { root, stack, shortcuts } = get();
        if (!root || stack.length === 0) return;
        const currentFolder = stack[stack.length - 1];
        const targetPath = currentFolder.path;
        const relative = targetPath === root ? "." : targetPath.slice(root.length + 1);
        const name = relative === "." ? "Home" : relative.split(/[\\/]/).pop() || "Folder";

        if (!shortcuts.some(item => item.path === relative)) {
            const newShortcuts = [...shortcuts, { name, path: relative }];
            await window.api.saveShortcuts(root, newShortcuts);
            set({ shortcuts: newShortcuts });
        }
    },

    removeShortcut: async (pathToRemove) => {
        const { root, shortcuts } = get();
        if (!root) return;
        const newShortcuts = shortcuts.filter(item => item.path !== pathToRemove);
        await window.api.saveShortcuts(root, newShortcuts);
        set({ shortcuts: newShortcuts });
    },

    refreshCurrentFolder: async () => {
        const { root, stack } = get();
        if (!root || stack.length === 0) return;
        const currentFolder = stack[stack.length - 1];
        const items = await window.api.listDir(root, currentFolder.path);
        set({ currentItems: items });
    }
}));

