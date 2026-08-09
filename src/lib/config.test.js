import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './config.js';

describe('config', () => {
    it('loads valid configuration object with expected properties', () => {
        assert.ok(config);
        assert.equal(typeof config.sendSlackMessages, 'boolean');
        assert.equal(typeof config.sendDiscordMessages, 'boolean');
        assert.equal(typeof config.sendTelegramMessages, 'boolean');
        assert.equal(typeof config.cooldownMs, 'number');
        assert.equal(typeof config.sameDomainDelayMs, 'number');
        assert.equal(typeof config.stateSaveIntervalSeconds, 'number');
        assert.equal(typeof config.deduplicationTimeoutMs, 'number');
        assert.equal(typeof config.logDateTime, 'boolean');
    });
});
