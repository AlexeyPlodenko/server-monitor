import { Webhook } from 'discord-webhook-node';
import BaseNotifier from "./BaseNotifier.js";

export default class DiscordNotifier extends BaseNotifier {
    /**
     * @type {Map<string, Webhook>}
     */
    #webhooks = new Map();

    constructor(sentMessages) {
        super('discord', sentMessages);
    }

    /**
     * @param {string} url
     * @returns {Webhook}
     */
    #getWebhook(url) {
        if (!this.#webhooks.has(url)) {
            this.#webhooks.set(url, new Webhook(url));
        }
        return this.#webhooks.get(url);
    }

    /**
     * @param {string} url
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(url, text) {
        await this.#getWebhook(url).send(text);
    }
}
