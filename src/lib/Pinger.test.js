import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Pinger from './Pinger.js';

describe('Pinger', () => {
    describe('formatErrorMessage', () => {
        it('formats error message with test name, url, error message, and code', () => {
            const test = {
                name: 'plevex.lv connects',
                url: 'https://plevex.lv/ru/catalogue'
            };
            const err = new Error('connect ECONNREFUSED 204.168.255.213:443');
            err.code = 'ECONNREFUSED';

            const formatted = Pinger.formatErrorMessage(test, err);
            assert.equal(
                formatted,
                'Test "plevex.lv connects" failed for the URL "https://plevex.lv/ru/catalogue". connect ECONNREFUSED 204.168.255.213:443 (code: ECONNREFUSED)'
            );
        });

        it('formats error message without code when err.code does not exist', () => {
            const test = {
                name: 'Timeout Check',
                url: 'https://example.com/api'
            };
            const err = new Error('Request timed out');

            const formatted = Pinger.formatErrorMessage(test, err);
            assert.equal(
                formatted,
                'Test "Timeout Check" failed for the URL "https://example.com/api". Request timed out'
            );
        });

        it('handles error with empty message', () => {
            const test = {
                name: 'Empty Error Check',
                url: 'https://example.com'
            };
            const err = new Error('');

            const formatted = Pinger.formatErrorMessage(test, err);
            assert.equal(
                formatted,
                'Test "Empty Error Check" failed for the URL "https://example.com". Unknown error'
            );
        });
    });
});
