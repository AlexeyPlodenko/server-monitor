import JsFetch from "./lib/requests/JsFetch.js";
import IsStatusCode from "./lib/validators/IsStatusCode.js";
import HasText from "./lib/validators/HasText.js";
import HasLoadedWithinMs from "./lib/validators/HasLoadedWithinMs.js";
import Pinger from "./lib/Pinger.js";
import NotEmpty from "./lib/validators/NotEmpty.js";
import RedirectsToHttps from "./lib/validators/RedirectsToHttps.js";

/**
 * @typedef {{name: string, url: string, runEveryMs: number, request: JsFetch, validators: AbstractValidator[]}} Test
 * @property {typeof JsFetch} request // Tells the IDE this can be "newed"
 */

/**
 * @type {Test[]}
 */
const tests = [
    {
        name: 'systemit.lv/tvaika-barjeras loads',
        url: 'https://systemit.lv/tvaika-barjeras',
        runEveryMs: 60000, // 1 minute
        request: JsFetch,
        validators: [
            new IsStatusCode(200),
            new HasText('Systemit. All Rights Reserved.'),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
    {
        name: 'systemit.lv/tvaika-barjeras/ redirects',
        url: 'https://systemit.lv/tvaika-barjeras/',
        runEveryMs: 86400000, // 1 day
        request: JsFetch,
        validators: [
            new IsStatusCode(301),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
    {
        name: 'systemit.lv/robots.txt',
        url: 'https://systemit.lv/robots.txt',
        runEveryMs: 86400000, // 1 day
        request: JsFetch,
        validators: [
            new IsStatusCode(200),
            new NotEmpty(),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
    {
        name: 'systemit.lv HTTP to HTTPS redirect',
        url: 'http://systemit.lv',
        runEveryMs: 86400000, // 1 day
        request: JsFetch,
        validators: [
            new RedirectsToHttps([301]),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
    {
        name: 'systemit.lv HTTP www to HTTPS non-www redirect',
        url: 'http://www.systemit.lv/tvaika-barjeras',
        runEveryMs: 86400000, // 1 day
        request: JsFetch,
        validators: [
            new IsStatusCode([301, 307]),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
    {
        name: 'systemit.lv www to non-www redirect',
        url: 'https://www.systemit.lv/tvaika-barjeras',
        runEveryMs: 86400000, // 1 day
        request: JsFetch,
        validators: [
            new IsStatusCode([301, 307]),
            new HasLoadedWithinMs(1000)
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/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'
    },
];

const app = new Pinger();
app.setTests(tests);
app.start();

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
        await app.cleanup();
        process.exit(0);
    });
});
