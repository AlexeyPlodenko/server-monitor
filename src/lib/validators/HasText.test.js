import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import HasText from './HasText.js';

describe('HasText', () => {
    it('returns true when expected text is present in response', async () => {
        const validator = new HasText('Welcome');
        validator.setRequest({
            getResponseText$: async () => '<html><body>Welcome to our site!</body></html>'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false and error message when expected text is missing', async () => {
        const validator = new HasText('Welcome');
        validator.setRequest({
            getResponseText$: async () => '<html><body>Access Denied</body></html>'
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Missing text "Welcome" in response.');
    });

    it('returns true when searching for empty string in non-empty response', async () => {
        const validator = new HasText('');
        validator.setRequest({
            getResponseText$: async () => 'Any content'
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when expected non-empty text is searched in empty body', async () => {
        const validator = new HasText('Some text');
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Missing text "Some text" in response.');
    });
});
