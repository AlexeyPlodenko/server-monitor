import {d, error, info, log, now} from "./helpers.js";
import ResponseTest from "./ResponseTest.js";
import ValidationFailed from "./errors/ValidationFailed.js";
import {config} from "../../config.js";
import chalk from "chalk";
import util from "util";
import SlackNotifier from "./notifications/SlackNotifier.js";
import DiscordNotifier from "./notifications/DiscordNotifier.js";
import TelegramNotifier from "./notifications/TelegramNotifier.js";

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
     * @type {Map<string, number>}
     */
    #sentMessages = new Map();

    /**
     * @type {SlackNotifier}
     */
    #slackNotifier;

    /**
     * @type {DiscordNotifier}
     */
    #discordNotifier;

    /**
     * @type {TelegramNotifier}
     */
    #telegramNotifier;

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
        this.#slackNotifier = new SlackNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
        this.#discordNotifier = new DiscordNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
        this.#telegramNotifier = new TelegramNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
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

        const sentMessages = await this.#storage.getAppState$('sentMessages');
        if (sentMessages) {
            this.#sentMessages = new Map(sentMessages);
            // Re-bind to notifiers since they were initialized with the old reference
            this.#slackNotifier = new SlackNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
            this.#discordNotifier = new DiscordNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
            this.#telegramNotifier = new TelegramNotifier(this.#sentMessages, config.deduplicationTimeoutMs);
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
            await this.#storage.saveAppState$('sentMessages', [...this.#sentMessages.entries()]);
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
                    this.#notify$(test, err.message);
                } else {
                    if (err instanceof Error && err.message.includes('getaddrinfo ENOTFOUND')) {
                        error(err.message);
                        this.#notify$(test, err.message);
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

    /**
     * @param {Test} test
     * @param {string} message
     */
    #notify$(test, message) {
        if (config.sendSlackMessages && test.slackWebhookUrl) {
            this.#slackNotifier.buffer(test.slackWebhookUrl, message);
        }
        if (config.sendDiscordMessages && test.discordWebhookUrl) {
            this.#discordNotifier.buffer(test.discordWebhookUrl, message);
        }
        if (config.sendTelegramMessages && test.telegram) {
            const { botToken, chatId } = test.telegram;
            if (botToken && chatId) {
                this.#telegramNotifier.buffer(test.telegram, message);
            }
        }
    }

    #periodicCleanup() {
        info('Performing periodic cleanup...');

        const now = Date.now();
        const timeout = config.deduplicationTimeoutMs || 3600000;
        for (const [key, timestamp] of this.#sentMessages.entries()) {
            if (now - timestamp >= timeout) {
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
     * @returns {Promise<void>}
     */
    async cleanup() {
        clearInterval(this.#mainInterval);
        clearInterval(this.#cleanupInterval);
        clearInterval(this.#stateSaveInterval);
        info('Cleaning up and sending remaining notification messages...');

        const promises = [];
        promises.push(this.#slackNotifier.flushAll$());
        promises.push(this.#discordNotifier.flushAll$());
        promises.push(this.#telegramNotifier.flushAll$());

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
