import axios from 'axios';

export class OpenAIClient {
    private apiKey: string;
    private modelName: string;
    private cancelTokenSource: axios.CancelTokenSource | null = null;

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async getChatCompletion(
            messages: { role: string, content: string }[],
            cancelToken: axios.CancelToken): Promise<string> {
        const endpoint = `https://api.openai.com/v1/chat/completions`;
        const payload = {
            model: this.modelName,
            messages: messages,
        };

        try {
            const response = await axios.post(
                endpoint,
                payload,
                {
                    headers: { 'Authorization': `Bearer ${this.apiKey}` },
                    cancelToken: cancelToken // Pass the cancellation token to axios
                }
            );
            const lastMessage = response.data.choices[0].message;
            // Before returning the last message, check if it contains actions to modify files.
            if (lastMessage.role === 'assistant') {
                return lastMessage.content;
            } else {
                return '';
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled:', error.message);
            } else {
                console.error('Error calling OpenAI Chat API:', error);
            }
            throw error;
        }
    }

    // Implement the cancelRequest method
    cancelRequest() {
        if (this.cancelTokenSource) {
            this.cancelTokenSource.cancel('Request cancelled by the user.');
            this.cancelTokenSource = null; // Reset the token source
        }
    }

    // Method to initialize a new cancellation token source before making an API call
    createCancelTokenSource(): axios.CancelTokenSource {
        this.cancelTokenSource = axios.CancelToken.source();
        return this.cancelTokenSource;
    }
}
