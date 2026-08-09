import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import SlackNotifier from './SlackNotifier.js';

describe('SlackNotifier', () => {
    let server;
    let serverPort;
    let lastReceivedBody = null;
    let lastReceivedHeaders = null;
    let responseStatusCode = 200;
    let responseBodyText = 'ok';

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
                res.writeHead(responseStatusCode, { 'content-type': 'text/plain' });
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
        responseBodyText = 'ok';
    });

    it('instantiates SlackNotifier with custom sentMessages map', () => {
        const sentMessages = new Map();
        const notifier = new SlackNotifier(sentMessages, 30000);
        assert.ok(notifier instanceof SlackNotifier);
    });

    it('sends notification message via Slack webhook URL endpoint', async () => {
        const sentMessages = new Map();
        const notifier = new SlackNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/slack`;

        await notifier.send$(webhookUrl, 'Test Slack Message');

        assert.ok(lastReceivedBody);
        assert.equal(lastReceivedBody.text, 'Test Slack Message');
    });

    it('buffers and flushes messages using BaseNotifier functionality', async () => {
        const sentMessages = new Map();
        const notifier = new SlackNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/slack-buffer`;

        notifier.buffer(webhookUrl, 'Slack Line 1');
        notifier.buffer(webhookUrl, 'Slack Line 2');

        await notifier.flushAll$();

        assert.ok(lastReceivedBody);
        assert.equal(lastReceivedBody.text, 'Slack Line 1\nSlack Line 2');
    });

    it('reuses IncomingWebhook instances for the same URL target', async () => {
        const sentMessages = new Map();
        const notifier = new SlackNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/slack-reuse`;

        await notifier.send$(webhookUrl, 'First Message');
        assert.equal(lastReceivedBody.text, 'First Message');

        await notifier.send$(webhookUrl, 'Second Message');
        assert.equal(lastReceivedBody.text, 'Second Message');
    });

    it('handles errors when Slack webhook send fails', async () => {
        responseStatusCode = 500;
        responseBodyText = 'invalid_payload';

        const sentMessages = new Map();
        const notifier = new SlackNotifier(sentMessages, 60000);
        const webhookUrl = `http://127.0.0.1:${serverPort}/webhook/slack-error`;

        await assert.rejects(
            async () => notifier.send$(webhookUrl, 'Failing slack message')
        );
    });
});
