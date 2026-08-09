import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ResponseTest from './ResponseTest.js';
import ValidationFailed from './errors/ValidationFailed.js';

describe('ResponseTest', () => {
    it('executes validators successfully when all pass', async () => {
        class MockRequest {
            constructor(url) {
                this.url = url;
            }
        }

        const mockValidator = {
            setRequest: () => {},
            isValid$: async () => true,
            errorMessage$: async () => ''
        };

        const responseTest = new ResponseTest({
            name: 'Test 1',
            url: 'https://example.com',
            request: MockRequest,
            validators: [mockValidator]
        });

        await assert.doesNotReject(async () => {
            await responseTest.execute$();
        });
    });

    it('throws ValidationFailed when any validator fails', async () => {
        class MockRequest {
            constructor(url) {
                this.url = url;
            }
        }

        const mockValidator = {
            setRequest: () => {},
            isValid$: async () => false,
            errorMessage$: async () => 'Status code was 500'
        };

        const responseTest = new ResponseTest({
            name: 'Failing Test',
            url: 'https://example.com',
            request: MockRequest,
            validators: [mockValidator]
        });

        await assert.rejects(
            async () => {
                await responseTest.execute$();
            },
            (err) => {
                assert.ok(err instanceof ValidationFailed);
                assert.equal(err.message, 'Test "Failing Test" failed for the URL "https://example.com". Status code was 500');
                return true;
            }
        );
    });
});
