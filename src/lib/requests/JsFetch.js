import {d} from "../helpers.js";
import { request, fetch, Agent, setGlobalDispatcher } from 'undici';

export default class JsFetch {
    /**
     * @type {boolean}
     */
    #loaded = false;

    /**
     * @type {Response}
     */
    #response;

    /**
     * @type {string|null}
     */
    #responseText = null;

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
     * @param {string} url
     */
    constructor(url) {
        this.#url = url;
    }

    /**
     * @returns {string}
     */
    getUrl() {
        return this.#url;
    }

    /**
     * @returns {Promise<Response>}
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

// @TODO add max loading time
        }

        return this.#response;
    }

    /**
     * @returns {Promise<number>}
     */
    async getLoadTimeMs$() {
        await this.load$();
        return this.#endTime - this.#startTime;
    }

    /**
     * @returns {Promise<number>}
     */
    async getResponseStatusCode$() {
        const resp = await this.load$();
        return resp.statusCode || resp.status;
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
    async getResponseText$() {
        if (this.#responseText === null) {
            const resp = await this.load$();

            // Clone to keep the original response body intact for other potential uses
            if (resp.body) {
                this.#responseText = await resp.body.text();
            } else if (typeof resp.text === 'function') {
                this.#responseText = await resp.text();
            }
        }
        return this.#responseText;
    }
}
