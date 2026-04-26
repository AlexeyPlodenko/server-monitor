import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class Storage {
    #db;

    constructor() {
        const dbDir = path.resolve(__dirname, '../../state');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const dbPath = path.join(dbDir, 'state.db');
        this.#db = new Database(dbPath);
        this.#db.pragma('journal_mode = WAL');
    }

    /**
     * Initializes the database schema and performs any necessary migrations.
     *
     * @returns {Promise<void>}
     */
    async init$() {
        this.#db.exec(`
            CREATE TABLE IF NOT EXISTS test_state (
                id TEXT PRIMARY KEY,
                last_check_time INTEGER,
                config_hash TEXT
            );
            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        // Migration: Add config_hash if it doesn't exist (for existing databases)
        const info = this.#db.pragma('table_info(test_state)');
        if (!info.some(column => column.name === 'config_hash')) {
            this.#db.exec('ALTER TABLE test_state ADD COLUMN config_hash TEXT');
        }
    }

    /**
     * @param {{}} testStates
     * @returns {Promise<void>}
     */
    async saveTestStates$(testStates) {
        const stmt = this.#db.prepare('INSERT OR REPLACE INTO test_state (id, last_check_time, config_hash) VALUES (?, ?, ?)');
        const insertMany = this.#db.transaction((states) => {
            for (const [id, data] of Object.entries(states)) {
                const last_check_time = data.lastCheckTime === undefined ? null : data.lastCheckTime;
                stmt.run(id, last_check_time, data.hash);
            }
        });
        insertMany(testStates);
    }

    /**
     * @returns {Promise<{}>}
     */
    async getTestStates$() {
        const rows = this.#db.prepare('SELECT id, last_check_time, config_hash FROM test_state').all();
        const states = {};
        rows.forEach(row => {
            states[row.id] = {
                lastCheckTime: row.last_check_time,
                hash: row.config_hash
            };
        });
        return states;
    }

    /**
     * @param {string} key
     * @param {*} value
     * @returns {Promise<void>}
     */
    async saveAppState$(key, value) {
        const stmt = this.#db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)');
        stmt.run(key, JSON.stringify(value));
    }

    /**
     * @param {string} key
     * @returns {Promise<any|null>}
     */
    async getAppState$(key) {
        const row = this.#db.prepare('SELECT value FROM app_state WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : null;
    }

    /**
     * @returns {Promise<void>}
     */
    async close$() {
        this.#db.close();
    }
}
