import { IncomingWebhook } from '@slack/webhook';
import {d, info, now} from "./helpers.js";
import ResponseTest from "./ResponseTest.js";
import ValidationFailed from "./errors/ValidationFailed.js";

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

                    await this.#getWebhook(test.slackWebhookUrl).send({ text: err.message });
                } else {
                    throw err; // unknown error, rethrow it
                }
            }
        }, 99);

        return this;
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
}
