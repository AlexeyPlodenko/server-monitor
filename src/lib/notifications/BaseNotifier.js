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
     * @type {number}
     */
    #deduplicationTimeout;

    /**
     * @param {string} type
     * @param {Map<string, number>} sentMessages Shared map for deduplication
     * @param {number} deduplicationTimeout Deduplication timeout in milliseconds
     */
    constructor(type, sentMessages, deduplicationTimeout = 3600000) {
        this.#type = type;
        this.#sentMessages = sentMessages;
        this.#deduplicationTimeout = deduplicationTimeout;
    }

    /**
     * @param {any} target Identification for the notification destination (e.g. webhook URL or config object)
     * @returns {string}
     */
    #getTargetKey(target) {
        return typeof target === 'string' ? target : JSON.stringify(target);
    }

    /**
     * @param {*} target
     * @param {string} message
     */
    buffer(target, message) {
        const targetKey = this.#getTargetKey(target);
        const dedupeKey = `${this.#type}|${targetKey}|${message}`;
        const timestamp = Date.now();

        // 1. Deduplication logic (1-hour window per unique message)
        if (this.#sentMessages.has(dedupeKey)) {
            const lastSent = this.#sentMessages.get(dedupeKey);
            if (timestamp - lastSent < this.#deduplicationTimeout) {
                return;
            }
        }
        this.#sentMessages.set(dedupeKey, timestamp);

        // 2. Initialize the buffer if it doesn't exist
        if (!this.#buffers.has(targetKey)) {
            this.#buffers.set(targetKey, { messages: [], timer: null, target });
        }

        const buffer = this.#buffers.get(targetKey);
        buffer.messages.push(message);

        // 3. Debounce Logic:
        if (buffer.timer) {
            clearTimeout(buffer.timer);
        }

        buffer.timer = setTimeout(() => {
            this.flush$(targetKey);
        }, 5000);
    }

    /**
     * @param {string} targetKey
     * @returns {Promise<void>}
     */
    async flush$(targetKey) {
        const buffer = this.#buffers.get(targetKey);
        if (!buffer || buffer.messages.length === 0) return;

        const text = buffer.messages.join('\n');
        const target = buffer.target;

        // Clear buffer state BEFORE sending to prevent race conditions
        buffer.messages = [];
        if (buffer.timer) {
            clearTimeout(buffer.timer);
            buffer.timer = null;
        }

        try {
            await this.send$(target, text);
        } catch (err) {
            error(`Failed to send ${this.#type} notification: ${err.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async flushAll$() {
        const promises = [];
        for (const targetKey of this.#buffers.keys()) {
            promises.push(this.flush$(targetKey));
        }
        await Promise.all(promises);
    }

    /**
     * To be implemented by subclasses
     *
     * @param {any} target
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(target, text) {
        throw new Error('Method send$() must be implemented');
    }
}
