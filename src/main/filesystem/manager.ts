import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

class FileSystemManager {
    private appDir: string;

    constructor() {
        this.appDir = path.join(app.getPath('userData'), 'owlhacks-files');
    }

    initialize() {
        if (!fs.existsSync(this.appDir)) {
            fs.mkdirSync(this.appDir, { recursive: true });
        }
    }

    getFiles(): { name: string, path: string, url: string }[] {
        if (!fs.existsSync(this.appDir)) return [];
        const files = fs.readdirSync(this.appDir);
        return files.map(file => ({
            name: file,
            path: path.join(this.appDir, file),
            url: `file://${path.join(this.appDir, file)}`
        }));
    }

    async saveFile(sourcePath: string, filename?: string): Promise<string> {
        const destName = filename || path.basename(sourcePath);
        const destPath = path.join(this.appDir, destName);
        await fs.promises.copyFile(sourcePath, destPath);
        return destName;
    }

    async deleteFile(filename: string): Promise<void> {
        const filePath = path.join(this.appDir, filename);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }

    getAppDir() {
        return this.appDir;
    }
}

export const fsManager = new FileSystemManager();
