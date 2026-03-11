import JsFetch from "./lib/requests/JsFetch.js";
import {d, info, log, now} from "./lib/helpers.js";
import ResponseTest from "./lib/ResponseTest.js";
import IsStatusCode from "./lib/validators/IsStatusCode.js";
import HasText from "./lib/validators/HasText.js";
import ValidationFailed from "./lib/errors/ValidationFailed.js";
import HasLoadedWithinMs from "./lib/validators/HasLoadedWithinMs.js";

/**
 * @typedef {{name: string, url: string, runEveryMs: number, request: JsFetch, validators: AbstractValidator[]}} Test
 * @property {typeof JsFetch} request // Tells the IDE this can be "newed"
 */

/**
 * @type {Test[]}
 */
const tests = [
    {
        name: 'systemit.lv',
        url: 'https://systemit.lv/tvaika-barjeras',
        runEveryMs: 60000, // 1 minute
        request: JsFetch,
        validators: [
            new IsStatusCode(200),
            new HasText('Systemit. All Rights Reserved.'),
            new HasLoadedWithinMs(1000)
        ]
    }
];
let currentTestIx = null;

/**
 * @returns {Test|null}
 */
function getNextTest() {
    if (!tests.length) {
        return null;
    }

    currentTestIx = currentTestIx === null ? 0 : (currentTestIx + 1 >= tests.length ? 0 : currentTestIx + 1);

    const test = tests[currentTestIx];

    // return the server if it was never pinged or the runEveryMinute time has passed since the last run
    let lastCheckTime = test.lastCheckTime;
    if (!lastCheckTime || Math.floor(new Date() - lastCheckTime) >= test.runEveryMs) {
        return tests[currentTestIx];
    }

    return null;
}

setInterval(async function() {
    const test = getNextTest();
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
        } else {
            throw err; // unknown error, rethrow it
        }
    }
}, 99);
