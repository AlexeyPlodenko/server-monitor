import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Pinger from "./lib/Pinger.js";
import {d, info, error} from "./lib/helpers.js";
import AbstractValidator from "./lib/validators/AbstractValidator.js";

/**
 * @typedef {{name: string, url: string, runEveryMs: number, request: JsFetch, validators: AbstractValidator[]}} Test
 * @property {typeof JsFetch} request // Tells the IDE this can be "newed"
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '../tests');

const testsByFile = new Map();
const app = new Pinger();

/**
 * Loads or reloads a specific test file.
 *
 * @param {string} filename
 */
async function loadTestFile(filename) {
    const filePath = path.join(testsDir, filename);

    if (!fs.existsSync(filePath)) {
        testsByFile.delete(filename);
        return;
    }

    try {
        // Use a cache-busting query parameter for ESM imports to allow reloading
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(`${fileUrl}?update=${Date.now()}`);
        const testData = module.default || module;
        testsByFile.set(filename, Array.isArray(testData) ? testData : [testData]);
    } catch (err) {
        error(`Failed to load test file "${filename}": ${err.message}`);
    }
}

/**
 * Updates the Pinger instance with the current set of tests from all files.
 */
function updateAppTests() {
    const allTests = Array.from(testsByFile.values()).flat();
    app.setTests(allTests);
}

/**
 * Initial load of all tests in the directory.
 */
async function loadAllTests() {
    if (!fs.existsSync(testsDir)) {
        return;
    }

    const files = fs.readdirSync(testsDir).filter(file => file.endsWith('.js'));
    await Promise.all(files.map(file => loadTestFile(file)));
}

// Initializing the app
await loadAllTests();
updateAppTests();
app.start();

// Monitor tests directory for changes
let reloadTimeout;
fs.watch(testsDir, (eventType, filename) => {
    if (!filename || filename.endsWith('.js')) {
        clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(async () => {
            if (filename) {
                info(`Test file change detected: ${filename} (${eventType}). Reloading...`);
                await loadTestFile(filename);
            } else {
                info(`Changes detected in tests directory. Reloading all tests...`);
                await loadAllTests();
            }
            updateAppTests();
        }, 200);
    }
});

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
        await app.cleanup();
        process.exit(0);
    });
});
