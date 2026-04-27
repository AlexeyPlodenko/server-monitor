import { request } from 'undici';
import BaseNotifier from "./BaseNotifier.js";
import {d} from "../helpers.js";

export default class TelegramNotifier extends BaseNotifier {
    constructor(sentMessages, deduplicationTimeout) {
        super('telegram', sentMessages, deduplicationTimeout);
    }

    /**
     * @param {{botToken: string, chatId: string}} config
     * @param {string} text
     * @returns {Promise<void>}
     */
    async send$(config, text) {
        const { botToken, chatId } = config;
        if (!botToken || !chatId) {
            throw new Error('Telegram configuration missing botToken or chatId');
        }

        const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
// d(endpoint, {
//     method: 'POST',
//     headers: {
//         'content-type': 'application/json',
//     },
//     body: JSON.stringify({
//         chat_id: chatId,
//         text: text,
//     }),
// });
        const { statusCode, body } = await request(endpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (statusCode !== 200) {
            const responseText = await body.text();
            throw new Error(`Telegram API returned ${statusCode}: ${responseText}`);
        }

        // Consume the body to free up the connection
        await body.dump();
    }
}
