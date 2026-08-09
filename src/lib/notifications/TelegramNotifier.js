import http from 'node:http';
import https from 'node:https';
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
        const { botToken, chatId, baseUrl } = config;
        if (!botToken || !chatId) {
            throw new Error('Telegram configuration missing botToken or chatId');
        }

        const endpoint = baseUrl ? `${baseUrl}/bot${botToken}/sendMessage` : `https://api.telegram.org/bot${botToken}/sendMessage`;
        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
        });

        return new Promise((resolve, reject) => {
            const urlObj = new URL(endpoint);
            const client = urlObj.protocol === 'https:' ? https : http;

            const req = client.request(endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'content-length': Buffer.byteLength(postData),
                },
            }, (res) => {
                let responseText = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    responseText += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Telegram API returned ${res.statusCode}: ${responseText}`));
                    } else {
                        resolve();
                    }
                });
                res.on('error', (err) => {
                    reject(err);
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.write(postData);
            req.end();
        });
    }
}

