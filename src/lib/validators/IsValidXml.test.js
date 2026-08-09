import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IsValidXml from './IsValidXml.js';

describe('IsValidXml', () => {
    it('returns true for a valid XML string', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://plevex.lv/lv</loc>
        <priority>0.5</priority>
    </url>
</urlset>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true for self-closing tags and CDATA', async () => {
        const xml = `<?xml version="1.0"?>
<root>
    <item id="1" active="true" />
    <data><![CDATA[<greetings>Hello World</greetings>]]></data>
    <!-- Comment test -->
</root>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false for empty or non-string response', async () => {
        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Response body is empty or not a string.');
    });

    it('returns false for mismatched closing tags', async () => {
        const xml = `<root><child></other></root>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid XML: Mismatched tag </other>, expected </child>.');
    });

    it('returns false for unclosed tags', async () => {
        const xml = `<root><child>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid XML: Unclosed tag </child>.');
    });

    it('returns false for multiple root elements', async () => {
        const xml = `<root1></root1><root2></root2>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid XML: Multiple root elements found ("<root2>").');
    });

    it('returns false for unquoted attribute values', async () => {
        const xml = `<root id=123></root>`;

        const validator = new IsValidXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.ok(await validator.errorMessage$());
    });
});
