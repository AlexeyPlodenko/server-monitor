import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import DiscordNotifier from './DiscordNotifier.js';

describe('DiscordNotifier', () => {
    let server;
    let serverPort;
    let lastReceivedBody = null;
    let lastReceivedHeaders = null;
    let responseStatusCode = 204;
    let responseBodyText = '';

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
        responseStatusCode = 204;
        responseBodyText = '';
    });

    it('instantiates DiscordNotifier with custom sentMessages map', () => {
        const sentMessages = new Map();
        const notifier = new DiscordNotifier(sentMessages, 30000);
        assert.ok(notifier instanceof DiscordNotifier);
    });

    it('sends notification message via Discord webhook URL endpoint', async () => {
        const sentMessages = new Map();
        const notifier = new DiscordNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/discord`;

        await notifier.send$(webhookUrl, 'Test Discord Message');

        assert.ok(lastReceivedBody);
        assert.equal(lastReceivedBody.content, 'Test Discord Message');
    });

    it('buffers and flushes messages using BaseNotifier functionality', async () => {
        const sentMessages = new Map();
        const notifier = new DiscordNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/discord-buffer`;

        notifier.buffer(webhookUrl, 'Line 1');
        notifier.buffer(webhookUrl, 'Line 2');

        await notifier.flushAll$();

        assert.ok(lastReceivedBody);
        assert.equal(lastReceivedBody.content, 'Line 1\nLine 2');
    });

    it('reuses Webhook instances for the same URL', async () => {
        const sentMessages = new Map();
        const notifier = new DiscordNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/reuse`;

        await notifier.send$(webhookUrl, 'First Message');
        assert.equal(lastReceivedBody.content, 'First Message');

        await notifier.send$(webhookUrl, 'Second Message');
        assert.equal(lastReceivedBody.content, 'Second Message');
    });

    it('handles errors when Webhook send fails', async () => {
        responseStatusCode = 500;
        responseBodyText = 'Internal Server Error';

        const sentMessages = new Map();
        const notifier = new DiscordNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/error`;

        await assert.rejects(
            async () => notifier.send$(webhookUrl, 'Failing message')
        );
    });
});
