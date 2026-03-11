import AbstractValidator from "./AbstractValidator.js";

export default class IsStatusCode extends AbstractValidator {
    /**
     * @type {number}
     */
    expectedStatusCode;

    /**
     * @param {number} expectedStatusCode
     */
    constructor(expectedStatusCode) {
        super();

        this.expectedStatusCode = expectedStatusCode;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        return await this.request.getResponseStatusCode$() === this.expectedStatusCode;
    }
}
