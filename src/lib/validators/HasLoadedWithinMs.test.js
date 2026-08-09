import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import HasLoadedWithinMs from './HasLoadedWithinMs.js';

describe('HasLoadedWithinMs', () => {
    it('returns true when load time is under threshold', async () => {
        const validator = new HasLoadedWithinMs(1000);
        validator.setRequest({
            getLoadTimeMs$: async () => 350
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false and error message when load time exceeds threshold', async () => {
        const validator = new HasLoadedWithinMs(500);
        validator.setRequest({
            getLoadTimeMs$: async () => 750
        });

        assert.equal(await validator.isValid$(), false);
        assert.equal(await validator.errorMessage$(), 'Failed to load within 500ms. Loaded in 750ms.');
    });
});
