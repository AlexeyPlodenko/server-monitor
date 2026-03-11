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
     * @returns {Promise<string>}
     */
    async getValue$() {
        return this.getRequest().getResponseText$();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const text = await this.getValue$();
        return text.includes(this.expectedText);
    }
}
