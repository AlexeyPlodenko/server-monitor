export default class AbstractValidator {
    /**
     * @type {JsFetch}
     */
    #request;

    /**
     * @param {JsFetch} request
     * @returns {AbstractValidator}
     */
    setRequest(request) {
        this.#request = request;

        return this;
    }

    /**
     * @returns {JsFetch}
     */
    getRequest() {
        return this.#request;
    }

    /**
     * @returns {Promise<*>}
     */
    async getValue$() {
        throw new Error('Not implemented!');
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        throw new Error('Not implemented!');
    }
}
