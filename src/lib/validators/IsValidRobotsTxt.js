import AbstractValidator from "./AbstractValidator.js";

export default class IsValidRobotsTxt extends AbstractValidator {
    /**
     * @type {string}
     */
    #errorMessage = '';

    /**
     * @type {{allowEmpty: boolean, requireUserAgent: boolean, requireSitemap: boolean}}
     */
    #options;

    /**
     * @param {Object} [options]
     * @param {boolean} [options.allowEmpty=false]
     * @param {boolean} [options.requireUserAgent=false]
     * @param {boolean} [options.requireSitemap=false]
     */
    constructor(options = {}) {
        super();
        this.#options = {
            allowEmpty: options.allowEmpty ?? false,
            requireUserAgent: options.requireUserAgent ?? false,
            requireSitemap: options.requireSitemap ?? false,
        };
    }

    /**
     * Validates robots.txt content syntax and record block structure.
     * @param {string} robotsText
     * @param {Object} [options]
     * @returns {{ valid: boolean, error?: string }}
     */
    static parseRobotsTxt(robotsText, options = {}) {
        if (typeof robotsText !== 'string') {
            return { valid: false, error: 'Robots.txt content is not a string.' };
        }

        const trimmed = robotsText.trim();
        const allowEmpty = options.allowEmpty ?? false;
        const requireUserAgent = options.requireUserAgent ?? false;
        const requireSitemap = options.requireSitemap ?? false;

        if (trimmed.length === 0) {
            if (allowEmpty) {
                return { valid: true };
            }
            return { valid: false, error: 'Robots.txt content is empty.' };
        }

        // Detect HTML response (e.g. 404 page returned with 200 OK)
        if (/^\s*<(?:!DOCTYPE|html|head|body|div)/i.test(trimmed) || /<\/(?:html|head|body)>/i.test(trimmed)) {
            return { valid: false, error: 'Invalid robots.txt: Content appears to be HTML rather than plain text.' };
        }

        const lines = robotsText.split(/\r?\n/);
        let currentUserAgent = null;
        let hasUserAgent = false;
        let hasSitemap = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const commentIdx = line.indexOf('#');
            if (commentIdx !== -1) {
                line = line.slice(0, commentIdx);
            }
            line = line.trim();

            if (line.length === 0) {
                currentUserAgent = null;
                continue;
            }

            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) {
                return { valid: false, error: `Invalid robots.txt: Line ${i + 1} "${line}" missing key-value colon separator.` };
            }

            const key = line.slice(0, colonIdx).trim().toLowerCase();
            const val = line.slice(colonIdx + 1).trim();

            if (!/^[a-z0-9_-]+$/i.test(key)) {
                return { valid: false, error: `Invalid robots.txt: Line ${i + 1} contains malformed directive name "${key}".` };
            }

            switch (key) {
                case 'user-agent':
                    if (val.length === 0) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} "User-agent" directive must specify a robot name or wildcard "*".` };
                    }
                    currentUserAgent = val;
                    hasUserAgent = true;
                    break;

                case 'disallow':
                case 'allow':
                    if (currentUserAgent === null) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} "${line.slice(0, colonIdx).trim()}" directive without preceding User-agent.` };
                    }
                    break;

                case 'crawl-delay':
                    if (currentUserAgent === null) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} "Crawl-delay" directive without preceding User-agent.` };
                    }
                    if (!/^\d+(\.\d+)?$/.test(val)) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} Crawl-delay value "${val}" must be a non-negative number.` };
                    }
                    break;

                case 'sitemap':
                    if (val.length === 0 || !/^https?:\/\//i.test(val)) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} Sitemap directive "${val}" must be a valid absolute HTTP/HTTPS URL.` };
                    }
                    hasSitemap = true;
                    break;

                case 'host':
                    if (val.length === 0) {
                        return { valid: false, error: `Invalid robots.txt: Line ${i + 1} "Host" directive missing host value.` };
                    }
                    break;

                default:
                    // Custom or unknown directives (e.g. clean-param) are allowed if format key: value is valid
                    break;
            }
        }

        if (requireUserAgent && !hasUserAgent) {
            return { valid: false, error: 'Invalid robots.txt: Missing required User-agent directive.' };
        }

        if (requireSitemap && !hasSitemap) {
            return { valid: false, error: 'Invalid robots.txt: Missing required Sitemap directive.' };
        }

        return { valid: true };
    }

    /**
     * @returns {Promise<string>}
     */
    async getValue$() {
        return this.getRequest().getResponseText$();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const text = await this.getValue$();
        const result = IsValidRobotsTxt.parseRobotsTxt(text, this.#options);
        if (!result.valid) {
            this.#errorMessage = result.error || 'Invalid robots.txt format.';
            return false;
        }
        return true;
    }

    /**
     * @returns {Promise<string>}
     */
    async errorMessage$() {
        return this.#errorMessage;
    }
}
