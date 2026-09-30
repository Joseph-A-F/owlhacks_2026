export interface FileSystemItem {
    name: string;
    path: string;
    type: 'folder' | 'image' | 'text' | 'unknown';
    x: number | null;
    y: number | null;
    width: number;
    height: number;
    preview?: string;
}

export interface StackEntry {
    name: string;
    path: string;
}

export interface Shortcut {
    name: string;
    path: string;
}

declare global {
    interface Window {
        api: any;
    }
}

