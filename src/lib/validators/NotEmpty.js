import AbstractValidator from "./AbstractValidator.js";

export default class NotEmpty extends AbstractValidator {
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
        return text !== '';
    }

    async errorMessage$() {
        return 'Body is empty.';
    }
}
