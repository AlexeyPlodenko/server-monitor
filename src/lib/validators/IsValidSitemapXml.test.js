import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IsValidSitemapXml from './IsValidSitemapXml.js';

describe('IsValidSitemapXml', () => {
    it('returns true for a valid <urlset> sitemap', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://plevex.lv/lv</loc>
        <priority>0.5</priority>
        <changefreq>daily</changefreq>
    </url>
</urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true for a valid <sitemapindex> sitemap index', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>https://plevex.lv/sitemap1.xml</loc>
        <lastmod>2026-08-09</lastmod>
    </sitemap>
</sitemapindex>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when root element is not <urlset> or <sitemapindex>', async () => {
        const xml = `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>Not a sitemap</body></html>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: Root element must be <urlset> or <sitemapindex>, got <html>.');
    });

    it('returns false when <urlset> contains no <url> elements', async () => {
        const xml = `<?xml version="1.0"?><urlset></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <urlset> must contain at least one <url> element.');
    });

    it('returns false when <url> is missing <loc>', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><priority>0.8</priority></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 missing <loc> URL.');
    });

    it('returns false when <loc> is not an absolute HTTP/HTTPS URL', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>/relative/path</loc></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 <loc> "/relative/path" is not a valid absolute HTTP/HTTPS URL.');
    });

    it('returns false when <priority> is out of range 0.0 to 1.0', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com</loc><priority>1.5</priority></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 <priority> value "1.5" must be between 0.0 and 1.0.');
    });

    it('returns false when <changefreq> is invalid', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com</loc><changefreq>sometimes</changefreq></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 <changefreq> value "sometimes" is invalid.');
    });

    it('returns false for invalid XML syntax via parent validator', async () => {
        const xml = `<urlset><url><loc>https://example.com</loc></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.ok((await validator.errorMessage$()).startsWith('Invalid XML:'));
    });

    it('returns false when <sitemapindex> contains no <sitemap> elements', async () => {
        const xml = `<?xml version="1.0"?><sitemapindex></sitemapindex>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <sitemapindex> must contain at least one <sitemap> element.');
    });

    it('returns false when <sitemap> in <sitemapindex> is missing <loc>', async () => {
        const xml = `<?xml version="1.0"?><sitemapindex><sitemap><lastmod>2026-08-09</lastmod></sitemap></sitemapindex>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <sitemap> #1 missing <loc> URL.');
    });

    it('returns false when <sitemap> <loc> in <sitemapindex> is not a valid absolute HTTP/HTTPS URL', async () => {
        const xml = `<?xml version="1.0"?><sitemapindex><sitemap><loc>ftp://example.com/sitemap.xml</loc></sitemap></sitemapindex>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <sitemap> #1 <loc> "ftp://example.com/sitemap.xml" is not a valid absolute HTTP/HTTPS URL.');
    });

    it('returns false when <priority> is negative', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com</loc><priority>-0.5</priority></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 <priority> value "-0.5" must be between 0.0 and 1.0.');
    });

    it('returns false when <priority> is non-numeric', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com</loc><priority>high</priority></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 <priority> value "high" must be between 0.0 and 1.0.');
    });

    it('returns false when <loc> is empty or whitespace', async () => {
        const xml = `<?xml version="1.0"?><urlset><url><loc>   </loc></url></urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <url> #1 missing <loc> URL.');
    });

    it('returns false when XML has no root element via parent validator', async () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid XML: No root element found.');
    });

    it('returns error when parseSitemapStructure cannot parse root element', () => {
        const result = IsValidSitemapXml.parseSitemapStructure('<?xml version="1.0"?>');
        assert.deepEqual(result, {
            valid: false,
            error: 'Invalid sitemap XML: Unable to parse root element.'
        });
    });

    it('returns false when <urlset> exceeds limit of 50,000 URLs', async () => {
        const urls = '<url><loc>https://example.com/</loc></url>'.repeat(50001);
        const xml = `<?xml version="1.0"?><urlset>${urls}</urlset>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <urlset> exceeds limit of 50,000 URLs (contains 50001).');
    });

    it('returns false when <sitemapindex> exceeds limit of 50,000 sitemaps', async () => {
        const sitemaps = '<sitemap><loc>https://example.com/sitemap.xml</loc></sitemap>'.repeat(50001);
        const xml = `<?xml version="1.0"?><sitemapindex>${sitemaps}</sitemapindex>`;

        const validator = new IsValidSitemapXml();
        validator.setRequest({
            getResponseText$: async () => xml
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid sitemap XML: <sitemapindex> exceeds limit of 50,000 sitemaps (contains 50001).');
    });
});

