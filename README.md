# ServerMonitor

A standalone script that monitors web services availability.

## First run

1. Create `/config.js` file:
    ```javascript
    export const config = {
        sendSlackMessages: true,
        cooldownMs: 1000,
        sameDomainDelayMs: 1000,
        stateSaveIntervalSeconds: 600
    };
    ```
2. Create the tests in the `/tests/` directory
3. Execute `pnpm install` to install NPM packages
4. Execute `pnpm run start`

## Tests

Create a `.js` file in the `/tests/` directory with the following structure:

```javascript
import JsFetch from "../src/lib/requests/JsFetch.js";
import IsStatusCode from "../src/lib/validators/IsStatusCode.js";
import HasText from "../src/lib/validators/HasText.js";
import HasLoadedWithinMs from "../src/lib/validators/HasLoadedWithinMs.js";
import NotEmpty from "../src/lib/validators/NotEmpty.js";
import RedirectsToHttps from "../src/lib/validators/RedirectsToHttps.js";

/**
 * @type {Test[]}
 */
export const tests = [
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
```

## Production run

Use `pm2` NPM package to manage your application in the production environment.

1. Install `Node.js` and `NPM` on your server
2. Install `pm2` on the server - `npm install pm2@latest -g`
3. Execute `pnpm install` to install NPM packages
4. Navigate to the project root and execute `pm2 start ecosystem.config.cjs --env production` to start the app
5. _Execute `pm2 install pm2-logrotate` to install logrotate module, to prevent excessive log file growth_
