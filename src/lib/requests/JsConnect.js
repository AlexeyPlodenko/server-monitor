import http from 'node:http';
import https from 'node:https';

/**
 * JsConnect is a utility class for performing HTTP requests, focusing solely on the connection
 * and retrieval of response headers and status code, without consuming the response body.
 * This is useful for health checks or scenarios where only the availability and initial
 * response metadata of a service are required, rather than the full content.
 */
export default class JsConnect {
    #response;
    #url;
    #startTime = null;
    #endTime = null;

    // Timings breakdown
    #timings = {
        dnsLookup: null,
        tcpConnection: null,
        tlsHandshake: null,
        firstByte: null,
        total: null
    };

    /**
     * @returns {string}
     */
    getUrl() {
        return this.#url;
    }

    /**
     * @param {string} url
     */
    constructor(url) {
        this.#url = url;
    }

    /**
     * Initiates the HTTP request and waits for the response headers to be received.
     * This method does not consume the response body.
     * @returns {Promise<any>} A Promise that resolves with the mock Response object.
     */
    async load$() {
        if (!this.#response) {
            this.#startTime = Date.now();

            this.#response = await new Promise((resolve, reject) => {
                const urlObj = new URL(this.#url);
                const client = urlObj.protocol === 'https:' ? https : http;

                const req = client.request(this.#url, {
                    method: 'GET',
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
                    },
                    timeout: 30000,
                    agent: false
                });

                req.on('socket', (socket) => {
                    socket.on('lookup', () => {
                        this.#timings.dnsLookup = Date.now() - this.#startTime;
                    });
                    socket.on('connect', () => {
                        this.#timings.tcpConnection = Date.now() - this.#startTime - (this.#timings.dnsLookup || 0);
                    });
                    socket.on('secureConnect', () => {
                        this.#timings.tlsHandshake = Date.now() - this.#startTime - (this.#timings.dnsLookup || 0) - (this.#timings.tcpConnection || 0);
                    });
                });

                req.on('response', (res) => {
                    this.#endTime = Date.now();
                    this.#timings.firstByte = this.#endTime - this.#startTime - (this.#timings.dnsLookup || 0) - (this.#timings.tcpConnection || 0) - (this.#timings.tlsHandshake || 0);
                    this.#timings.total = this.#endTime - this.#startTime;

                    // We wrap the response to maintain compatibility
                    const wrappedResponse = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                    };

                    // Immediately destroy the stream since we don't care about the body in JsConnect
                    // This fixes potential memory leaks from unconsumed streams
                    res.destroy();

                    resolve(wrappedResponse);
                });

                req.on('error', (err) => {
                    reject(err);
                });

                req.on('timeout', () => {
                    req.destroy(new Error('Request timed out'));
                });

                req.end();
            });
        }

        return this.#response;
    }

    /**
     * @returns {Object|null}
     */
    getTimings() {
        return this.#timings;
    }

    /**
     * Returns the time taken to establish the connection and receive response headers in milliseconds.
     * @returns {Promise<number>} The load time in milliseconds.
     */
    async getLoadTimeMs$() {
        await this.load$();
        return this.#endTime - this.#startTime;
    }

    /**
     * Returns the HTTP status code of the response.
     * @returns {Promise<number>} The HTTP status code.
     */
    async getResponseStatusCode$() {
        const resp = await this.load$();
        return resp.statusCode;
    }

    /**
     * Returns the response headers as an object.
     * @returns {Promise<Object>} The response headers.
     */
    async getResponseHeaders$() {
        const resp = await this.load$();
        return resp.headers;
    }

    /**
     * This method is intentionally implemented to return an empty string, as JsConnect
     * does not consume the response body.
     * @returns {Promise<string>} An empty string.
     */
    async getResponseText$() {
        return "";
    }
}
