import AbstractValidator from "./AbstractValidator.js";
import {d} from "../helpers.js";

export default class RedirectsToHttps extends AbstractValidator {
    /**
     * @type {number[]}
     */
    #expectedStatusCodes;

    /**
     * @param {number[]} expectedStatusCodes
     */
    constructor(expectedStatusCodes = [301, 302, 307, 308]) {
        super();

        this.#expectedStatusCodes = expectedStatusCodes;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const statusCode = await this.getRequest().getResponseStatusCode$();
        const headers = await this.getRequest().getResponseHeaders$();
        const url = this.getRequest().getUrl();

        if (url.startsWith('http://')) {
            const isRedirect = this.#expectedStatusCodes.includes(statusCode);
            const location = (headers.location || '').toString();
            return isRedirect && location.startsWith('https://');
        }

        if (url.startsWith('https://')) {
            return !!headers['strict-transport-security'];
        }

        return false;
    }
}
