import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { getFilePaths } from './utils';

export class FileReader {
    workspace: typeof vscode.workspace;

    constructor(workspace: typeof vscode.workspace) {
        this.workspace = workspace;
    }

    async readWorkspaceFiles(): Promise<{filePath: string, content: string}[]> {
        const workspaceFolders = this.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const allFiles: {filePath: string, content: string}[] = [];
        for (const folder of workspaceFolders) {
            const filePaths = await getFilePaths(folder.uri.fsPath);
            for (const filePath of filePaths) {
                try {
                    const content = readFileSync(filePath, 'utf8');
                    allFiles.push({ filePath, content });
                } catch (error) {
                    console.error(`Error reading file ${filePath}: ${error}`);
                }
            }
        }

        return allFiles;
    }
}
