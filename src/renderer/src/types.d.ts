export interface ElectronAPI {
    getFiles: () => Promise<{ name: string, path: string, url: string }[]>;
    addFile: () => Promise<string | null>;
    downloadFile: (url: string, filename?: string) => Promise<string>;
    deleteFile: (filename: string) => Promise<void>;
}

declare global {
    interface Window {
        api: ElectronAPI;
    }
}
