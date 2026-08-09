import AbstractValidator from "./AbstractValidator.js";

export default class HasBaseUrl extends AbstractValidator {
    /**
     * @type {string[]}
     */
    #rawExpectedUrls;

    /**
     * @type {string}
     */
    #errorMessage = '';

    /**
     * @param {string|string[]} expectedBaseUrl
     */
    constructor(expectedBaseUrl) {
        super();

        this.#rawExpectedUrls = Array.isArray(expectedBaseUrl) ? expectedBaseUrl : [expectedBaseUrl];
    }

    /**
     * Parses a URL string into its lowercase base URL (origin).
     * Returns null if the URL string is invalid or cannot be parsed into an origin.
     *
     * @param {string} urlStr
     * @param {string} [context]
     * @returns {string|null}
     */
    #parseOrigin(urlStr, context) {
        if (!urlStr || typeof urlStr !== 'string') {
            return null;
        }
        try {
            const parsed = context ? new URL(urlStr, context) : new URL(urlStr);
            if (!parsed.origin || parsed.origin === 'null') {
                return null;
            }
            return parsed.origin.toLowerCase();
        } catch {
            return null;
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const parsedExpected = [];
        for (const rawUrl of this.#rawExpectedUrls) {
            const origin = this.#parseOrigin(rawUrl);
            if (!origin) {
                this.#errorMessage = `Invalid expected base URL: "${rawUrl}".`;
                return false;
            }
            parsedExpected.push(origin);
        }

        const requestUrl = this.getRequest().getUrl();
        const headers = await this.getRequest().getResponseHeaders$();
        const location = headers && headers.location ? headers.location.toString() : null;

        const targetUrl = location ? location : requestUrl;
        const actualBaseUrl = this.#parseOrigin(targetUrl, requestUrl);

        if (!actualBaseUrl) {
            this.#errorMessage = `Invalid target URL: "${targetUrl}".`;
            return false;
        }

        if (parsedExpected.includes(actualBaseUrl)) {
            return true;
        }

        this.#errorMessage = `Invalid base URL. Expected: ${parsedExpected.join(', ')}. Got: ${actualBaseUrl}.`;
        return false;
    }

    /**
     * @returns {Promise<string>}
     */
    async errorMessage$() {
        return this.#errorMessage;
    }
}
