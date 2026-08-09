import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, errors } from 'undici';
import JsFetch from './JsFetch.js';

describe('JsFetch', () => {
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

    it('loads URL and extracts status code, headers, and body text', async () => {
        const mockPool = mockAgent.get('https://example.com');
        mockPool.intercept({
            path: '/test',
            method: 'GET'
        }).reply(200, 'Hello World', {
            headers: { 'content-type': 'text/plain' }
        });

        const fetcher = new JsFetch('https://example.com/test');
        assert.equal(fetcher.getUrl(), 'https://example.com/test');

        const statusCode = await fetcher.getResponseStatusCode$();
        assert.equal(statusCode, 200);

        const text = await fetcher.getResponseText$();
        assert.equal(text, 'Hello World');

        const headers = await fetcher.getResponseHeaders$();
        assert.equal(headers['content-type'], 'text/plain');

        const loadTime = await fetcher.getLoadTimeMs$();
        assert.ok(typeof loadTime === 'number');
        assert.ok(loadTime >= 0);
    });

    it('handles 500 Internal Server Error without crashing', async () => {
        const mockPool = mockAgent.get('https://example.com');
        mockPool.intercept({
            path: '/error',
            method: 'GET'
        }).reply(500, 'Internal Server Error');

        const fetcher = new JsFetch('https://example.com/error');
        assert.equal(await fetcher.getResponseStatusCode$(), 500);
        assert.equal(await fetcher.getResponseText$(), 'Internal Server Error');
    });

    it('rejects on network connection failure', async () => {
        const mockPool = mockAgent.get('https://example.com');
        mockPool.intercept({
            path: '/failed',
            method: 'GET'
        }).replyWithError(new errors.SocketError('Connection failed'));

        const fetcher = new JsFetch('https://example.com/failed');
        await assert.rejects(async () => {
            await fetcher.load$();
        });
    });
});
