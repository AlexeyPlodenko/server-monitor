import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Pinger from "./lib/Pinger.js";
import {d} from "./lib/helpers.js";
import AbstractValidator from "./lib/validators/AbstractValidator.js";

/**
 * @typedef {{name: string, url: string, runEveryMs: number, request: JsFetch, validators: AbstractValidator[]}} Test
 * @property {typeof JsFetch} request // Tells the IDE this can be "newed"
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tests = [];
const testsDir = path.resolve(__dirname, '../tests');
const testFiles = fs.readdirSync(testsDir).filter(file => file.endsWith('.js'));
for (const file of testFiles) {
    const module = await import(`file://${path.join(testsDir, file)}`);
    const testData = module.default || module;

    if (Array.isArray(testData)) {
        tests.push(...testData);
    } else {
        tests.push(testData);
    }
}

const app = new Pinger();
app.setTests(tests);
app.start();

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
        await app.cleanup();
        process.exit(0);
    });
});
