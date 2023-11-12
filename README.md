# Marvin - Your Coding Assistant

Marvin is a Visual Studio Code (VS Code) extension that acts as an intelligent coding assistant, leveraging OpenAI's powerful language models to help you understand and work within your software projects.

## Features

- **Code Analysis**: Marvin can analyze your codebase and provide insights, respond to specific coding queries, assist in debugging, and offer coding tips based on the full context of the project.
- **Real-time Response**: Get responses to queries and summaries directly within VS Code as you work on your project.
- **History Tracking**: Save and display the history of queries and responses for easy reference.
- **History Management**: Retrieve past interactions with the assistant and clear the history if needed.

## Getting Started

Before using Marvin, you'll need an OpenAI API key. Here's how to set everything up:

### Prerequisites

- Visual Studio Code (VS Code)
- An active OpenAI account with access to the API (you can obtain an API key from [OpenAI](https://openai.com/))

### Installation

1. Download and install the Marvin extension from the Visual Studio Marketplace or build it from the source.
2. After installing the Marvin extension, open your VS Code settings.

### Set Up Your OpenAI API Key

1. Navigate to the `Settings` panel in VS Code by clicking on the gear icon at the bottom left corner and selecting `Settings`.
2. Search for "Marvin" in the settings search bar.
3. Find the setting labeled `OpenAI Api Key`.
4. Enter your OpenAI API key into this setting field.

### Usage

To start using Marvin once everything is set up:

1. Open a project in VS Code.
2. Trigger Marvin's GUI by pressing `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the command palette and type `Marvin: Code Assistant`.
3. A new pane called 'Marvin' will appear where you can type in your query.
4. Marvin will analyze the context based on the current workspace and provide a response to your query.
5. To view your query history, use the command `Marvin: Show History`.
6. If you want to clear your query history, use the command `Marvin: Clear History`.

Always ensure the project you're working on has its files saved and that the extension has the appropriate permissions to read the workspace files.

## Security Note

Please be cautious with the queries you make to Marvin and the information you share, especially when using proprietary or sensitive code.

## Contributing

Contributions to Marvin are welcome! Feel free to fork the repository, make changes, and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## Support and Feedback

If you encounter any issues or have suggestions, please create an issue in the project's GitHub repository.

Enjoy coding with Marvin at your side!