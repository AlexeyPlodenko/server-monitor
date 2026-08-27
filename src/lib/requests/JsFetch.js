import {d} from "../helpers.js";
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export default class JsFetch {
    #response;
    #responseText = null;
    #url;
    #options = {};
    #ip = null;
    #startTime = null;
    #endTime = null;
    
    // Timings breakdown
    #timings = {
        dnsLookup: null,
        tcpConnection: null,
        tlsHandshake: null,
        firstByte: null,
        download: null,
        total: null
    };

    /**
     * @returns {string}
     */
    getUrl() {
        return this.#url;
    }

    /**
     * @returns {string|null}
     */
    getIp() {
        return this.#ip;
    }

    /**
     * @returns {Object}
     */
    getOptions() {
        return this.#options;
    }

    /**
     * @param {string} url
     * @param {Object|string} [options]
     */
    constructor(url, options = {}) {
        this.#url = url;
        if (typeof options === 'string') {
            this.#options = { ip: options };
            this.#ip = options;
        } else if (options && typeof options === 'object') {
            this.#options = { ...options };
            this.#ip = options.ip || null;
        }
    }

    /**
     * @returns {Promise<any>}
     */
    async load$() {
        if (!this.#response) {
            this.#startTime = Date.now();
            
            this.#response = await new Promise((resolve, reject) => {
                const urlObj = new URL(this.#url);
                const client = urlObj.protocol === 'https:' ? https : http;
                
                const requestOptions = {
                    method: 'GET',
                    headers: {
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                        ...(this.#options.headers || {})
                    },
                    timeout: this.#options.timeout || 30000,
                    agent: false
                };

                if (this.#ip) {
                    const ip = this.#ip;
                    requestOptions.lookup = (hostname, opts, callback) => {
                        const cb = typeof opts === 'function' ? opts : callback;
                        const lookupOpts = typeof opts === 'object' && opts !== null ? opts : {};
                        const family = net.isIP(ip) || 4;

                        setImmediate(() => {
                            if (lookupOpts.all) {
                                cb(null, [{ address: ip, family }]);
                            } else {
                                cb(null, ip, family);
                            }
                        });
                    };
                }

                const req = client.request(this.#url, requestOptions);

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
                    const firstByteTime = Date.now() - this.#startTime;
                    this.#timings.firstByte = firstByteTime - (this.#timings.dnsLookup || 0) - (this.#timings.tcpConnection || 0) - (this.#timings.tlsHandshake || 0);

                    // We wrap the response to maintain compatibility with the old interface
                    const wrappedResponse = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        // Provide a way to get the text, matching what getResponseText$ expects
                        text: () => {
                            return new Promise((resolveBody, rejectBody) => {
                                let body = '';
                                res.on('data', (chunk) => body += chunk);
                                res.on('end', () => {
                                    this.#endTime = Date.now();
                                    this.#timings.download = this.#endTime - this.#startTime - firstByteTime;
                                    this.#timings.total = this.#endTime - this.#startTime;
                                    resolveBody(body);
                                });
                                res.on('error', rejectBody);
                            });
                        }
                    };
                    
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
     * @returns {Promise<number>}
     */
    async getLoadTimeMs$() {
        // To get the full load time including body download, we MUST trigger body download if it hasn't happened.
        // But if someone just wants load time without body? JsFetch typically consumes body eventually for HasText.
        // For accurate total load time, we should await the text.
        await this.getResponseText$();
        return this.#endTime - this.#startTime;
    }

    /**
     * @returns {Promise<number>}
     */
    async getResponseStatusCode$() {
        const resp = await this.load$();
        return resp.statusCode;
    }

    /**
     * @returns {Promise<Object>}
     */
    async getResponseHeaders$() {
        const resp = await this.load$();
        return resp.headers;
    }

    /**
     * @returns {Promise<string>}
     */
    async getResponseMimeType$() {
        const headers = await this.getResponseHeaders$();
        const contentType = headers ? (headers['content-type'] || headers['Content-Type'] || '') : '';
        return contentType.split(';')[0].trim().toLowerCase();
    }

    /**
     * @returns {Promise<string>}
     */
    async getResponseText$() {
        if (this.#responseText === null) {
            const resp = await this.load$();
            this.#responseText = await resp.text();
        }
        return this.#responseText;
    }
}
