import axios from 'axios';
import { Readable } from 'stream';

export class OpenAIClient {
    private apiKey: string;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async getChatCompletion(messages: { role: string, content: string }[]): Promise<string> {
        const endpoint = `https://api.openai.com/v1/chat/completions`;
        const payload = {
            model: this.modelName,
            messages: messages,
        };

        try {
            const response = await axios.post(
                endpoint,
                payload,
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
            const lastMessage = response.data.choices[0].message;
            // Before returning the last message, check if it contains actions to modify files.
            if (lastMessage.role === 'assistant') {
                const changes = false; //extractFileChanges(lastMessage.content);
                if (changes) {
                    // If changes are found, add them to the response.
                    return JSON.stringify({ text: lastMessage.content, changes: changes });
                } else {
                    // If no changes, return the message text as it is.
                    return lastMessage.content;
                }
            } else {
                return '';
            }
        } catch (error) {
            console.error('Error calling OpenAI Chat API:', error);
            throw error;
        }
    }

    extractFileChanges(responseText: string): Array<{ filePath: string; content: string; }> | null {
        // TODO: Implement actual parsing logic to extract file change instructions.
        // Placeholder return value:
        return null;
    }
}
