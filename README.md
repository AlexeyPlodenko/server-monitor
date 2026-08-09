# ServerMonitor

[![Node.js CI](https://github.com/AlexeyPlodenko/server-monitor/actions/workflows/test.yml/badge.svg)](https://github.com/AlexeyPlodenko/server-monitor/actions/workflows/test.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-96%20passing-brightgreen.svg)](https://github.com/AlexeyPlodenko/server-monitor)
[![License](https://img.shields.io/badge/license-Polyform-blue.svg)](package.json)

A standalone Node.js script that monitors web services availability and sends notifications to Slack, Discord and/or Telegram.

The following tests for an HTTP endpoint can be performed:

* HTTP status code verification (`IsStatusCode`)
* Response time threshold & network stage timing (`HasLoadedWithinMs`)
* Response MIME type validation (`HasMimeType`, `IsMimeType`)
* Text content presence check (`HasText`)
* Non-empty body check (`NotEmpty`)
* Base URL and HTTPS redirect validation (`HasBaseUrl`)
* XML document structure validation (`IsValidXml`)
* `robots.txt` format and directive validation (`IsValidRobotsTxt`)
* `sitemap.xml` structure and URL validation (`IsValidSitemapXml`)
* Web App Manifest (`site.webmanifest`) structure validation (`IsValidWebmanifest`)

You can monitor as many hosts (domains) at the same time as you want.

## Messages

<a href="https://plodenko.com/server-monitor/cli-log-output-example.png"><img src="https://plodenko.com/server-monitor/cli-log-output-example.png" height="200" style="margin: 0 5px 5px 0;" alt="CLI log output example" /></a>
<a href="https://plodenko.com/server-monitor/discord-log-example.png"><img src="https://plodenko.com/server-monitor/discord-log-example.png" height="200" style="margin: 0 5px 5px 0;" alt="Discord output example" /></a>
<a href="https://plodenko.com/server-monitor/slack-log-example.png"><img src="https://plodenko.com/server-monitor/slack-log-example.png" height="200" style="margin: 0 5px 5px 0;" alt="Slack output example" /></a>
<a href="https://plodenko.com/server-monitor/telegram-log-example.png"><img src="https://plodenko.com/server-monitor/telegram-log-example.png" height="200" style="margin: 0 5px 5px 0;" alt="Telegram output example" /></a>

<div style="clear: both;"></div>

## First run

1. Create `/config.js` file (check the Configuration section for details):
    ```javascript
    export const config = {
        sendSlackMessages: true,
        sendDiscordMessages: true,
        sendTelegramMessages: true,
        logDateTime: true,
        cooldownMs: 1000,
        sameDomainDelayMs: 1000,
        stateSaveIntervalSeconds: 600,
        deduplicationTimeoutMs: 3600000
    };
    ```
2. Create the tests in the `/tests/` directory
3. Execute `npm install` to install NPM packages
4. Add your first tests file. See the Tests section for examples

## Configuration

The `config.js` file contains global settings for the application:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sendSlackMessages` | Boolean | - | Enable or disable Slack notifications globally. |
| `sendDiscordMessages` | Boolean | - | Enable or disable Discord notifications globally. |
| `sendTelegramMessages` | Boolean | - | Enable or disable Telegram notifications globally. |
| `logDateTime` | Boolean | `false` | Enable or disable date and time in console output. |
| `cooldownMs` | Number | `1000` | Delay in milliseconds before starting tests after application launch. |
| `sameDomainDelayMs` | Number | `1000` | Minimum delay between consecutive tests targeting the same domain. |
| `stateSaveIntervalSeconds` | Number | `60` | Frequency in seconds at which the application state is saved to storage. |
| `deduplicationTimeoutMs` | Number | `3600000` | De-duplication Duration: Sets how long a message remains in memory; during this time, no duplicate alerts will be sent. |

## Tests

Create a `.js` file in the `/tests/` directory with the following structure:

```javascript
import JsFetch from "../src/lib/requests/JsFetch.js";
import IsStatusCode from "../src/lib/validators/IsStatusCode.js";
import HasMimeType from "../src/lib/validators/HasMimeType.js";
import HasText from "../src/lib/validators/HasText.js";
import HasLoadedWithinMs from "../src/lib/validators/HasLoadedWithinMs.js";
import NotEmpty from "../src/lib/validators/NotEmpty.js";
import HasBaseUrl from "../src/lib/validators/HasBaseUrl.js";
import IsValidXml from "../src/lib/validators/IsValidXml.js";
import IsValidRobotsTxt from "../src/lib/validators/IsValidRobotsTxt.js";
import IsValidSitemapXml from "../src/lib/validators/IsValidSitemapXml.js";
import IsValidWebmanifest from "../src/lib/validators/IsValidWebmanifest.js";

/**
 * @type {Test[]}
 */
export const tests = [
    {
        name: 'example.com loads',
        url: 'https://example.com',
        runEveryMs: 60000, // 1 minute
        request: JsFetch,
        validators: [
            new IsStatusCode(200),
            new HasText('Example Domain'),
            new HasLoadedWithinMs(1000),
            new HasBaseUrl('https://example.com')
        ],
        slackWebhookUrl: 'https://hooks.slack.com/services/XXX',
        discordWebhookUrl: 'https://discordapp.com/api/webhooks/XXX',
        telegram: {
            botToken: 'XXX',
            chatId: 'XXX'
        }
    }
];
```

### Available Validators

All validator classes are located in `src/lib/validators/` and extend `AbstractValidator`.

| Validator | Description | Usage Example |
|-----------|-------------|---------------|
| `IsStatusCode` | Verifies response HTTP status code. Accepts a single status code or an array of allowed status codes. | `new IsStatusCode(200)` or `new IsStatusCode([200, 301])` |
| `HasText` | Checks if the response body contains the specified string. | `new HasText('Example Domain')` |
| `NotEmpty` | Verifies that the response body is not empty. | `new NotEmpty()` |
| `HasMimeType` / `IsMimeType` | Validates `Content-Type` response header (supports wildcards like `text/*`). | `new HasMimeType('text/html')` or `new HasMimeType(['text/xml', 'application/xml'])` |
| `HasLoadedWithinMs` | Checks if total response time is within threshold. Optionally checks individual network stage latencies (dns, connect, tls). | `new HasLoadedWithinMs(1000)` |
| `HasBaseUrl` | Verifies final response/redirect origin matches expected base URL or list of allowed base URLs. | `new HasBaseUrl('https://example.com')` |
| `IsValidXml` | Validates XML syntax, root element, and proper tag nesting. | `new IsValidXml()` |
| `IsValidRobotsTxt` | Validates `robots.txt` format, record blocks, and directive rules. Options: `allowEmpty`, `requireUserAgent`, `requireSitemap`. | `new IsValidRobotsTxt({ requireUserAgent: true, requireSitemap: true })` |
| `IsValidSitemapXml` | Validates `sitemap.xml` structure (`<urlset>` or `<sitemapindex>`), `<loc>` URLs, `<lastmod>`, `<changefreq>`, and `<priority>`. | `new IsValidSitemapXml()` |
| `IsValidWebmanifest` | Validates Web App Manifest (`site.webmanifest`) JSON format and properties. Options: `allowEmpty`, `requireName`, `requireShortName`, `requireStartUrl`, `requireIcons`. | `new IsValidWebmanifest({ requireName: true, requireIcons: true })` |

## Code Stability & Testing

ServerMonitor maintains high code stability and reliability standards:

* **Automated Unit Testing Suite**: 96+ tests covering all HTTP request drivers, timing instrumentation, SQLite state storage, and validators using Node.js's native test runner (`node --test`).
* **Continuous Integration (CI)**: GitHub Actions workflow (`.github/workflows/test.yml`) automatically builds and tests code on every push and pull request.
* **Strict Validation Isolation**: Custom validators extend `AbstractValidator` and throw isolated `ValidationFailed` exceptions on check failure without crashing the monitoring process.
* **State & Notification Reliability**: Persistent SQLite state (`better-sqlite3`) prevents redundant duplicate alerts across restarts via configurable de-duplication timeout.

To run the unit test suite locally:

```bash
npm test
```

## Running with Docker

1. Ensure you have `Docker` and `Docker Compose` installed.
2. Create your `config.js` and add tests to the `/tests/` directory as described above.
3. Build and start the container:
   ```bash
   docker-compose up -d --build
   ```
4. View logs:
   ```bash
   docker logs -f server-monitor
   ```

## Production run (Alternative)

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
