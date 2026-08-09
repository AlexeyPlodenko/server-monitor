import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import NotEmpty from './NotEmpty.js';

describe('NotEmpty', () => {
    it('returns true when body is non-empty', async () => {
        const validator = new NotEmpty();
        validator.setRequest({
            getResponseText$: async () => 'Hello World'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when body is empty string', async () => {
        const validator = new NotEmpty();
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Body is empty.');
    });
});
