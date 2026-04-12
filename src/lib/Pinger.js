import { IncomingWebhook } from '@slack/webhook';
import {d, error, info, log, now} from "./helpers.js";
import ResponseTest from "./ResponseTest.js";
import ValidationFailed from "./errors/ValidationFailed.js";
import {config} from "../../config.js";
import chalk from "chalk";

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
     * @type {Map<string, {messages: string[], timer: NodeJS.Timeout}>}
     */
    #slackBuffers = new Map();

    /**
     * @type {Map<string, number>}
     */
    #sentMessages = new Map();

    /**
     * @type {number}
     */
    #cleanupInterval;

    /**
     * @type {number}
     */
     #startTime;

    /**
     * @type {Map<string, number>}
     */
    #lastRunByDomain = new Map();

    /**
     * @param {Test[]} tests
     * @returns {Pinger}
     */
    setTests(tests) {
        this.#tests = tests;

        return this;
    }

    /**
     * @returns {Pinger}
     */
    start() {
        this.#startTime = Date.now();

        setInterval(async () => {
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
            test.lastCheckTime = now();
            this.#lastRunByDomain.set(domain, Date.now());

            const respTest = new ResponseTest(test);

            try {
                await respTest.execute$();
                log(chalk.green(`Test "${test.name}" passed.`));
            } catch (err) {
                if (err instanceof ValidationFailed) {
                    error(err.message);

                    if (config.sendSlackMessages) {
                        this.#bufferSlackMessage(test.slackWebhookUrl, err.message);
                    }
                } else {
                    if (err instanceof Error && err.message.includes('getaddrinfo ENOTFOUND')) {
                        error(err.message);

                        // domain not found
                        if (config.sendSlackMessages) {
                            this.#bufferSlackMessage(test.slackWebhookUrl, err.message);
                        }
                    } else {
                        throw err; // unknown error, rethrow it
                    }
                }
            }
        }, 99);

        this.#cleanupInterval = setInterval(() => this.#periodicCleanup(), 3600000); // 1 hour

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
    #getWebhook(url) {
        if (!this.#slackWebhooks.has(url)) {
            this.#slackWebhooks.set(url, new IncomingWebhook(url));
        }

        return this.#slackWebhooks.get(url);
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
        if (!lastCheckTime || Math.floor(new Date() - lastCheckTime) >= test.runEveryMs) {
            return test;
        }

        return null;
    }

    /**
     * @param {string} url
     * @param {string} message
     */
    #bufferSlackMessage(url, message) {
        const key = `${url}|${message}`;
        const timestamp = Date.now();

        // 1. Deduplication logic (1-hour window per unique message)
        if (this.#sentMessages.has(key)) {
            const lastSent = this.#sentMessages.get(key);
            if (timestamp - lastSent < 3600000) {
                return;
            }
        }
        this.#sentMessages.set(key, timestamp);

        // 2. Initialize buffer if it doesn't exist
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
            await this.#getWebhook(url).send({ text });
        } catch (err) {
            error(`Failed to send Slack notification: ${err.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async cleanup() {
        clearInterval(this.#cleanupInterval);
        info('Cleaning up and sending remaining slack messages...');

        const promises = [];
        for (const url of this.#slackBuffers.keys()) {
            promises.push(this.#flushSlackBuffer(url));
        }

        await Promise.all(promises);
        info('Cleanup finished.');
    }
}
