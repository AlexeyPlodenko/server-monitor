import { request } from 'undici';

/**
 * JsConnect is a utility class for performing HTTP requests, focusing solely on the connection
 * and retrieval of response headers and status code, without consuming the response body.
 * This is useful for health checks or scenarios where only the availability and initial
 * response metadata of a service are required, rather than the full content.
 */
export default class JsConnect {
    /**
     * @type {Response}
     */
    #response;

    /**
     * @type {string}
     */
    #url;

    /**
     * @type {number|null}
     */
    #startTime = null;

    /**
     * @type {number|null}
     */
    #endTime = null;

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
     * The response body is not consumed by this method.
     * @returns {Promise<Response>} A Promise that resolves with the undici Response object.
     */
    async load$() {
        if (!this.#response) {
            this.#startTime = Date.now();

            this.#response = await request(this.#url, {
                method: 'GET',
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
                }
            });

            this.#endTime = Date.now();
        }

        return this.#response;
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
