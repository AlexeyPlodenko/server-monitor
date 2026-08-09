import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, prettyPrintObject } from './helpers.js';

describe('helpers', () => {
    describe('formatDate', () => {
        it('formats a date to YYYY-MM-DD HH:mm:ss format', () => {
            const date = new Date(2026, 7, 9, 13, 5, 20); // 2026-08-09 13:05:20 local time
            const formatted = formatDate(date);
            assert.match(formatted, /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/);
            assert.ok(formatted.includes('2026-08-09'));
        });
    });

    describe('prettyPrintObject', () => {
        it('formats an object into a readable string', () => {
            const obj = { foo: 'bar', baz: 123 };
            const result = prettyPrintObject(obj);
            assert.ok(result.includes("foo: 'bar'"));
            assert.ok(result.includes('baz: 123'));
        });
    });
});
