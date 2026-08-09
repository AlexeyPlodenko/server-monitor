# ServerMonitor Agent Instructions
Node.js web service monitor; notifies Slack/Discord/Telegram.

## Tech Stack & Structure
- ESM, `undici` (`src/lib/requests/JsFetch.js`), `better-sqlite3` (state). Follow `.editorconfig`.
- `src/`: Core logic.
  - `lib/requests/`: Request impls (`JsFetch`).
  - `lib/validators/`: Validators (`IsStatusCode`, `HasText`, `HasMimeType`, `HasBaseUrl`, `HasLoadedWithinMs`, `IsValidXml`, `IsValidRobotsTxt`, `IsValidSitemapXml`, `IsValidWebmanifest`, `NotEmpty`).
- `tests/`: JS files exporting `tests` array.
- `config.js`: Global config. `state/`: SQLite DBs. `logs/`: Logs.

## Guidelines
- **Tests**: Add `.js` files to `tests/`, export `tests` array.
  ```javascript
  import JsFetch from "../src/lib/requests/JsFetch.js";
  import IsStatusCode from "../src/lib/validators/IsStatusCode.js";
  export const tests = [{ name: 'Check', url: 'https://example.com', runEveryMs: 60000, request: JsFetch, validators: [new IsStatusCode(200)] /* Optional webhooks: slack, discord, telegram */ }];
  ```
- **Naming**: `PascalCase` classes, `camelCase` vars/files, `snake_case` for external APIs.
- **Patterns**: `async/await`, native private fields (`#field`), throw `ValidationFailed` on check failure, use internal logging.

## Tasks
1. **New Validator**: Class in `src/lib/validators/`, throws `ValidationFailed` on error.
2. **Config**: Update `config.js`.
3. **Debug**: Check `logs/out.log` & `logs/errors.log`.
