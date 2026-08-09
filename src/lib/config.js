import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../../config.js');
const exampleConfigPath = path.resolve(__dirname, '../../config.example.js');

let configModule;
if (fs.existsSync(configPath)) {
    configModule = await import('../../config.js');
} else if (fs.existsSync(exampleConfigPath)) {
    configModule = await import('../../config.example.js');
} else {
    configModule = {
        config: {
            sendSlackMessages: true,
            sendDiscordMessages: true,
            sendTelegramMessages: true,
            cooldownMs: 1000,
            sameDomainDelayMs: 1000,
            stateSaveIntervalSeconds: 600,
            deduplicationTimeoutMs: 3600000,
            logDateTime: true
        }
    };
}

export const config = configModule.config;
