import AbstractValidator from "./AbstractValidator.js";

export default class HasMimeType extends AbstractValidator {
    /**
     * @type {string[]}
     */
    expectedMimeTypes;

    /**
     * @param {string|string[]} expectedMimeType
     */
    constructor(expectedMimeType) {
        super();

        const types = Array.isArray(expectedMimeType) ? expectedMimeType : [expectedMimeType];
        this.expectedMimeTypes = types.map(t => this.#normalizeMimeType(t));
    }

    /**
     * Normalizes a MIME type string (lowercased, stripped of parameters).
     *
     * @param {string} mimeType
     * @returns {string}
     */
    #normalizeMimeType(mimeType) {
        if (!mimeType || typeof mimeType !== 'string') {
            return '';
        }
        return mimeType.split(';')[0].trim().toLowerCase();
    }

    /**
     * @returns {Promise<string>}
     */
    async getValue$() {
        const req = this.getRequest();
        if (req && typeof req.getResponseMimeType$ === 'function') {
            return await req.getResponseMimeType$();
        }

        const headers = req && typeof req.getResponseHeaders$ === 'function' ? await req.getResponseHeaders$() : null;
        const contentType = headers ? (headers['content-type'] || headers['Content-Type'] || '') : '';
        return this.#normalizeMimeType(contentType);
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const actualMimeType = await this.getValue$();
        if (!actualMimeType) {
            return false;
        }

        return this.expectedMimeTypes.some(expected => {
            if (expected.includes('*')) {
                const pattern = '^' + expected.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
                return new RegExp(pattern).test(actualMimeType);
            }
            return expected === actualMimeType;
        });
    }

    /**
     * @returns {Promise<string>}
     */
    async errorMessage$() {
        const actualMimeType = await this.getValue$();
        return `Invalid HTTP response MIME type. Expected: ${this.expectedMimeTypes.join(', ')}. Got: ${actualMimeType || 'none'}.`;
    }
}
