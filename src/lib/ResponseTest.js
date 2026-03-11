import {d} from "./helpers.js";
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
                    `The test "${this.#test.name}" ${validator} has failed for the URL "${this.#test.url}".`
                );
            }
        }
    }
}
