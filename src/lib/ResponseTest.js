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
                const validatorStr = prettyPrintObject(validator);

                let invalidRes = String(await validator.getValue$());
                if (invalidRes.length > 30) {
                    invalidRes = invalidRes.slice(0, 27) + '...';
                }

                throw new ValidationFailed(
                    `The test "${this.#test.name} ${validatorStr}" has failed for the URL "${this.#test.url}". Got "${invalidRes}".`
                );
            }
        }
    }
}
