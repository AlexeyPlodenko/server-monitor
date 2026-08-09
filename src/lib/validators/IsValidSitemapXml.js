import IsValidXml from "./IsValidXml.js";

const VALID_CHANGEFREQS = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

export default class IsValidSitemapXml extends IsValidXml {
    /**
     * @type {string}
     */
    #errorMessage = '';

    /**
     * Helper to build a simplified DOM tree from valid XML.
     * @param {string} xmlText
     * @returns {{ name: string, text: string, children: Array }|null}
     */
    static buildXmlTree(xmlText) {
        const str = xmlText.trim();
        let pos = 0;
        const len = str.length;
        let rootNode = null;
        const stack = [];

        while (pos < len) {
            const nextTagStart = str.indexOf('<', pos);
            if (nextTagStart === -1) break;

            if (stack.length > 0) {
                const textContent = str.slice(pos, nextTagStart).trim();
                if (textContent.length > 0) {
                    stack[stack.length - 1].text += (stack[stack.length - 1].text ? ' ' : '') + textContent;
                }
            }

            pos = nextTagStart;

            if (str.startsWith('<!--', pos)) {
                const endComment = str.indexOf('-->', pos + 4);
                if (endComment !== -1) {
                    pos = endComment + 3;
                    continue;
                }
            }

            if (str.startsWith('<![CDATA[', pos)) {
                const endCdata = str.indexOf(']]>', pos + 9);
                if (endCdata !== -1) {
                    const cdataContent = str.slice(pos + 9, endCdata);
                    if (stack.length > 0) {
                        stack[stack.length - 1].text += cdataContent;
                    }
                    pos = endCdata + 3;
                    continue;
                }
            }

            if (str.startsWith('<?', pos)) {
                const endPi = str.indexOf('?>', pos + 2);
                if (endPi !== -1) {
                    pos = endPi + 2;
                    continue;
                }
            }

            if (str.startsWith('<!DOCTYPE', pos) || str.startsWith('<!doctype', pos)) {
                let depth = 0;
                let endDocType = -1;
                for (let i = pos + 9; i < len; i++) {
                    if (str[i] === '[') depth++;
                    else if (str[i] === ']') depth--;
                    else if (str[i] === '>' && depth === 0) {
                        endDocType = i;
                        break;
                    }
                }
                if (endDocType !== -1) {
                    pos = endDocType + 1;
                    continue;
                }
            }

            if (str.startsWith('</', pos)) {
                const endTag = str.indexOf('>', pos + 2);
                if (endTag !== -1) {
                    stack.pop();
                    pos = endTag + 1;
                    continue;
                }
            }

            const endTag = str.indexOf('>', pos + 1);
            if (endTag === -1) break;

            let tagContent = str.slice(pos + 1, endTag);
            const isSelfClosing = tagContent.endsWith('/');
            if (isSelfClosing) {
                tagContent = tagContent.slice(0, -1);
            }
            tagContent = tagContent.trim();

            const match = tagContent.match(/^([a-zA-Z_:][\w:.-]*)/);
            if (match) {
                const tagName = match[1];
                const node = { name: tagName, text: '', children: [] };

                if (stack.length === 0) {
                    rootNode = node;
                } else {
                    stack[stack.length - 1].children.push(node);
                }

                if (!isSelfClosing) {
                    stack.push(node);
                }
            }

            pos = endTag + 1;
        }

        return rootNode;
    }

    /**
     * Validates XML sitemap structure against specification and best practices.
     * @param {string} xmlText
     * @returns {{ valid: boolean, error?: string }}
     */
    static parseSitemapStructure(xmlText) {
        const root = IsValidSitemapXml.buildXmlTree(xmlText);
        if (!root) {
            return { valid: false, error: 'Invalid sitemap XML: Unable to parse root element.' };
        }

        const rootName = root.name.toLowerCase();

        if (rootName === 'urlset') {
            return IsValidSitemapXml.#validateUrlset(root);
        } else if (rootName === 'sitemapindex') {
            return IsValidSitemapXml.#validateSitemapIndex(root);
        } else {
            return {
                valid: false,
                error: `Invalid sitemap XML: Root element must be <urlset> or <sitemapindex>, got <${root.name}>.`
            };
        }
    }

    static #validateUrlset(root) {
        const urls = root.children.filter(c => c.name.toLowerCase() === 'url');

        if (urls.length === 0) {
            return { valid: false, error: 'Invalid sitemap XML: <urlset> must contain at least one <url> element.' };
        }

        if (urls.length > 50000) {
            return { valid: false, error: `Invalid sitemap XML: <urlset> exceeds limit of 50,000 URLs (contains ${urls.length}).` };
        }

        for (let i = 0; i < urls.length; i++) {
            const urlNode = urls[i];
            const locNode = urlNode.children.find(c => c.name.toLowerCase() === 'loc');

            if (!locNode || !locNode.text) {
                return { valid: false, error: `Invalid sitemap XML: <url> #${i + 1} missing <loc> URL.` };
            }

            const locUrl = locNode.text.trim();
            if (!/^https?:\/\//i.test(locUrl)) {
                return { valid: false, error: `Invalid sitemap XML: <url> #${i + 1} <loc> "${locUrl}" is not a valid absolute HTTP/HTTPS URL.` };
            }

            const priorityNode = urlNode.children.find(c => c.name.toLowerCase() === 'priority');
            if (priorityNode && priorityNode.text) {
                const prioVal = parseFloat(priorityNode.text.trim());
                if (isNaN(prioVal) || prioVal < 0.0 || prioVal > 1.0) {
                    return { valid: false, error: `Invalid sitemap XML: <url> #${i + 1} <priority> value "${priorityNode.text.trim()}" must be between 0.0 and 1.0.` };
                }
            }

            const changefreqNode = urlNode.children.find(c => c.name.toLowerCase() === 'changefreq');
            if (changefreqNode && changefreqNode.text) {
                const freqVal = changefreqNode.text.trim().toLowerCase();
                if (!VALID_CHANGEFREQS.has(freqVal)) {
                    return { valid: false, error: `Invalid sitemap XML: <url> #${i + 1} <changefreq> value "${changefreqNode.text.trim()}" is invalid.` };
                }
            }
        }

        return { valid: true };
    }

    /**
     * @param root
     * @returns {{valid: boolean}|{valid: boolean, error: string}}
     */
    static #validateSitemapIndex(root) {
        const sitemaps = root.children.filter(c => c.name.toLowerCase() === 'sitemap');

        if (sitemaps.length === 0) {
            return { valid: false, error: 'Invalid sitemap XML: <sitemapindex> must contain at least one <sitemap> element.' };
        }

        if (sitemaps.length > 50000) {
            return { valid: false, error: `Invalid sitemap XML: <sitemapindex> exceeds limit of 50,000 sitemaps (contains ${sitemaps.length}).` };
        }

        for (let i = 0; i < sitemaps.length; i++) {
            const sitemapNode = sitemaps[i];
            const locNode = sitemapNode.children.find(c => c.name.toLowerCase() === 'loc');

            if (!locNode || !locNode.text) {
                return { valid: false, error: `Invalid sitemap XML: <sitemap> #${i + 1} missing <loc> URL.` };
            }

            const locUrl = locNode.text.trim();
            if (!/^https?:\/\//i.test(locUrl)) {
                return { valid: false, error: `Invalid sitemap XML: <sitemap> #${i + 1} <loc> "${locUrl}" is not a valid absolute HTTP/HTTPS URL.` };
            }
        }

        return { valid: true };
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const parentValid = await super.isValid$();
        if (!parentValid) {
            this.#errorMessage = await super.errorMessage$();
            return false;
        }

        const text = await this.getValue$();
        const sitemapResult = IsValidSitemapXml.parseSitemapStructure(text);
        if (!sitemapResult.valid) {
            this.#errorMessage = sitemapResult.error;
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
