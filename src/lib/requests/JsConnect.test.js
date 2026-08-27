import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import JsConnect from './JsConnect.js';

describe('JsConnect', () => {
    let server;
    let baseUrl;

    before(async () => {
        server = http.createServer((req, res) => {
            if (req.url === '/connect-test') {
                res.writeHead(204, { 'x-health-check': 'ok' });
                res.end();
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    it('connects to URL and extracts status code and headers without body text', async () => {
        const connector = new JsConnect(`${baseUrl}/connect-test`);
        assert.equal(connector.getUrl(), `${baseUrl}/connect-test`);

        const statusCode = await connector.getResponseStatusCode$();
        assert.equal(statusCode, 204);

        const text = await connector.getResponseText$();
        assert.equal(text, '');

        const headers = await connector.getResponseHeaders$();
        assert.equal(headers['x-health-check'], 'ok');

        const mimeType = await connector.getResponseMimeType$();
        assert.equal(mimeType, '');

        const loadTime = await connector.getLoadTimeMs$();
        assert.ok(typeof loadTime === 'number');
        assert.ok(loadTime >= 0);

        const timings = connector.getTimings();
        assert.ok(timings !== null);
        assert.ok(typeof timings.total === 'number');
    });

    it('connects using custom IP to resolve a domain', async () => {
        const port = server.address().port;
        // Hostname does not exist in DNS, but custom IP resolves to 127.0.0.1
        const customUrl = `http://custom-proxy-host.test:${port}/connect-test`;
        const connector = new JsConnect(customUrl, { ip: '127.0.0.1' });

        assert.equal(connector.getIp(), '127.0.0.1');
        assert.deepEqual(connector.getOptions(), { ip: '127.0.0.1' });

        const statusCode = await connector.getResponseStatusCode$();
        assert.equal(statusCode, 204);

        const timings = connector.getTimings();
        assert.ok(typeof timings.total === 'number');
    });

    it('supports string IP passed as options', async () => {
        const connector = new JsConnect('http://example.com', '127.0.0.1');
        assert.equal(connector.getIp(), '127.0.0.1');
        assert.deepEqual(connector.getOptions(), { ip: '127.0.0.1' });
    });

    it('rejects on connection failure', async () => {
        const connector = new JsConnect('http://127.0.0.1:59999/down');
        await assert.rejects(async () => {
            await connector.load$();
        });
    });
});
