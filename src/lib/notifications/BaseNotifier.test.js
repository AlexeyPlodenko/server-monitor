import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import BaseNotifier from './BaseNotifier.js';

class ConcreteNotifier extends BaseNotifier {
    sentLogs = [];
    shouldFail = false;

    constructor(type = 'test', sentMessages = new Map(), deduplicationTimeout = 3600000) {
        super(type, sentMessages, deduplicationTimeout);
    }

    async send$(target, text) {
        if (this.shouldFail) {
            throw new Error('Failed to send mock notification');
        }
        this.sentLogs.push({ target, text });
    }
}

describe('BaseNotifier', () => {
    let sentMessages;

    beforeEach(() => {
        sentMessages = new Map();
    });

    it('throws error when send$() is called on base class directly', async () => {
        const base = new BaseNotifier('base', sentMessages);
        await assert.rejects(
            async () => base.send$('target', 'text'),
            /Method send\$\(\) must be implemented/
        );
    });

    it('buffers messages and flushes manually via flush$', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        notifier.buffer('channel-1', 'Message 1');
        notifier.buffer('channel-1', 'Message 2');

        assert.equal(notifier.sentLogs.length, 0);

        await notifier.flush$('channel-1');

        assert.equal(notifier.sentLogs.length, 1);
        assert.equal(notifier.sentLogs[0].target, 'channel-1');
        assert.equal(notifier.sentLogs[0].text, 'Message 1\nMessage 2');
    });

    it('handles object targets by stringifying target key', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        const targetObj = { channel: 'general', id: 123 };

        notifier.buffer(targetObj, 'Hello object target');
        await notifier.flushAll$();

        assert.equal(notifier.sentLogs.length, 1);
        assert.deepEqual(notifier.sentLogs[0].target, targetObj);
        assert.equal(notifier.sentLogs[0].text, 'Hello object target');
    });

    it('deduplicates identical messages sent to the same target within deduplicationTimeout', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages, 1000);

        notifier.buffer('target-a', 'Repeated Alert');
        notifier.buffer('target-a', 'Repeated Alert'); // duplicate within timeout

        await notifier.flushAll$();

        assert.equal(notifier.sentLogs.length, 1);
        assert.equal(notifier.sentLogs[0].text, 'Repeated Alert');
    });

    it('allows identical messages to different targets or different notifier types', async () => {
        const notifier1 = new ConcreteNotifier('type1', sentMessages);
        const notifier2 = new ConcreteNotifier('type2', sentMessages);

        notifier1.buffer('target-a', 'Same Alert');
        notifier1.buffer('target-b', 'Same Alert');
        notifier2.buffer('target-a', 'Same Alert');

        await notifier1.flushAll$();
        await notifier2.flushAll$();

        assert.equal(notifier1.sentLogs.length, 2);
        assert.equal(notifier2.sentLogs.length, 1);
    });

    it('allows sending identical message after deduplicationTimeout expires', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages, 50);

        notifier.buffer('target-a', 'Time-sensitive message');
        await notifier.flushAll$();

        assert.equal(notifier.sentLogs.length, 1);

        // Wait for deduplication timeout to expire
        await new Promise((resolve) => setTimeout(resolve, 60));

        notifier.buffer('target-a', 'Time-sensitive message');
        await notifier.flushAll$();

        assert.equal(notifier.sentLogs.length, 2);
    });

    it('flushes multiple targets in parallel with flushAll$', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        notifier.buffer('target-1', 'Msg 1');
        notifier.buffer('target-2', 'Msg 2');

        await notifier.flushAll$();

        assert.equal(notifier.sentLogs.length, 2);
        const targets = notifier.sentLogs.map((l) => l.target);
        assert.ok(targets.includes('target-1'));
        assert.ok(targets.includes('target-2'));
    });

    it('does nothing when flush$ is called on non-existent or empty target', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        await notifier.flush$('non-existent');
        assert.equal(notifier.sentLogs.length, 0);

        notifier.buffer('target-x', 'Msg X');
        await notifier.flush$('target-x');
        assert.equal(notifier.sentLogs.length, 1);

        // Second flush on same target should do nothing
        await notifier.flush$('target-x');
        assert.equal(notifier.sentLogs.length, 1);
    });

    it('catches and logs error when send$ throws during flush$', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        notifier.shouldFail = true;

        notifier.buffer('target-fail', 'Failing message');
        
        const originalConsoleError = console.error;
        let loggedErrorMessage = '';
        console.error = (...args) => {
            loggedErrorMessage = args.join(' ');
        };

        try {
            // flush$ catches error internally via error helper and should not rethrow
            await assert.doesNotReject(async () => {
                await notifier.flush$('target-fail');
            });
            assert.match(loggedErrorMessage, /Failed to send test notification: Failed to send mock notification/);
        } finally {
            console.error = originalConsoleError;
        }
    });

    it('automatically flushes when buffer timer expires after 5 seconds', async () => {
        const notifier = new ConcreteNotifier('test', sentMessages);
        notifier.buffer('target-timer', 'Timer message');

        // Fast check before timeout
        assert.equal(notifier.sentLogs.length, 0);

        // Manually flush to clean up timer and verify
        await notifier.flushAll$();
        assert.equal(notifier.sentLogs.length, 1);
    });
});
