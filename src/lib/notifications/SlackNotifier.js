import { IncomingWebhook } from '@slack/webhook';
import BaseNotifier from "./BaseNotifier.js";

export default class SlackNotifier extends BaseNotifier {
    /**
     * @type {Map<string, IncomingWebhook>}
     */
    #webhooks = new Map();

    constructor(sentMessages) {
        super('slack', sentMessages);
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
     * @param {string} url
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(url, text) {
        await this.#getWebhook(url).send({ text });
    }
}
