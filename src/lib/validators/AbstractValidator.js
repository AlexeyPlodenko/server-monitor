export default class AbstractValidator {
    /**
     * @type {JsFetch}
     */
    request;

    /**
     * @param {JsFetch} request
     * @returns {AbstractValidator}
     */
    setRequest(request) {
        this.request = request;

        return this;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        throw new Error('Not implemented!');
    }
}
