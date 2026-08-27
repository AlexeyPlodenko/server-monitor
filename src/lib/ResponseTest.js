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
        const options = {
            ...(this.#test.ip ? { ip: this.#test.ip } : {}),
            ...this.#test.options,
            ...this.#test.requestOptions,
        };
        const resp = new this.#test.request(this.#test.url, options);

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
