import * as vscode from 'vscode';
import { FileReader } from './fileReader';
import { OpenAIClient } from './openaiClient';

export function activate(context: vscode.ExtensionContext) {
    const openAIClient = new OpenAIClient(
        vscode.workspace.getConfiguration('marvin').get('openaiApiKey') || '',
        vscode.workspace.getConfiguration('marvin').get('modelName') || 'gpt-4-1106-preview'
    );

    let guiDisposable = vscode.commands.registerCommand('marvin.showGui', async () => {
        const panel = vscode.window.createWebviewPanel(
            'marvinGui',
            'Marvin GUI',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        const fileReader = new FileReader(vscode.workspace);
        const fileData = await fileReader.readWorkspaceFiles();
        const fileContents = fileData.map(file => file.content);
        const filePaths = fileData.map(file => file.filePath);
        const processedData = processFileContents(fileContents, filePaths);

        panel.webview.html = getWebviewContent(panel.webview, context);

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'queryOpenAI':
                        try {
                            const response = await queryOpenAI(message.text, processedData, openAIClient);
                            panel.webview.postMessage({ command: 'response', text: response });
                        } catch (error) {
                            console.error(`Error: ${error}`);
                            panel.webview.postMessage({ command: 'error', text: 'Error querying OpenAI.' });
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(guiDisposable);
}

export function deactivate() {}

function processFileContents(fileContents: string[], filePaths: string[]): string {
    const sourceCodeExtensions = ['.js', '.py', '.java', '.cpp', '.ts', '.html', '.css'];
    let concatenatedSourceCode = '';

    fileContents.forEach((content, index) => {
        const filePath = filePaths[index];
        const fileExtension = filePath.substring(filePath.lastIndexOf('.'));

        if (sourceCodeExtensions.includes(fileExtension)) {
            concatenatedSourceCode += `File: ${filePath}\n${content}\n\n`;
        }
    });

    return concatenatedSourceCode;
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext) {
	const nonce = getNonce();

    // Dark theme specific styles
    const darkThemeStyles = `
        body { background: #1e1e1e; color: #c5c5c5; }
        textarea, #response { background: #252526; color: #CCC; border: 1px solid #3c3c3c; }
        button {
			padding: 10px 20px;
			margin-bottom: 20px;
			border: none;
			outline: none;
			cursor: pointer;
			font-weight: bold;
			transition: all 0.3s ease;
			background-image: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
			border-radius: 20px;
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
			color: white;
		}
		
		button:hover {
			box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
			transform: translateY(-2px);
		}
		
		button:active {
			transform: translateY(1px);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		}
        #response { border-color: #3c3c3c; }
    `;

	

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marvin GUI</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; }
            textarea, #response { width: 100%; margin-bottom: 10px; }
            textarea { height: 100px; }
            #response { white-space: pre-wrap; padding: 10px; }
            button { padding: 5px 15px; margin-bottom: 20px; }

            /* Inject dark theme styles */
            ${darkThemeStyles}

			.loader {
				border: 5px solid #f3f3f3; /* Light grey */
				border-top: 5px solid #3498db; /* Blue */
				border-radius: 50%;
				width: 30px;
				height: 30px;
				animation: spin 2s linear infinite;
				display: none; /* Hidden by default */
			}
		
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
        </style>
    </head>
    <body>
        <h1>Marvin Extension GUI</h1>
        <p>Use this panel to interact with the Marvin extension and ask questions about your project.</p>
        <textarea id="question" placeholder="Ask a question about the project..."></textarea>
        <button onclick="askQuestion()" class="ask-btn">Ask</button>
		<div id="loading" class="loader"></div>
        <div id="response"></div>

        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            function askQuestion() {
				const question = document.getElementById('question').value;
				document.getElementById('loading').style.display = 'block'; // Show loading icon
				document.getElementById('response').textContent = ''; // Clear the previous response or error
				vscode.postMessage({
					command: 'queryOpenAI',
					text: question
				});
			}

            window.addEventListener('message', event => {
				const message = event.data;
				switch (message.command) {
					case 'response':
						const responseContainer = document.getElementById('response');
						responseContainer.textContent = message.text;
						document.getElementById('loading').style.display = 'none'; // Hide loading icon
						break;
					case 'error':
						document.getElementById('response').textContent = 'Error: ' + message.text;
						document.getElementById('loading').style.display = 'none'; // Hide loading icon
						break;
				}
			});
        </script>
    </body>
    </html>`;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function queryOpenAI(userQuery: string, projectData: string, openAIClient: OpenAIClient): Promise<string> {
    
	const promptIntroduction = `You are a highly skilled software assistant with the ability to understand and analyze software projects in their entirety. You have the capability to read and comprehend various source code files and project documents, and you can provide assistance based on this understanding. Below is a summary of a software project, including key excerpts from its source code and documentation:`;
	const projectSummary = `Project Summary:\n${projectData}\n\n`;
	const promptQuestion = `Based on the project summary above, be prepared to answer questions about the project, offer insights, suggest improvements, assist in debugging, and provide coding help where needed.`;

	const messages = [
		{ role: "system", content: promptIntroduction },
		{ role: "user", content: projectSummary },
		{ role: "system", content: promptQuestion },
        { role: "user", content: userQuery }
	];

    const response = await openAIClient.getChatCompletion(messages);
    return response;
}
