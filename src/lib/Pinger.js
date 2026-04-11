import { IncomingWebhook } from '@slack/webhook';
import {d, info, now} from "./helpers.js";
import ResponseTest from "./ResponseTest.js";
import ValidationFailed from "./errors/ValidationFailed.js";
import {config} from "../config.js";

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
     * @type {NodeJS.Timeout}
     */
    #cleanupInterval;

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
        setInterval(async () => {
            const test = this.#getNextTest();
            if (!test) {
                // info('No tests to run.');
                return;
            }

            info(`Executing test "${test.name}".`);
            test.lastCheckTime = now();

            const respTest = new ResponseTest(test);

            try {
                await respTest.execute$();
                info(`The test "${test.name}" passed.`);
            } catch (err) {
                if (err instanceof ValidationFailed) {
                    info(err.message);

                    if (config.sendSlackMessages) {
                        this.#bufferSlackMessage(test.slackWebhookUrl, err.message);
                    }
                } else {
                    throw err; // unknown error, rethrow it
                }
            }
        }, 99);

        this.#cleanupInterval = setInterval(() => this.#cleanupSentMessages(), 3600000); // 1 hour

        return this;
    }

    #cleanupSentMessages() {
        const now = Date.now();
        info('Cleaning up old sent messages...');
        for (const [key, timestamp] of this.#sentMessages.entries()) {
            if (now - timestamp >= 3600000) { // 1 hour
                this.#sentMessages.delete(key);
            }
        }
    }

    /**
     * @param {string} url
     * @param {string} message
     */
    #bufferSlackMessage(url, message) {
        const key = `${url}|${message}`;
        const timestamp = Date.now();
        if (this.#sentMessages.has(key)) {
            const lastSent = this.#sentMessages.get(key);
            if (timestamp - lastSent < 3600000) { // 1 hour
                return;
            }
        }
        this.#sentMessages.set(key, timestamp);

        if (!this.#slackBuffers.has(url)) {
            this.#slackBuffers.set(url, { messages: [], timer: null });
        }

        const buffer = this.#slackBuffers.get(url);
        buffer.messages.push(message);

        if (!buffer.timer) {
            buffer.timer = setTimeout(async () => {
                const text = buffer.messages.join('\n');
                buffer.messages = [];
                buffer.timer = null;

                try {
                    await this.#getWebhook(url).send({ text });
                } catch (err) {
                    info(`Failed to send slack notification: ${err.message}`);
                }
            }, 5000);
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
        if (!this.#tests.length) {
            return null;
        }

        if (this.#currentTestIx === undefined) {
            this.#currentTestIx = 0;
        } else {
            this.#currentTestIx = this.#currentTestIx + 1 >= this.#tests.length ? 0 : this.#currentTestIx + 1;
        }

        const test = this.#tests[this.#currentTestIx];

        // return the server if it was never pinged or the runEveryMinute time has passed since the last run
        let lastCheckTime = test.lastCheckTime;
        if (!lastCheckTime || Math.floor(new Date() - lastCheckTime) >= test.runEveryMs) {
            return this.#tests[this.#currentTestIx];
        }

        return null;
    }

    /**
     * @returns {Promise<void>}
     */
    async cleanup() {
        clearInterval(this.#cleanupInterval);
        info('Cleaning up and sending remaining slack messages...');

        const promises = [];
        for (const [url, buffer] of this.#slackBuffers.entries()) {
            if (buffer.timer) {
                clearTimeout(buffer.timer);
            }

            if (buffer.messages.length > 0) {
                const text = buffer.messages.join('\n');
                buffer.messages = []; // Clear the messages after queuing them to send
                promises.push(
                    this.#getWebhook(url).send({ text })
                        .catch(err => info(`Failed to send slack notification during cleanup: ${err.message}`))
                );
            }
        }

        await Promise.all(promises);
        info('Cleanup finished.');
    }
}
