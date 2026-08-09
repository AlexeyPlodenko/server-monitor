import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IsStatusCode from './IsStatusCode.js';

describe('IsStatusCode', () => {
    it('returns true when status code matches a single expected code', async () => {
        const validator = new IsStatusCode(200);
        validator.setRequest({
            getResponseStatusCode$: async () => 200
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true when status code matches one of multiple expected codes', async () => {
        const validator = new IsStatusCode([200, 301, 302]);
        validator.setRequest({
            getResponseStatusCode$: async () => 301
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false and formatted error message when status code does not match', async () => {
        const validator = new IsStatusCode([200, 301]);
        validator.setRequest({
            getResponseStatusCode$: async () => 404
        });

        assert.equal(await validator.isValid$(), false);
        const errorMsg = await validator.errorMessage$();
        assert.equal(errorMsg, 'Invalid HTTP response status code. Expected: 200, 301. Got: 404.');
    });
});
