export default class AbstractValidator {
    /**
     * @type {JsFetch}
     */
    #request;

    /**
     * @type {string}
     */
    #testName;

    /**
     * @type {string}
     */
    #testUrl;

    setTestName(name) {
        this.#testName = name;
    }

    getTestName() {
        return this.#testName;
    }

    setTestUrl(url) {
        this.#testUrl = url;
    }

    getTestUrl() {
        return this.#testUrl;
    }

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

    /**
     * @returns {Promise<string>}
     */
    async errorMessage$() {
        throw new Error('Not implemented!');
    }
}
