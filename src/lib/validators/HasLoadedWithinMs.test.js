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

    it('highlights stage timings that take longer than expected thresholds', async () => {
        const validator = new HasLoadedWithinMs(500);
        validator.setRequest({
            getLoadTimeMs$: async () => 750,
            getTimings: () => ({
                dnsLookup: 20,
                tcpConnection: 30,
                tlsHandshake: 40,
                firstByte: 450,
                download: 210
            })
        });

        const errorMsg = await validator.errorMessage$();
        assert.equal(
            errorMsg,
            'Failed to load within 500ms. Loaded in 750ms. (DNS: 20ms, TCP: 30ms, TLS: 40ms, TTFB: 450ms ⚠️, Download: 210ms ⚠️)'
        );
    });

    it('supports custom stage thresholds and custom highlight tag', async () => {
        const validator = new HasLoadedWithinMs(1000, {
            stageThresholds: { dnsLookup: 15 },
            highlightTag: ' [SLOW]'
        });

        validator.setRequest({
            getLoadTimeMs$: async () => 1200,
            getTimings: () => ({
                dnsLookup: 20,
                tcpConnection: 30
            })
        });

        const errorMsg = await validator.errorMessage$();
        assert.equal(
            errorMsg,
            'Failed to load within 1000ms. Loaded in 1200ms. (DNS: 20ms [SLOW], TCP: 30ms)'
        );
    });
});

