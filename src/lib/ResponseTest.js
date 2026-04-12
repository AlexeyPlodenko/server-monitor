import {d, prettyPrintObject} from "./helpers.js";
import ValidationFailed from "./errors/ValidationFailed.js";

export default class ResponseTest {
    /**
     * @type {Test}
     */
    #test;

    constructor(test) {
        this.#test = test;
    }

    /**
     * @throws {ValidationFailed}
     * @returns {Promise<void>}
     */
    async execute$() {
        const resp = new this.#test.request(this.#test.url);

        for (const validator of this.#test.validators) {
            validator.setRequest(resp);

            if (!await validator.isValid$()) {
                throw new ValidationFailed(
                    `Test "${this.#test.name}" failed for the URL "${this.#test.url}". ${await validator.errorMessage$()}`
                );
            }
        }
    }
}
