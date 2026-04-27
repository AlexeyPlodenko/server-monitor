import { IncomingWebhook } from '@slack/webhook';
import BaseNotifier from "./BaseNotifier.js";

export default class SlackNotifier extends BaseNotifier {
    /**
     * @type {Map<string, IncomingWebhook>}
     */
    #webhooks = new Map();

    constructor(sentMessages, deduplicationTimeout) {
        super('slack', sentMessages, deduplicationTimeout);
    }

    /**
     * @param {string} url
     * @returns {IncomingWebhook}
     */
    #getWebhook(url) {
        if (!this.#webhooks.has(url)) {
            this.#webhooks.set(url, new IncomingWebhook(url));
        }
        return this.#webhooks.get(url);
    }

    /**
     * @param {string} target Webhook URL
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(target, text) {
        await this.#getWebhook(target).send({ text });
    }
}
