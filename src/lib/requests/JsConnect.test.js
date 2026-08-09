import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, errors } from 'undici';
import JsConnect from './JsConnect.js';

describe('JsConnect', () => {
    let mockAgent;
    let originalDispatcher;

    beforeEach(() => {
        originalDispatcher = getGlobalDispatcher();
        mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);
    });

    afterEach(() => {
        setGlobalDispatcher(originalDispatcher);
    });

    it('connects to URL and extracts status code and headers without body text', async () => {
        const mockPool = mockAgent.get('https://example.com');
        mockPool.intercept({
            path: '/connect-test',
            method: 'GET'
        }).reply(204, '', {
            headers: { 'x-health-check': 'ok' }
        });

        const connector = new JsConnect('https://example.com/connect-test');
        assert.equal(connector.getUrl(), 'https://example.com/connect-test');

        const statusCode = await connector.getResponseStatusCode$();
        assert.equal(statusCode, 204);

        const text = await connector.getResponseText$();
        assert.equal(text, '');

        const headers = await connector.getResponseHeaders$();
        assert.equal(headers['x-health-check'], 'ok');

        const loadTime = await connector.getLoadTimeMs$();
        assert.ok(typeof loadTime === 'number');
        assert.ok(loadTime >= 0);
    });

    it('rejects on connection failure', async () => {
        const mockPool = mockAgent.get('https://example.com');
        mockPool.intercept({
            path: '/down',
            method: 'GET'
        }).replyWithError(new errors.SocketError('Host unreachable'));

        const connector = new JsConnect('https://example.com/down');
        await assert.rejects(async () => {
            await connector.load$();
        });
    });
});
