import { promises as fs } from 'fs';
import * as path from 'path';

export async function getFilePaths(dir: string): Promise<string[]> {
    let files: string[] = [];

    async function readDir(directory: string) {
        const dirents = await fs.readdir(directory, { withFileTypes: true });
        for (const dirent of dirents) {
            const res = path.resolve(directory, dirent.name);
            if (dirent.isDirectory()) {
                files = files.concat(await getFilePaths(res));
            } else {
                files.push(res);
            }
        }
    }

    await readDir(dir);
    return files;
}
