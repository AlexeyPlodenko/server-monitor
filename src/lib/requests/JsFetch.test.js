import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import JsFetch from './JsFetch.js';

describe('JsFetch', () => {
    let server;
    let baseUrl;

    before(async () => {
        server = http.createServer((req, res) => {
            if (req.url === '/test') {
                res.writeHead(200, { 'content-type': 'text/plain' });
                res.end('Hello World');
            } else if (req.url === '/error') {
                res.writeHead(500, { 'content-type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    it('loads URL and extracts status code, headers, and body text', async () => {
        const fetcher = new JsFetch(`${baseUrl}/test`);
        assert.equal(fetcher.getUrl(), `${baseUrl}/test`);

        const statusCode = await fetcher.getResponseStatusCode$();
        assert.equal(statusCode, 200);

        const text = await fetcher.getResponseText$();
        assert.equal(text, 'Hello World');

        const headers = await fetcher.getResponseHeaders$();
        assert.equal(headers['content-type'], 'text/plain');

        const loadTime = await fetcher.getLoadTimeMs$();
        assert.ok(typeof loadTime === 'number');
        assert.ok(loadTime >= 0);

        const timings = fetcher.getTimings();
        assert.ok(timings !== null);
        assert.ok(typeof timings.total === 'number');
    });

    it('handles 500 Internal Server Error without crashing', async () => {
        const fetcher = new JsFetch(`${baseUrl}/error`);
        assert.equal(await fetcher.getResponseStatusCode$(), 500);
        assert.equal(await fetcher.getResponseText$(), 'Internal Server Error');
    });

    it('rejects on network connection failure', async () => {
        const fetcher = new JsFetch('http://127.0.0.1:59999/failed');
        await assert.rejects(async () => {
            await fetcher.load$();
        });
    });
});
