import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import HasMimeType from './HasMimeType.js';
import IsMimeType from './IsMimeType.js';

describe('HasMimeType', () => {
    it('returns true when MIME type matches single expected type', async () => {
        const validator = new HasMimeType('text/html');
        validator.setRequest({
            getResponseMimeType$: async () => 'text/html'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true when MIME type matches one of multiple expected types', async () => {
        const validator = new HasMimeType(['text/html', 'application/xhtml+xml', 'application/json']);
        validator.setRequest({
            getResponseMimeType$: async () => 'application/json'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('handles content-type with parameters and case-insensitivity in request fallback', async () => {
        const validator = new HasMimeType('TEXT/HTML');
        validator.setRequest({
            getResponseHeaders$: async () => ({ 'content-type': 'text/html; charset=UTF-8' })
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('supports wildcard MIME type matching', async () => {
        const validator = new HasMimeType('text/*');
        validator.setRequest({
            getResponseMimeType$: async () => 'text/plain'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false and formatted error message when MIME type does not match', async () => {
        const validator = new HasMimeType('application/json');
        validator.setRequest({
            getResponseMimeType$: async () => 'text/html'
        });

        assert.equal(await validator.isValid$(), false);
        const errorMsg = await validator.errorMessage$();
        assert.equal(errorMsg, 'Invalid HTTP response MIME type. Expected: application/json. Got: text/html.');
    });

    it('returns false and formatted error message when Content-Type header is missing', async () => {
        const validator = new HasMimeType('text/html');
        validator.setRequest({
            getResponseHeaders$: async () => ({})
        });

        assert.equal(await validator.isValid$(), false);
        const errorMsg = await validator.errorMessage$();
        assert.equal(errorMsg, 'Invalid HTTP response MIME type. Expected: text/html. Got: none.');
    });

    it('handles null response headers gracefully', async () => {
        const validator = new HasMimeType('text/html');
        validator.setRequest({
            getResponseHeaders$: async () => null
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Invalid HTTP response MIME type. Expected: text/html. Got: none.');
    });

    it('works identically with IsMimeType alias', async () => {
        const validator = new IsMimeType('application/xml');
        validator.setRequest({
            getResponseMimeType$: async () => 'application/xml'
        });

        assert.equal(await validator.isValid$(), true);
    });
});
