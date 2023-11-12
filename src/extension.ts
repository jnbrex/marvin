import * as vscode from 'vscode';
import { FileReader } from './fileReader';
import { OpenAIClient } from './openaiClient';
import marked from 'marked';
import axios, { Axios } from 'axios';

export function activate(context: vscode.ExtensionContext) {
    // Register a file watcher for all files in the workspace.
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');

    let history: { question: string; response: string }[] =
        context.globalState.get<{ question: string; response: string }[]>('marvinHistory') || [];

    const openAIClient = new OpenAIClient(
        vscode.workspace.getConfiguration('marvin').get('openaiApiKey') || '',
        vscode.workspace.getConfiguration('marvin').get('modelName') || 'gpt-4-1106-preview'
    );

    let guiDisposable = vscode.commands.registerCommand('marvin.showGui', async () => {
        const panel = vscode.window.createWebviewPanel(
            'marvinGui',
            'Marvin',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );
        
        var projectData = '';
        // File data processing should be performed here and also whenever files change.
        async function updateFileData() {
            const fileReader = new FileReader(vscode.workspace);
            const fileData = await fileReader.readWorkspaceFiles();
            const fileContents = fileData.map(file => file.content);
            const filePaths = fileData.map(file => file.filePath);
            projectData = processFileContents(fileContents, filePaths);
        }

        // Initially call `updateFileData` to process files for the first time.
        await updateFileData();

        panel.webview.html = getWebviewContent(panel.webview, context);

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'queryOpenAI':
                        try {
                            const cancellationTokenSource = openAIClient.createCancelTokenSource();
                            const response = await queryOpenAI(message.text, projectData, openAIClient, cancellationTokenSource);
                            history.unshift({ question: message.text, response: response });
                            history = history.slice(0, 50); // keep only the latest 50 entries
                            context.globalState.update('marvinHistory', history);
                            panel.webview.postMessage({ command: 'response', text: response, html: marked.parse(response) });
                        } catch (error) {
                            if (axios.isCancel(error)) {
                                panel.webview.postMessage({ command: 'cancel', text: 'Request cancelled.' });
                            } else {
                                panel.webview.postMessage({ command: 'error', text: 'Error querying OpenAI.' });
                            }
                        }
                        
                        break;
                    case 'cancelQuery':
                        openAIClient.cancelRequest();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Re-process the file data when any file within the workspace has changed, created or deleted.
        fileWatcher.onDidChange(updateFileData);
        fileWatcher.onDidCreate(updateFileData);
        fileWatcher.onDidDelete(updateFileData);

    });

    const historyDisposable = vscode.commands.registerCommand('marvin.showHistory', () => {
        const historyPanel = vscode.window.createWebviewPanel(
            'marvinHistory',
            'Marvin History',
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            });
        historyPanel.webview.html = getHistoryWebviewContent(history); // Removed the reverse operation
    });

    context.subscriptions.push(historyDisposable, guiDisposable, fileWatcher);
}

export function deactivate() {}

function processFileContents(fileContents: string[], filePaths: string[]): string {
    const sourceCodeExtensions = ['.py', '.java', '.cpp', '.ts', '.html', '.css'];
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

    // Additional CSS to ensure responsive constraint of elements to webview width
    const responsiveStyles = `
        html, body, #response { max-width: 100%; }
        #response { word-wrap: break-word; }
    `;

    const cssEnhancements = `
        #response {
            display: none;
            padding-top: 5px; /* Reduced from original padding */
            padding-bottom: 5px; /* Reduced from original padding */
            margin-top: 5px; /* Optional: Can be adjusted if needed */
            margin-bottom: 5px; /* Optional: Can be adjusted if needed */
        }
    `;

    const cssForTextAreaFocus = `
        textarea:focus {
            outline: none;
            border-color: #3da8df;
        }
    `;
    
    // Dark theme specific styles
    const darkThemeStyles = `
        body { background: #1e1e1e; color: #c5c5c5; }
        textarea, #response { background: #252526; color: #CCC; border: 1px solid #3c3c3c; }
        button {
			padding: 10px 20px;
            margin-top: 10px;
			margin-bottom: 10px;
            margin-right: 5px;
			border: none;
			outline: none;
			cursor: pointer;
			font-weight: bold;
			transition: all 0.3s ease;
			background-image: linear-gradient(to right, #3da8df 0%, #2080b8 100%);
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

    const enhancedTitleStyle = `
        h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0;
            margin-bottom: 20px;
            /* Lighter gradient colors */
            background: -webkit-linear-gradient(#57c1e8, #36afea);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            user-select: none;
        }
    `;
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marvin GUI</title>
        
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; }
            textarea, #response {
                width: calc(100% - 30px); /* Adjust width to account for margin */
                margin-bottom: 5px;
                padding: 10px;
            }
            textarea { height: 100px; resize: none; }
            #response {
                margin-top: 5px;
                margin-bottom: 5px;
                word-wrap: break-word;
                overflow-wrap: break-word;
                overflow: auto;
            }
            button { padding: 5px 15px; margin-bottom: 10px; }

            .button-loading {
                background-image: linear-gradient(to right, #4facfe, #00f2fe, #4facfe);
                background-size: 200% 200%; /* make sure the gradient background is large enough so the shift can be seen */
                animation: gradientShift 2s linear infinite; /* apply the animation, adjust timing as necessary */
                color: white; /* Keep the button text visible */
            }

            button.cancel-btn {
                background-color: #ff6347;
            }

            @keyframes spin {
                0% {
                    transform: translate(-50%, -50%) rotate(0deg);
                }
                100% {
                    transform: translate(-50%, -50%) rotate(360deg);
                }
            }

            /* Inject css styles */
            ${darkThemeStyles}
            ${responsiveStyles}
            ${cssEnhancements}
            ${enhancedTitleStyle}
            ${cssForTextAreaFocus}
            
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}

            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            .flex-container {
                display: flex; // Use flexbox to position the elements side by side
                align-items: center; // Vertically center the items in the flex container
            }
        </style>
    </head>
    <body>
        <h1>Marvin - your coding assistant</h1>
        <textarea id="question" placeholder="Ask a question about your project..."></textarea>
        
        <!-- Flex container for the button and loader -->
        <div class="flex-container">
            <button onclick="askQuestion()" class="ask-btn">Ask</button>
            <button onclick="cancelQuestion()" class="cancel-btn">Cancel</button>
        </div>
        
        <div id="response"></div>

        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();

            function cancelQuestion() {
                vscode.postMessage({
                    command: 'cancelQuery'
                });
                setButtonLoading(false); // Disable loading state for the button
            }

            function setButtonLoading(loading) {
                const askButton = document.querySelector('.ask-btn');
                if (loading) {
                    askButton.classList.add('button-loading');
                } else {
                    askButton.classList.remove('button-loading');
                }
            }

            function askQuestion() {
                const question = document.getElementById('question').value;
                const responseContainer = document.getElementById('response');
                responseContainer.style.display = 'none';
                setButtonLoading(true); // Enable loading state for the button
            
                // Post a message back to the extension's main context to handle the OpenAI query.
                vscode.postMessage({
                    command: 'queryOpenAI',
                    text: question
                });
            }

            window.addEventListener('message', event => {
                const message = event.data;
                const responseContainer = document.getElementById('response');
                switch (message.command) {
                    case 'response':
                        responseContainer.innerHTML = message.html;
                        responseContainer.style.display = 'block';
                        setButtonLoading(false);
                        break;
                    case 'cancel':
                        responseContainer.textContent = message.text;
                        responseContainer.style.display = 'block';
                        setButtonLoading(false);
                        break;
                    case 'error':
                        responseContainer.textContent = 'Error: ' + message.text;
                        responseContainer.style.display = 'block';
                        setButtonLoading(false);
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

async function queryOpenAI(userQuery: string,
                           projectData: string,
                           openAIClient: OpenAIClient,
                           cancellationToken: axios.CancelTokenSource): Promise<string> {
    
	const promptIntroduction = `You are a highly skilled software assistant with the ability to understand and analyze software projects in their entirety. You have the capability to read and comprehend various source code files and project documents, and you can provide assistance based on this understanding. Below is a summary of a software project, including key excerpts from its source code and documentation:`;
	const projectSummary = `Project Summary:\n${projectData}\n\n`;
	const promptQuestion = `Based on the project summary above, be prepared to answer questions about the project, offer insights, suggest improvements, assist in debugging, and provide coding help where needed.`;

	const messages = [
		{ role: "system", content: promptIntroduction },
		{ role: "user", content: projectSummary },
		{ role: "system", content: promptQuestion },
        { role: "user", content: userQuery }
	];

    try {
        // Pass the cancellation token to the `getChatCompletion` function
        const response = await openAIClient.getChatCompletion(messages, cancellationToken.token);
        return response;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('Request canceled: ', error.message);
        } else {
            console.error('Error calling OpenAI Chat API: ', error);
        }
        throw error;
    }
}

function getHistoryWebviewContent(history: { question: string, response: string }[]) {
    let content = '';
    for (const [index, item] of history.entries()) {
        const summary = summarizeQuestion(item.question);
        content += `
            <div class="history-entry">
                <button class="summary-button">${summary}</button>
                <div id="entry-${index}" class="full-entry" style="display: none;">
                    <div class="question">${marked.parse(item.question)}</div>
                    <div class="response">${marked.parse(item.response)}</div>
                </div>
            </div>`;
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Marvin History</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 15px;
                        background: #1e1e1e; 
                        color: #c5c5c5;
                    }
                    .history-entry {
                        border-bottom: 1px solid #3c3c3c;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                    }
                    .question, .response {
                        padding: 10px;
                        background: #252526; 
                        color: #CCC; 
                        border: 1px solid #3c3c3c;
                        margin-bottom: 5px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        overflow: auto;
                    }
                    .question { 
                        background-color: #2d2d2d; 
                    }
                    .response { 
                        background-color: #252526; 
                    }
                    h1 {
                        font-size: 2em;
                        font-weight: bold;
                        margin: 0;
                        margin-bottom: 20px;
                        /* Gradient text effect like in the main Marvin GUI */
                        background: -webkit-linear-gradient(#57c1e8, #36afea);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        text-fill-color: transparent;
                        user-select: none;
                    }
                    .summary-button {
                        cursor: pointer;
                        background: #3da8df;
                        border: none;
                        border-radius: 5px;
                        padding: 5px 10px;
                        color: white;
                        margin: 5px;
                        display: block;
                        text-align: left;
                    }
                    .full-entry {
                        margin: 10px 0px;
                    }                    
                </style>
            </head>
            <body>
                <h1>Marvin History</h1>
                ${content}
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        document.querySelectorAll('.history-entry .summary-button').forEach((button, index) => {
                            button.addEventListener('click', () => {
                                const fullEntry = document.getElementById('entry-' + index);
                                fullEntry.style.display = fullEntry.style.display === 'none' ? 'block' : 'none';
                            });
                        });
                    });
                </script>
            </body>
        </html>`;
}

function summarizeQuestion(question: string): string {
    const words = question.split(/\s+/);
    if (words.length <= 10) {
        return question;
    } else {
        return words.slice(0, 10).join(' ') + '...';
    }
}
