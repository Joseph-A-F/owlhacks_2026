import * as fs from 'fs';
import * as path from 'path';
import { fsManager } from './manager';
import * as https from 'https';
import * as http from 'http';

export async function downloadFile(url: string, filename?: string): Promise<string> {
    const destName = filename || path.basename(new URL(url).pathname) || `download-${Date.now()}`;
    const destPath = path.join(fsManager.getAppDir(), destName);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // handle simple redirect once (optional, naive)
                return downloadFile(response.headers.location!, destName).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(destName);
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}
