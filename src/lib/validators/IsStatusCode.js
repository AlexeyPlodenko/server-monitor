import AbstractValidator from "./AbstractValidator.js";

export default class IsStatusCode extends AbstractValidator {
    /**
     * @type {number[]}
     */
    expectedStatusCode;

    /**
     * @param {number|number[]} expectedStatusCode
     */
    constructor(expectedStatusCode) {
        super();

        this.expectedStatusCode = Array.isArray(expectedStatusCode) ? expectedStatusCode : [expectedStatusCode];
    }

    /**
     * @returns {Promise<number>}
     */
    async getValue$() {
        return this.getRequest().getResponseStatusCode$();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const statusCode = await this.getValue$();
        return this.expectedStatusCode.includes(statusCode);
    }

    async errorMessage$() {
        const statusCode = await this.getValue$();
        return `Invalid HTTP response status code. Expected: ${this.expectedStatusCode.join(', ')}. Got: ${statusCode}.`;
    }
}
