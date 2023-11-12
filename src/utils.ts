import { promises as fs } from 'fs';
import * as path from 'path';

// Add a list of directories to ignore
// You may update this list from a configuration file or extension settings if necessary
const IGNORED_DIRECTORIES = ['node_modules', 'dist', 'out', 'build', '.git', 'bin', 'obj'];

export async function getFilePaths(dir: string): Promise<string[]> {
    let files: string[] = [];

    // Helper function to check if the path should be ignored
    function shouldIgnore(fileOrDir: string): boolean {
        // Extract the base part of the file or directory name
        const baseName = path.basename(fileOrDir);
        
        // Check if baseName is part of IGNORED_DIRECTORIES
        return IGNORED_DIRECTORIES.some(ignoredDir => 
            // Use startsWith to catch nested ignored directories as well
            baseName === ignoredDir || baseName.startsWith(`${ignoredDir}/`) || baseName.startsWith(`${ignoredDir}\\`)
        );
    }

    async function readDir(directory: string) {
        const dirents = await fs.readdir(directory, { withFileTypes: true });
        for (const dirent of dirents) {
            const res = path.resolve(directory, dirent.name);
            
            // Filter out any files/directories we want to ignore
            if (shouldIgnore(res)) {
                continue;
            }

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
