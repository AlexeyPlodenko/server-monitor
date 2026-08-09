import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Storage from './Storage.js';

describe('Storage', () => {
    let storage;

    beforeEach(async () => {
        storage = new Storage(':memory:');
        await storage.init$();
    });

    afterEach(async () => {
        await storage.close$();
    });

    it('initializes schema and saves/retrieves test states', async () => {
        const testStates = {
            'test-1': { lastCheckTime: 1690000000000, hash: 'abc123hash' },
            'test-2': { lastCheckTime: null, hash: 'def456hash' }
        };

        await storage.saveTestStates$(testStates);

        const loaded = await storage.getTestStates$();
        assert.deepEqual(loaded, testStates);
    });

    it('saves and retrieves application state JSON objects', async () => {
        const appState = { status: 'active', checksRun: 42 };

        await storage.saveAppState$('metrics', appState);

        const loaded = await storage.getAppState$('metrics');
        assert.deepEqual(loaded, appState);
    });

    it('returns null for non-existent app_state key', async () => {
        const loaded = await storage.getAppState$('unknown_key');
        assert.equal(loaded, null);
    });
});
