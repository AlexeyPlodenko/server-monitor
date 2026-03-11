import AbstractValidator from "./AbstractValidator.js";
import {d} from "../helpers.js";

export default class HasLoadedWithinMs extends AbstractValidator {
    /**
     * @type {number}
     */
    expectedLoadTimeMs;

    /**
     * @param {number} expectedLoadTimeMs
     */
    constructor(expectedLoadTimeMs) {
        super();

        this.expectedLoadTimeMs = expectedLoadTimeMs;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        return await this.request.getLoadTimeMs$() < this.expectedLoadTimeMs;
    }
}
