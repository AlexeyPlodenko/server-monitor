import { IncomingWebhook } from '@slack/webhook';
import { Webhook } from 'discord-webhook-node';
import {d, error, info, log, now} from "./helpers.js";
import ResponseTest from "./ResponseTest.js";
import ValidationFailed from "./errors/ValidationFailed.js";
import {config} from "../../config.js";
import chalk from "chalk";
import util from "util";

export default class Pinger {
    /**
     * @type {Test[]}
     */
    #tests;

    /**
     * @type {number}
     */
    #currentTestIx;

    /**
     * @type {Map<string, IncomingWebhook>}
     */
    #slackWebhooks = new Map();

    /**
     * @type {Map<string, Webhook>}
     */
    #discordWebhooks = new Map();

    /**
     * @type {Map<string, {messages: string[], timer: NodeJS.Timeout}>}
     */
    #slackBuffers = new Map();

    /**
     * @type {Map<string, {messages: string[], timer: NodeJS.Timeout}>}
     */
    #discordBuffers = new Map();

    /**
     * @type {Map<string, number>}
     */
    #sentMessages = new Map();

    /**
     * @type {number}
     */
    #mainInterval;

    /**
     * @type {number}
     */
    #cleanupInterval;

    /**
     * @type {number}
     */
    #stateSaveInterval;

    /**
     * @type {number}
     */
     #startTime;

    /**
     * @type {Map<string, number>}
     */
    #lastRunByDomain = new Map();

    /**
     * @type {Storage}
     */
    #storage;

    /**
     * @param {Storage} storage
     */
    constructor(storage) {
        this.#storage = storage;
    }

    /**
     * @param {Test[]} tests
     * @returns {Pinger}
     */
    setTests(tests) {
        this.#tests = tests;

        return this;
    }

    /**
     * @returns {Promise<void>}
     */
    async loadState$() {
        if (!this.#storage) return;

        const testStates = await this.#storage.getTestStates$();
        if (this.#tests) {
            this.#tests.forEach(test => {
                const stored = testStates[test.name];
                const currentHash = this.#calculateTestHash(test);

                if (stored) {
                    if (stored.hash === currentHash) {
                        // Config hasn't changed, restore last check time
                        if (stored.lastCheckTime !== undefined && stored.lastCheckTime !== null) {
                            test.lastCheckTime = stored.lastCheckTime;
                        }
                    } else {
                        info(`Configuration change detected for test "${test.name}". Resetting state.`);
                        test.lastCheckTime = 0; // Force immediate run
                    }
                }
                // Store the hash on the test object for saving later
                test.configHash = currentHash;
            });
        }

        const currentTestIx = await this.#storage.getAppState$('currentTestIx');
        if (currentTestIx !== null) {
            this.#currentTestIx = currentTestIx;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async saveState$() {
        if (!this.#storage || !this.#tests) return;

        info('Saving state...');

        const testStates = {};
        this.#tests.forEach(test => {
            testStates[test.name] = {
                lastCheckTime: test.lastCheckTime || null,
                hash: test.configHash || this.#calculateTestHash(test)
            };
        });

        try {
            await this.#storage.saveTestStates$(testStates);
            if (this.#currentTestIx !== undefined) {
                await this.#storage.saveAppState$('currentTestIx', this.#currentTestIx);
            }
        } catch (err) {
            error(`Failed to save state: ${err.message}`);
        }
    }

    /**
     * @returns {Pinger}
     */
    start() {
        info('Pinger started.');
        this.#startTime = Date.now();

        this.#mainInterval = setInterval(async () => {
            if (Date.now() - this.#startTime < (config.cooldownMs || 0)) {
                return;
            }

            const test = this.#getNextTest();
            if (!test) {
                // info('No tests to run.');
                return;
            }

            const domain = new URL(test.url).hostname;
            const lastRun = this.#lastRunByDomain.get(domain) || 0;
            const delay = config.sameDomainDelayMs !== undefined ? config.sameDomainDelayMs : 1000;

            if (Date.now() - lastRun < delay) {
                return;
            }

            info(`Executing test "${test.name}".`);
            test.lastCheckTime = now().getTime(); // Store as timestamp directly
            this.#lastRunByDomain.set(domain, Date.now());

            const respTest = new ResponseTest(test);

            try {
                await respTest.execute$();
                info(chalk.green(`Test "${test.name}" passed.`));
            } catch (err) {
                if (err instanceof ValidationFailed) {
                    info(chalk.red(err.message));

                    if (config.sendSlackMessages && test.slackWebhookUrl) {
                        this.#bufferSlackMessage(test.slackWebhookUrl, err.message);
                    }
                    if (config.sendDiscordMessages && test.discordWebhookUrl) {
                        this.#bufferDiscordMessage(test.discordWebhookUrl, err.message);
                    }
                } else {
                    if (err instanceof Error && err.message.includes('getaddrinfo ENOTFOUND')) {
                        error(err.message);

                        // domain not found
                        if (config.sendSlackMessages && test.slackWebhookUrl) {
                            this.#bufferSlackMessage(test.slackWebhookUrl, err.message);
                        }
                        if (config.sendDiscordMessages && test.discordWebhookUrl) {
                            this.#bufferDiscordMessage(test.discordWebhookUrl, err.message);
                        }
                    } else {
                        throw err; // unknown error, rethrow it
                    }
                }
            }
        }, 99);

        this.#cleanupInterval = setInterval(() => this.#periodicCleanup(), 3600000); // 1 hour

        const stateSaveIntervalMs = (config.stateSaveIntervalSeconds || 60) * 1000;
        this.#stateSaveInterval = setInterval(() => this.saveState$(), stateSaveIntervalMs);

        return this;
    }

    #periodicCleanup() {
        info('Performing periodic cleanup...');

        const now = Date.now();
        for (const [key, timestamp] of this.#sentMessages.entries()) {
            if (now - timestamp >= 3600000) { // 1 hour
                this.#sentMessages.delete(key);
            }
        }

        for (const [domain, timestamp] of this.#lastRunByDomain.entries()) {
            if (now - timestamp >= 3600000) { // 1 hour
                this.#lastRunByDomain.delete(domain);
            }
        }
    }

    /**
     * @param {string} url
     * @returns {IncomingWebhook}
     */
    #getSlackWebhook(url) {
        if (!this.#slackWebhooks.has(url)) {
            this.#slackWebhooks.set(url, new IncomingWebhook(url));
        }

        return this.#slackWebhooks.get(url);
    }

    /**
     * @param {string} url
     * @returns {Webhook}
     */
    #getDiscordWebhook(url) {
        if (!this.#discordWebhooks.has(url)) {
            this.#discordWebhooks.set(url, new Webhook(url));
        }

        return this.#discordWebhooks.get(url);
    }

    /**
     * @returns {Test|null}
     */
    #getNextTest() {
        if (!this.#tests || !this.#tests.length) {
            return null;
        }

        if (this.#currentTestIx === undefined) {
            this.#currentTestIx = 0;
        } else {
            this.#currentTestIx = this.#currentTestIx + 1 >= this.#tests.length ? 0 : this.#currentTestIx + 1;
        }

        const test = this.#tests[this.#currentTestIx];
        if (!test) {
            return null;
        }

        // return the server if it was never pinged or the runEveryMinute time has passed since the last run
        let lastCheckTime = test.lastCheckTime;
        if (!lastCheckTime || Math.floor(new Date().getTime() - lastCheckTime) >= test.runEveryMs) {
            return test;
        }

        return null;
    }

    /**
     * @param {string} url
     * @param {string} message
     */
    #bufferSlackMessage(url, message) {
        const key = `slack|${url}|${message}`;
        const timestamp = Date.now();

        // 1. Deduplication logic (1-hour window per unique message)
        if (this.#sentMessages.has(key)) {
            const lastSent = this.#sentMessages.get(key);
            if (timestamp - lastSent < 3600000) {
                return;
            }
        }
        this.#sentMessages.set(key, timestamp);

        // 2. Initialize the buffer if it doesn't exist
        if (!this.#slackBuffers.has(url)) {
            this.#slackBuffers.set(url, { messages: [], timer: null });
        }

        const buffer = this.#slackBuffers.get(url);
        buffer.messages.push(message);

        // 3. Debounce Logic:
        // Reset the timer every time a new message arrives.
        // This groups "bursts" of errors into a single Slack notification.
        if (buffer.timer) {
            clearTimeout(buffer.timer);
        }

        buffer.timer = setTimeout(() => {
            this.#flushSlackBuffer(url);
        }, 5000);
    }

    /**
     * @param {string} url
     * @param {string} message
     */
    #bufferDiscordMessage(url, message) {
        const key = `discord|${url}|${message}`;
        const timestamp = Date.now();

        // 1. Deduplication logic (1-hour window per unique message)
        if (this.#sentMessages.has(key)) {
            const lastSent = this.#sentMessages.get(key);
            if (timestamp - lastSent < 3600000) {
                return;
            }
        }
        this.#sentMessages.set(key, timestamp);

        // 2. Initialize the buffer if it doesn't exist
        if (!this.#discordBuffers.has(url)) {
            this.#discordBuffers.set(url, { messages: [], timer: null });
        }

        const buffer = this.#discordBuffers.get(url);
        buffer.messages.push(message);

        // 3. Debounce Logic:
        if (buffer.timer) {
            clearTimeout(buffer.timer);
        }

        buffer.timer = setTimeout(() => {
            this.#flushDiscordBuffer(url);
        }, 5000);
    }

    /**
     * Internal helper to actually send the buffered messages.
     *
     * @param {string} url
     */
    async #flushSlackBuffer(url) {
        const buffer = this.#slackBuffers.get(url);
        if (!buffer || buffer.messages.length === 0) return;

        const text = buffer.messages.join('\n');

        // Clear buffer state BEFORE sending to prevent race conditions
        // if new messages arrive during the network request
        buffer.messages = [];
        if (buffer.timer) {
            clearTimeout(buffer.timer);
            buffer.timer = null;
        }

        try {
            await this.#getSlackWebhook(url).send({ text });
        } catch (err) {
            error(`Failed to send Slack notification: ${err.message}`);
        }
    }

    /**
     * Internal helper to actually send the buffered messages to Discord.
     *
     * @param {string} url
     */
    async #flushDiscordBuffer(url) {
        const buffer = this.#discordBuffers.get(url);
        if (!buffer || buffer.messages.length === 0) return;

        const text = buffer.messages.join('\n');

        // Clear buffer state BEFORE sending
        buffer.messages = [];
        if (buffer.timer) {
            clearTimeout(buffer.timer);
            buffer.timer = null;
        }

        try {
            await this.#getDiscordWebhook(url).send(text);
        } catch (err) {
            error(`Failed to send Discord notification: ${err.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async cleanup() {
        clearInterval(this.#mainInterval);
        clearInterval(this.#cleanupInterval);
        clearInterval(this.#stateSaveInterval);
        info('Cleaning up and sending remaining notification messages...');

        const promises = [];
        for (const url of this.#slackBuffers.keys()) {
            promises.push(this.#flushSlackBuffer(url));
        }
        for (const url of this.#discordBuffers.keys()) {
            promises.push(this.#flushDiscordBuffer(url));
        }

        // Final state save before exit
        promises.push(this.saveState$());

        // Wait for all messages and state save to finish BEFORE closing storage
        await Promise.all(promises);

        if (this.#storage) {
            await this.#storage.close$();
        }

        info('Cleanup finished.');
    }

    /**
     * A very fast non-cryptographic 32-bit hash function (xxHash-like concept).
     *
     * @param {string} str
     * @param {number} seed
     * @returns {string}
     */
    #xxh32(str, seed = 0) {
        let hval = seed ^ 0x811c9dc5;
        for (let i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }
        return (hval >>> 0).toString(16);
    }

    /**
     * Generates a hash for a test configuration to detect changes.
     *
     * @param {Test} test
     * @returns {string}
     */
    #calculateTestHash(test) {
        const testSignature = util.inspect(test, {
            showHidden: false,
            depth: null,
            colors: false
        });

        return this.#xxh32(testSignature);
    }
}
