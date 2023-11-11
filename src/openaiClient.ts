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
            return lastMessage.role === 'assistant' ? lastMessage.content : '';
        } catch (error) {
            console.error('Error calling OpenAI Chat API:', error);
            throw error;
        }
    }

    async *getChatStream(messages: { role: string, content: string }[]): AsyncGenerator<string, void, undefined> {
        const endpoint = `https://api.openai.com/v1/chat/completions`; // same endpoint
        const payload = {
            model: this.modelName,
            messages: messages,
        };

        // Instead of a single axios post, we will use an axios request with a stream response type
        try {
            const response = await axios.request({
                method: 'post',
                url: endpoint,
                data: payload,
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
                responseType: 'stream'
            });

            // The axios response is now a stream
            const stream = response.data;

            // Use a generator to yield messages as they are received
            for await (const chunk of Readable.toWeb(stream)) {
                yield typeof chunk === 'string' ? chunk : chunk.toString();
            }
        } catch (error) {
            console.error('Error calling OpenAI Chat Stream API:', error);
            throw error;
        }
    }
}
