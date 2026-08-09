import AbstractValidator from "./AbstractValidator.js";

export default class IsValidWebmanifest extends AbstractValidator {
    /**
     * @type {string}
     */
    #errorMessage = '';

    /**
     * @type {{allowEmpty: boolean, requireName: boolean, requireShortName: boolean, requireStartUrl: boolean, requireIcons: boolean}}
     */
    #options;

    /**
     * @param {Object} [options]
     * @param {boolean} [options.allowEmpty=false]
     * @param {boolean} [options.requireName=false]
     * @param {boolean} [options.requireShortName=false]
     * @param {boolean} [options.requireStartUrl=false]
     * @param {boolean} [options.requireIcons=false]
     */
    constructor(options = {}) {
        super();
        this.#options = {
            allowEmpty: options.allowEmpty ?? false,
            requireName: options.requireName ?? false,
            requireShortName: options.requireShortName ?? false,
            requireStartUrl: options.requireStartUrl ?? false,
            requireIcons: options.requireIcons ?? false,
        };
    }

    /**
     * Validates site.webmanifest JSON content structure.
     * @param {string} manifestText
     * @param {Object} [options]
     * @returns {{ valid: boolean, error?: string }}
     */
    static parseWebmanifest(manifestText, options = {}) {
        if (typeof manifestText !== 'string') {
            return { valid: false, error: 'Webmanifest content is not a string.' };
        }

        const trimmed = manifestText.trim();
        const allowEmpty = options.allowEmpty ?? false;
        const requireName = options.requireName ?? false;
        const requireShortName = options.requireShortName ?? false;
        const requireStartUrl = options.requireStartUrl ?? false;
        const requireIcons = options.requireIcons ?? false;

        if (trimmed.length === 0) {
            if (allowEmpty) {
                return { valid: true };
            }
            return { valid: false, error: 'Webmanifest content is empty.' };
        }

        // Detect HTML response (e.g. 404/500 page returned with HTML body)
        if (/^\s*<(?:!DOCTYPE|html|head|body|div)/i.test(trimmed) || /<\/(?:html|head|body)>/i.test(trimmed)) {
            return { valid: false, error: 'Invalid site.webmanifest: Content appears to be HTML rather than JSON.' };
        }

        let data;
        try {
            data = JSON.parse(trimmed);
        } catch (e) {
            return { valid: false, error: `Invalid site.webmanifest: Content is not valid JSON (${e.message}).` };
        }

        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            return { valid: false, error: 'Invalid site.webmanifest: Root JSON value must be an object.' };
        }

        // Check required fields when requested via options
        if (requireName && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
            return { valid: false, error: 'Invalid site.webmanifest: Missing or empty required "name" property.' };
        }

        if (requireShortName && (typeof data.short_name !== 'string' || data.short_name.trim().length === 0)) {
            return { valid: false, error: 'Invalid site.webmanifest: Missing or empty required "short_name" property.' };
        }

        if (requireStartUrl && (typeof data.start_url !== 'string' || data.start_url.trim().length === 0)) {
            return { valid: false, error: 'Invalid site.webmanifest: Missing or empty required "start_url" property.' };
        }

        if (requireIcons && (!Array.isArray(data.icons) || data.icons.length === 0)) {
            return { valid: false, error: 'Invalid site.webmanifest: Missing or empty required "icons" array.' };
        }

        // Validate types for optional standard fields if present
        const stringFields = [
            'name',
            'short_name',
            'description',
            'start_url',
            'display',
            'orientation',
            'dir',
            'lang',
            'theme_color',
            'background_color',
            'scope',
            'id',
        ];

        for (const field of stringFields) {
            if (data[field] !== undefined && typeof data[field] !== 'string') {
                return { valid: false, error: `Invalid site.webmanifest: Property "${field}" must be a string.` };
            }
        }

        if (data.icons !== undefined) {
            if (!Array.isArray(data.icons)) {
                return { valid: false, error: 'Invalid site.webmanifest: Property "icons" must be an array.' };
            }
            for (let i = 0; i < data.icons.length; i++) {
                const icon = data.icons[i];
                if (typeof icon !== 'object' || icon === null || Array.isArray(icon)) {
                    return { valid: false, error: `Invalid site.webmanifest: Icon at index ${i} must be an object.` };
                }
                if (typeof icon.src !== 'string' || icon.src.trim().length === 0) {
                    return { valid: false, error: `Invalid site.webmanifest: Icon at index ${i} must have a non-empty "src" string.` };
                }
                if (icon.sizes !== undefined && typeof icon.sizes !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Icon at index ${i} "sizes" must be a string.` };
                }
                if (icon.type !== undefined && typeof icon.type !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Icon at index ${i} "type" must be a string.` };
                }
                if (icon.purpose !== undefined && typeof icon.purpose !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Icon at index ${i} "purpose" must be a string.` };
                }
            }
        }

        if (data.screenshots !== undefined) {
            if (!Array.isArray(data.screenshots)) {
                return { valid: false, error: 'Invalid site.webmanifest: Property "screenshots" must be an array.' };
            }
            for (let i = 0; i < data.screenshots.length; i++) {
                const screenshot = data.screenshots[i];
                if (typeof screenshot !== 'object' || screenshot === null || Array.isArray(screenshot)) {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} must be an object.` };
                }
                if (typeof screenshot.src !== 'string' || screenshot.src.trim().length === 0) {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} must have a non-empty "src" string.` };
                }
                if (screenshot.sizes !== undefined && typeof screenshot.sizes !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} "sizes" must be a string.` };
                }
                if (screenshot.type !== undefined && typeof screenshot.type !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} "type" must be a string.` };
                }
                if (screenshot.form_factor !== undefined && typeof screenshot.form_factor !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} "form_factor" must be a string.` };
                }
                if (screenshot.label !== undefined && typeof screenshot.label !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Screenshot at index ${i} "label" must be a string.` };
                }
            }
        }

        if (data.shortcuts !== undefined) {
            if (!Array.isArray(data.shortcuts)) {
                return { valid: false, error: 'Invalid site.webmanifest: Property "shortcuts" must be an array.' };
            }
            for (let i = 0; i < data.shortcuts.length; i++) {
                const shortcut = data.shortcuts[i];
                if (typeof shortcut !== 'object' || shortcut === null || Array.isArray(shortcut)) {
                    return { valid: false, error: `Invalid site.webmanifest: Shortcut at index ${i} must be an object.` };
                }
                if (typeof shortcut.name !== 'string' || shortcut.name.trim().length === 0) {
                    return { valid: false, error: `Invalid site.webmanifest: Shortcut at index ${i} must have a non-empty "name" string.` };
                }
                if (typeof shortcut.url !== 'string' || shortcut.url.trim().length === 0) {
                    return { valid: false, error: `Invalid site.webmanifest: Shortcut at index ${i} must have a non-empty "url" string.` };
                }
            }
        }

        if (data.categories !== undefined) {
            if (!Array.isArray(data.categories)) {
                return { valid: false, error: 'Invalid site.webmanifest: Property "categories" must be an array.' };
            }
            for (let i = 0; i < data.categories.length; i++) {
                if (typeof data.categories[i] !== 'string') {
                    return { valid: false, error: `Invalid site.webmanifest: Category at index ${i} must be a string.` };
                }
            }
        }

        if (data.related_applications !== undefined) {
            if (!Array.isArray(data.related_applications)) {
                return { valid: false, error: 'Invalid site.webmanifest: Property "related_applications" must be an array.' };
            }
            for (let i = 0; i < data.related_applications.length; i++) {
                const app = data.related_applications[i];
                if (typeof app !== 'object' || app === null || Array.isArray(app)) {
                    return { valid: false, error: `Invalid site.webmanifest: Related application at index ${i} must be an object.` };
                }
                if (typeof app.platform !== 'string' || app.platform.trim().length === 0) {
                    return { valid: false, error: `Invalid site.webmanifest: Related application at index ${i} must have a non-empty "platform" string.` };
                }
            }
        }

        if (data.prefer_related_applications !== undefined && typeof data.prefer_related_applications !== 'boolean') {
            return { valid: false, error: 'Invalid site.webmanifest: Property "prefer_related_applications" must be a boolean.' };
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
        const result = IsValidWebmanifest.parseWebmanifest(text, this.#options);
        if (!result.valid) {
            this.#errorMessage = result.error || 'Invalid site.webmanifest format.';
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
