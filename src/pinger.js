import JsFetch from "./lib/requests/JsFetch.js";
import IsStatusCode from "./lib/validators/IsStatusCode.js";
import HasText from "./lib/validators/HasText.js";
import HasLoadedWithinMs from "./lib/validators/HasLoadedWithinMs.js";
import Pinger from "./lib/Pinger.js";

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
            new HasLoadedWithinMs(100)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    }
];

const app = new Pinger();
app.setTests(tests);
app.start();
