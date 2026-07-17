# Agent Instructions - ServerMonitor

This project is a standalone Node.js script that monitors web services availability and sends notifications to Slack, Discord, and Telegram.

## Tech Stack
- **Runtime**: Node.js
- **Module System**: ES Modules (`"type": "module"` in `package.json`)
- **HTTP Client**: `undici` (used via `src/lib/requests/JsFetch.js`)
- **Database**: `better-sqlite3` (used for state management)
- **Formatting**: `.editorconfig` is present; follow existing indentation and style.

## Project Structure
- `src/`: Core application logic.
  - `src/lib/requests/`: Request implementations (e.g., `JsFetch`).
  - `src/lib/validators/`: Response validators (e.g., `IsStatusCode`, `HasText`).
- `tests/`: Directory for user-defined test configurations (JS files exporting a `tests` array).
- `config.js`: Global application configuration.
- `state/`: Directory for SQLite state files.
- `logs/`: Application logs.

## Coding Guidelines

### Adding New Tests
- Tests should be added as `.js` files in the `tests/` directory.
- Each file must export a `tests` array.
- Use existing validators from `src/lib/validators/`.
- Example test structure:
  ```javascript
  import JsFetch from "../src/lib/requests/JsFetch.js";
  import IsStatusCode from "../src/lib/validators/IsStatusCode.js";

  export const tests = [
      {
          name: 'Example Check',
          url: 'https://example.com',
          runEveryMs: 60000,
          request: JsFetch,
          validators: [new IsStatusCode(200)],
          // Optional: slackWebhookUrl, discordWebhookUrl, telegram
      }
  ];
  ```

### Naming Conventions
- Use `PascalCase` for classes (e.g., `Pinger`, `JsFetch`).
- Use `camelCase` for variables, properties, and filenames (except for classes).
- Use `snake_case` sparingly, primarily if required by external APIs.

### Patterns
- **Async/Await**: Use `async/await` for asynchronous operations.
- **Private Fields**: Use native private class fields (`#field`) where appropriate.
- **Error Handling**: Use custom error classes like `ValidationFailed` when a test check fails.
- **Logging**: Use the internal logging helpers (likely `info`, `error` imported in `src/lib/Pinger.js`).

## Common Tasks for Agents
1. **Adding a Validator**: Create a new class in `src/lib/validators/` that implements the validation logic and throws `ValidationFailed` on failure.
2. **Modifying Config**: Update `config.js` or the `config` object in memory.
3. **Debugging**: Check `logs/out.log` and `logs/errors.log` for runtime issues.
