import {error, info} from "../helpers.js";

export default class BaseNotifier {
    /**
     * @type {string}
     */
    #type;

    /**
     * @type {Map<string, {messages: string[], timer: NodeJS.Timeout}>}
     */
    #buffers = new Map();

    /**
     * @type {Map<string, number>}
     */
    #sentMessages;

    /**
     * @param {string} type
     * @param {Map<string, number>} sentMessages Shared map for deduplication
     */
    constructor(type, sentMessages) {
        this.#type = type;
        this.#sentMessages = sentMessages;
    }

    /**
     * @param {string} url
     * @param {string} message
     */
    buffer(url, message) {
        const key = `${this.#type}|${url}|${message}`;
        const timestamp = Date.now();

        // 1. Deduplication logic (1-hour window per unique message)
        if (this.#sentMessages.has(key)) {
            const lastSent = this.#sentMessages.get(key);
            if (timestamp - lastSent < 3600000) {
                return;
            }
        }
        this.#sentMessages.set(key, timestamp);

        // 2. Initialize the buffer if it doesn't exist
        if (!this.#buffers.has(url)) {
            this.#buffers.set(url, { messages: [], timer: null });
        }

        const buffer = this.#buffers.get(url);
        buffer.messages.push(message);

        // 3. Debounce Logic:
        if (buffer.timer) {
            clearTimeout(buffer.timer);
        }

        buffer.timer = setTimeout(() => {
            this.flush$(url);
        }, 5000);
    }

    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    async flush$(url) {
        const buffer = this.#buffers.get(url);
        if (!buffer || buffer.messages.length === 0) return;

        const text = buffer.messages.join('\n');

        // Clear buffer state BEFORE sending to prevent race conditions
        buffer.messages = [];
        if (buffer.timer) {
            clearTimeout(buffer.timer);
            buffer.timer = null;
        }

        try {
            await this.send$(url, text);
        } catch (err) {
            error(`Failed to send ${this.#type} notification: ${err.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async flushAll$() {
        const promises = [];
        for (const url of this.#buffers.keys()) {
            promises.push(this.flush$(url));
        }
        await Promise.all(promises);
    }

    /**
     * To be implemented by subclasses
     *
     * @param {string} url
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(url, text) {
        throw new Error('Method send$() must be implemented');
    }
}
