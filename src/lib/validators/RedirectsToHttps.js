import AbstractValidator from "./AbstractValidator.js";
import {d} from "../helpers.js";

export default class RedirectsToHttps extends AbstractValidator {
    /**
     * @type {number[]}
     */
    #expectedStatusCodes;

    #errorMessage;

    /**
     * @param {number[]} expectedStatusCodes
     */
    constructor(expectedStatusCodes = [301]) {
        super();

        this.#expectedStatusCodes = expectedStatusCodes;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const url = this.getRequest().getUrl();

        if (url.startsWith('https://')) {
            return true;
        }

        if (url.startsWith('http://')) {
            const statusCode = await this.getRequest().getResponseStatusCode$();
            const headers = await this.getRequest().getResponseHeaders$();

            const isRedirect = this.#expectedStatusCodes.includes(statusCode);
            if (!isRedirect) {
                this.#errorMessage = `Invalid HTTP response status code. Expected: ${this.#expectedStatusCodes.join(', ')}. Got: ${statusCode}.`;
                return false;
            }

            const location = (headers.location || '').toString();
            if (!location.startsWith('https://')) {
                this.#errorMessage = `Invalid HTTP redirect location. Expected to redirect to HTTPS. But got: ${location}.`;
                return false;
            }

            return true;
        }

        this.#errorMessage = `Malformed URL. Expected to start with 'http://' or 'https://'. Got: ${url}.`;
        return false;
    }

    async errorMessage$() {
        return this.#errorMessage;
    }
}
