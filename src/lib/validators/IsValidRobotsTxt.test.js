import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IsValidRobotsTxt from './IsValidRobotsTxt.js';

describe('IsValidRobotsTxt', () => {
    it('returns true for a valid simple robots.txt file', async () => {
        const content = `User-agent: *
Disallow: /admin/
Allow: /
Sitemap: https://example.com/sitemap.xml`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true for a valid complex robots.txt with comments, crawl-delay, and multiple sitemaps', async () => {
        const content = `# Main robots.txt file
User-agent: Googlebot
Disallow: /private/
Crawl-delay: 2.5

User-agent: *
Disallow: /cgi-bin/
Allow: /public/
Host: example.com
Clean-param: sid /forum/index.php

Sitemap: https://example.com/sitemap1.xml
Sitemap: https://example.com/sitemap2.xml`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when response content is HTML instead of plain text', async () => {
        const content = `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body><h1>Page Not Found</h1></body>
</html>`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /appears to be HTML/i);
    });

    it('returns false when a line is missing the colon separator', async () => {
        const content = `User-agent: *
Disallow /admin/`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /missing key-value colon separator/i);
    });

    it('returns false when User-agent directive is empty', async () => {
        const content = `User-agent:
Disallow: /admin/`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /must specify a robot name/i);
    });

    it('returns false when Disallow directive appears without a preceding User-agent', async () => {
        const content = `Disallow: /admin/
User-agent: *`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /without preceding User-agent/i);
    });

    it('returns false when Allow directive appears without a preceding User-agent', async () => {
        const content = `Allow: /public/
User-agent: *`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /without preceding User-agent/i);
    });

    it('returns false when Crawl-delay is invalid or negative', async () => {
        const content = `User-agent: *
Crawl-delay: -5`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /must be a non-negative number/i);
    });

    it('returns false when Sitemap URL is relative or malformed', async () => {
        const content = `User-agent: *
Disallow:
Sitemap: /sitemap.xml`;

        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /must be a valid absolute HTTP\/HTTPS URL/i);
    });

    it('returns false for empty body by default', async () => {
        const validator = new IsValidRobotsTxt();
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Robots.txt content is empty.');
    });

    it('returns true for empty body when allowEmpty option is true', async () => {
        const validator = new IsValidRobotsTxt({ allowEmpty: true });
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('enforces requireUserAgent option', async () => {
        const content = `Sitemap: https://example.com/sitemap.xml`;

        const validatorWithoutReq = new IsValidRobotsTxt({ requireUserAgent: false });
        validatorWithoutReq.setRequest({ getResponseText$: async () => content });
        assert.equal(await validatorWithoutReq.isValid$(), true);

        const validatorWithReq = new IsValidRobotsTxt({ requireUserAgent: true });
        validatorWithReq.setRequest({ getResponseText$: async () => content });
        assert.equal(await validatorWithReq.isValid$(), false);
        assert.match(await validatorWithReq.errorMessage$(), /Missing required User-agent directive/i);
    });

    it('enforces requireSitemap option', async () => {
        const content = `User-agent: *
Disallow: /admin/`;

        const validatorWithoutReq = new IsValidRobotsTxt({ requireSitemap: false });
        validatorWithoutReq.setRequest({ getResponseText$: async () => content });
        assert.equal(await validatorWithoutReq.isValid$(), true);

        const validatorWithReq = new IsValidRobotsTxt({ requireSitemap: true });
        validatorWithReq.setRequest({ getResponseText$: async () => content });
        assert.equal(await validatorWithReq.isValid$(), false);
        assert.match(await validatorWithReq.errorMessage$(), /Missing required Sitemap directive/i);
    });
});
