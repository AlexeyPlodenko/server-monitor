import {d} from "../helpers.js";

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
     * @returns {Promise<Response>}
     */
    async load$() {
        if (!this.#response) {
            this.#startTime = Date.now();
            this.#response = await fetch(this.#url, { redirect: 'manual' });
            this.#endTime = Date.now();
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
        return resp.status;
    }

    /**
     * @returns {Promise<string>}
     */
    async getResponseText$() {
        if (this.#responseText === null) {
            const resp = await this.load$();

            // Clone to keep the original response body intact for other potential uses
            this.#responseText = await resp.clone().text();
        }
        return this.#responseText;
    }
}
