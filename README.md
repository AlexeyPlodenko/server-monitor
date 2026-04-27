# ServerMonitor

A standalone Node.js script that monitors web services availability and sends notifications to Slack, Discord and/or Telegram.

The following tests for an HTTP endpoint can be performed:

* HTTP connect time
* HTTP response time
* HTTP status code
* Page has text
* Page is not empty
* HTTP endpoint redirects to HTTPS

## First run

1. Create `/config.js` file (check the Configuration section for details):
    ```javascript
    export const config = {
        sendSlackMessages: true,
        sendDiscordMessages: true,
        sendTelegramMessages: true,
        cooldownMs: 1000,
        sameDomainDelayMs: 1000,
        stateSaveIntervalSeconds: 600,
        deduplicationTimeoutMs: 3600000
    };
    ```
2. Create the tests in the `/tests/` directory
3. Execute `npm install` to install NPM packages
4. Add your first tests file. See the Tests section for examples
5. Execute `npm start`

## Configuration

The `config.js` file contains global settings for the application:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sendSlackMessages` | Boolean | - | Enable or disable Slack notifications globally. |
| `sendDiscordMessages` | Boolean | - | Enable or disable Discord notifications globally. |
| `sendTelegramMessages` | Boolean | - | Enable or disable Telegram notifications globally. |
| `cooldownMs` | Number | `1000` | Delay in milliseconds before starting tests after application launch. |
| `sameDomainDelayMs` | Number | `1000` | Minimum delay between consecutive tests targeting the same domain. |
| `stateSaveIntervalSeconds` | Number | `60` | Frequency in seconds at which the application state is saved to storage. |
| `deduplicationTimeoutMs` | Number | `3600000` | De-duplication Duration: Sets how long a message remains in memory; during this time, no duplicate alerts will be sent. |

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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD',
        discordWebhookUrl: 'https://discordapp.com/api/webhooks/1498216742525348/1qy81VQB5d_DiSihata241vXyp9JU5g1_FKo2N',
        telegram: {
            botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
            chatId: '123456789'
        }
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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD'
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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD'
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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD'
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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD'
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
        slackWebhookUrl: 'https://hooks.slack.com/services/T0A6TTQGAGL/B0ALD9RFUBT/1z5Rqt0LxeB8XD'
    },
];
```

## Production run

Use `pm2` NPM package to manage your application in the production environment.

1. Install `Node.js` and `NPM` on your server
2. Install `pm2` on the server - `npm install pm2@latest -g`
3. Execute `npm i` to install NPM packages
4. Navigate to the project root and execute `pm2 start ecosystem.config.cjs --env production` to start the app
5. _Execute `pm2 install pm2-logrotate` to install logrotate module, to prevent excessive log file growth_

### PM2 Configuration Details

The application is configured with the following parameters in `ecosystem.config.cjs`:

* **Name:** `server-monitor-pinger`
* **Script:** `./src/pinger.js`
* **Restart Policy:**
    * **Cron Restart:** `0 3 * * *` (restarts every day at 3 AM)
    * **Max Memory Restart:** `1000M`
* **Logging:**
    * **Log Date Format:** `YYYY-MM-DD HH:mm:ss`
    * **Output Log:** `./logs/out.log`
    * **Error Log:** `./logs/errors.log`
    * **Combined Logs:** Enabled
* **Environments:**
    * `development`: Default environment
    * `production`: Production environment (set with `--env production`)
