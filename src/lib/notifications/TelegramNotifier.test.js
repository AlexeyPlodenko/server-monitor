import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import TelegramNotifier from './TelegramNotifier.js';

describe('TelegramNotifier', () => {
    let server;
    let serverPort;
    let lastReceivedBody = null;
    let lastReceivedHeaders = null;
    let responseStatusCode = 200;
    let responseBodyText = '{"ok":true}';

    before(async () => {
        server = http.createServer((req, res) => {
            lastReceivedHeaders = req.headers;
            let body = '';
            req.on('data', (chunk) => body += chunk);
            req.on('end', () => {
                try {
                    lastReceivedBody = body ? JSON.parse(body) : null;
                } catch {
                    lastReceivedBody = body;
                }
                res.writeHead(responseStatusCode, { 'content-type': 'application/json' });
                res.end(responseBodyText);
            });
        });

        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        serverPort = server.address().port;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    beforeEach(() => {
        lastReceivedBody = null;
        lastReceivedHeaders = null;
        responseStatusCode = 200;
        responseBodyText = '{"ok":true}';
    });

    it('instantiates TelegramNotifier with custom sentMessages map', () => {
        const sentMessages = new Map();
        const notifier = new TelegramNotifier(sentMessages, 30000);
        assert.ok(notifier instanceof TelegramNotifier);
    });

    it('throws error when botToken or chatId is missing in config', async () => {
        const notifier = new TelegramNotifier(new Map(), 60000);
        await assert.rejects(
            async () => notifier.send$({ botToken: '' }, 'test message'),
            /Telegram configuration missing botToken or chatId/
        );
        await assert.rejects(
            async () => notifier.send$({ chatId: '123' }, 'test message'),
            /Telegram configuration missing botToken or chatId/
        );
    });

    it('sends telegram notification successfully via HTTP endpoint', async () => {
        const notifier = new TelegramNotifier(new Map(), 60000);
        const config = {
            botToken: 'test-token',
            chatId: '987654',
            baseUrl: `http://127.0.0.1:${serverPort}`
        };

        await notifier.send$(config, 'Hello Telegram');

        assert.equal(lastReceivedHeaders['content-type'], 'application/json');
        assert.deepEqual(lastReceivedBody, { chat_id: '987654', text: 'Hello Telegram' });
    });

    it('buffers and flushes messages using BaseNotifier functionality', async () => {
        const sentMessages = new Map();
        const notifier = new TelegramNotifier(sentMessages, 60000);
        const config = {
            botToken: 'buffer-token',
            chatId: '112233',
            baseUrl: `http://127.0.0.1:${serverPort}`
        };

        notifier.buffer(config, 'Telegram Line 1');
        notifier.buffer(config, 'Telegram Line 2');

        await notifier.flushAll$();

        assert.deepEqual(lastReceivedBody, { chat_id: '112233', text: 'Telegram Line 1\nTelegram Line 2' });
    });

    it('rejects when Telegram API returns non-200 status code', async () => {
        responseStatusCode = 400;
        responseBodyText = '{"ok":false,"description":"Bad Request: chat not found"}';

        const notifier = new TelegramNotifier(new Map(), 60000);
        const config = {
            botToken: 'tok',
            chatId: '123',
            baseUrl: `http://127.0.0.1:${serverPort}`
        };

        await assert.rejects(
            async () => notifier.send$(config, 'Err message'),
            /Telegram API returned 400: {"ok":false,"description":"Bad Request: chat not found"}/
        );
    });
});
