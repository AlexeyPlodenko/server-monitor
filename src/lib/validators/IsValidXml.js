import AbstractValidator from "./AbstractValidator.js";

export default class IsValidXml extends AbstractValidator {
    /**
     * @type {string}
     */
    #errorMessage = '';

    /**
     * Helper method to parse and validate an XML string.
     * @param {string} xmlText
     * @returns {{ valid: boolean, error?: string }}
     */
    static parseXml(xmlText) {
        if (typeof xmlText !== 'string' || xmlText.trim().length === 0) {
            return { valid: false, error: 'Response body is empty or not a string.' };
        }

        const str = xmlText.trim();
        let pos = 0;
        const len = str.length;
        const stack = [];
        let rootCount = 0;
        let hasRoot = false;

        while (pos < len) {
            const nextTagStart = str.indexOf('<', pos);

            if (nextTagStart === -1) {
                const remainingText = str.slice(pos).trim();
                if (remainingText.length > 0 && !hasRoot) {
                    return { valid: false, error: 'Invalid XML: Missing root element.' };
                }
                if (remainingText.length > 0 && stack.length === 0) {
                    return { valid: false, error: 'Invalid XML: Content outside root element.' };
                }
                break;
            }

            const textBefore = str.slice(pos, nextTagStart).trim();
            if (textBefore.length > 0 && stack.length === 0) {
                return { valid: false, error: 'Invalid XML: Content outside root element.' };
            }

            pos = nextTagStart;

            // Comment: <!-- ... -->
            if (str.startsWith('<!--', pos)) {
                const endComment = str.indexOf('-->', pos + 4);
                if (endComment === -1) {
                    return { valid: false, error: 'Invalid XML: Unclosed comment.' };
                }
                pos = endComment + 3;
                continue;
            }

            // CDATA: <![CDATA[ ... ]]>
            if (str.startsWith('<![CDATA[', pos)) {
                if (stack.length === 0) {
                    return { valid: false, error: 'Invalid XML: CDATA section outside root element.' };
                }
                const endCdata = str.indexOf(']]>', pos + 9);
                if (endCdata === -1) {
                    return { valid: false, error: 'Invalid XML: Unclosed CDATA section.' };
                }
                pos = endCdata + 3;
                continue;
            }

            // Processing Instruction / XML declaration: <? ... ?>
            if (str.startsWith('<?', pos)) {
                const endPi = str.indexOf('?>', pos + 2);
                if (endPi === -1) {
                    return { valid: false, error: 'Invalid XML: Unclosed processing instruction.' };
                }
                pos = endPi + 2;
                continue;
            }

            // DOCTYPE: <!DOCTYPE ... >
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
                if (endDocType === -1) {
                    return { valid: false, error: 'Invalid XML: Unclosed DOCTYPE declaration.' };
                }
                pos = endDocType + 1;
                continue;
            }

            // Closing tag: </tagname>
            if (str.startsWith('</', pos)) {
                const endTag = str.indexOf('>', pos + 2);
                if (endTag === -1) {
                    return { valid: false, error: 'Invalid XML: Unclosed closing tag.' };
                }
                const tagName = str.slice(pos + 2, endTag).trim();
                if (!tagName || !/^[a-zA-Z_:][\w:.-]*$/.test(tagName)) {
                    return { valid: false, error: `Invalid XML: Malformed closing tag name "${tagName}".` };
                }
                if (stack.length === 0) {
                    return { valid: false, error: `Invalid XML: Unexpected closing tag </${tagName}> without opening tag.` };
                }
                const expectedTag = stack.pop();
                if (expectedTag !== tagName) {
                    return { valid: false, error: `Invalid XML: Mismatched tag </${tagName}>, expected </${expectedTag}>.` };
                }
                pos = endTag + 1;
                continue;
            }

            // Opening tag or self-closing tag: <tagname attr="val" ... > or <tagname ... />
            const endTag = str.indexOf('>', pos + 1);
            if (endTag === -1) {
                return { valid: false, error: 'Invalid XML: Unclosed tag.' };
            }

            let tagContent = str.slice(pos + 1, endTag);
            const isSelfClosing = tagContent.endsWith('/');
            if (isSelfClosing) {
                tagContent = tagContent.slice(0, -1);
            }

            tagContent = tagContent.trim();
            if (!tagContent) {
                return { valid: false, error: 'Invalid XML: Empty tag found "<>".' };
            }

            const match = tagContent.match(/^([a-zA-Z_:][\w:.-]*)([\s\S]*)$/);
            if (!match) {
                return { valid: false, error: `Invalid XML: Malformed tag name in "<${tagContent}>".` };
            }

            const tagName = match[1];
            const attrString = match[2];

            if (attrString.trim().length > 0) {
                const attrResult = IsValidXml.#validateAttributes(attrString);
                if (!attrResult.valid) {
                    return { valid: false, error: `Invalid XML in tag "<${tagName}>": ${attrResult.error}` };
                }
            }

            if (stack.length === 0) {
                rootCount++;
                if (rootCount > 1) {
                    return { valid: false, error: `Invalid XML: Multiple root elements found ("<${tagName}>").` };
                }
                hasRoot = true;
            }

            if (!isSelfClosing) {
                stack.push(tagName);
            }

            pos = endTag + 1;
        }

        if (!hasRoot) {
            return { valid: false, error: 'Invalid XML: No root element found.' };
        }

        if (stack.length > 0) {
            return { valid: false, error: `Invalid XML: Unclosed tag </${stack[stack.length - 1]}>.` };
        }

        return { valid: true };
    }

    /**
     * Helper to validate tag attribute string
     * @param {string} attrStr
     * @returns {{ valid: boolean, error?: string }}
     */
    static #validateAttributes(attrStr) {
        let pos = 0;
        const len = attrStr.length;

        while (pos < len) {
            while (pos < len && /\s/.test(attrStr[pos])) pos++;
            if (pos >= len) break;

            const nameMatch = attrStr.slice(pos).match(/^([a-zA-Z_:][\w:.-]*)/);
            if (!nameMatch) {
                return { valid: false, error: `Malformed attribute near "${attrStr.slice(pos, pos + 20)}".` };
            }

            const attrName = nameMatch[1];
            pos += attrName.length;

            while (pos < len && /\s/.test(attrStr[pos])) pos++;

            if (pos >= len || attrStr[pos] !== '=') {
                return { valid: false, error: `Attribute "${attrName}" missing '='.` };
            }
            pos++;

            while (pos < len && /\s/.test(attrStr[pos])) pos++;

            if (pos >= len) {
                return { valid: false, error: `Attribute "${attrName}" missing value.` };
            }

            const quote = attrStr[pos];
            if (quote !== '"' && quote !== "'") {
                return { valid: false, error: `Attribute "${attrName}" value must be enclosed in quotes.` };
            }

            pos++;
            const endQuote = attrStr.indexOf(quote, pos);
            if (endQuote === -1) {
                return { valid: false, error: `Attribute "${attrName}" value has unclosed quote.` };
            }

            pos = endQuote + 1;
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
        const result = IsValidXml.parseXml(text);
        if (!result.valid) {
            this.#errorMessage = result.error || 'Invalid XML format.';
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
