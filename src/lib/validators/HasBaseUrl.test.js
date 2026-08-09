import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import HasBaseUrl from './HasBaseUrl.js';

describe('HasBaseUrl', () => {
    it('returns true when base URL matches expected single URL', async () => {
        const validator = new HasBaseUrl('https://example.com');
        validator.setRequest({
            getUrl: () => 'https://example.com/path/to/page',
            getResponseHeaders$: async () => ({})
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true when base URL matches one of expected URLs after absolute redirect', async () => {
        const validator = new HasBaseUrl(['https://example.com', 'https://www.example.com']);
        validator.setRequest({
            getUrl: () => 'http://example.com',
            getResponseHeaders$: async () => ({ location: 'https://www.example.com/login' })
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('handles relative redirect path by resolving against request URL', async () => {
        const validator = new HasBaseUrl('https://example.com');
        validator.setRequest({
            getUrl: () => 'https://example.com/old-path',
            getResponseHeaders$: async () => ({ location: '/new-path' })
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when base URL does not match', async () => {
        const validator = new HasBaseUrl('https://example.com');
        validator.setRequest({
            getUrl: () => 'https://other-domain.com/path',
            getResponseHeaders$: async () => ({})
        });

        assert.equal(await validator.isValid$(), false);
        const errorMsg = await validator.errorMessage$();
        assert.equal(errorMsg, 'Invalid base URL. Expected: https://example.com. Got: https://other-domain.com.');
    });

    it('returns false when expected base URL is invalid', async () => {
        const validator = new HasBaseUrl('not-a-valid-url');
        validator.setRequest({
            getUrl: () => 'https://example.com',
            getResponseHeaders$: async () => ({})
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid expected base URL: "not-a-valid-url".');
    });

    it('handles null response headers gracefully', async () => {
        const validator = new HasBaseUrl('https://example.com');
        validator.setRequest({
            getUrl: () => 'https://example.com/home',
            getResponseHeaders$: async () => null
        });

        assert.equal(await validator.isValid$(), true);
    });
});
