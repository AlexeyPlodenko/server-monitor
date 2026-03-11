import AbstractValidator from "./AbstractValidator.js";

export default class HasText extends AbstractValidator {
    /**
     * @type {string}
     */
    expectedText;

    /**
     * @param {string} expectedText
     */
    constructor(expectedText) {
        super();

        this.expectedText = expectedText;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        return (await this.request.getResponseText$()).includes(this.expectedText);
    }
}
