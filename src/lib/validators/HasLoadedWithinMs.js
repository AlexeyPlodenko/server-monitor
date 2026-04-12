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
     * @returns {Promise<number>}
     */
    async getValue$() {
        return this.getRequest().getLoadTimeMs$();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const loadedMs = await this.getValue$();
        return loadedMs < this.expectedLoadTimeMs;
    }

    async errorMessage$() {
        const loadedMs = await this.getValue$();
        return `Failed to load within ${this.expectedLoadTimeMs}ms. Loaded in ${loadedMs}ms.`
    }
}
