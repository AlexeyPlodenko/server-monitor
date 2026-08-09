import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import IsValidWebmanifest from './IsValidWebmanifest.js';

describe('IsValidWebmanifest', () => {
    it('returns true for a valid minimal webmanifest JSON object', async () => {
        const content = JSON.stringify({
            name: 'My Application',
            short_name: 'App',
            start_url: '/'
        });

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns true for a complete valid webmanifest with icons, screenshots, and shortcuts', async () => {
        const manifest = {
            name: 'Complete Web App',
            short_name: 'WebApp',
            description: 'A test application manifest',
            start_url: '/index.html',
            display: 'standalone',
            orientation: 'portrait',
            dir: 'ltr',
            lang: 'en-US',
            theme_color: '#317EFB',
            background_color: '#ffffff',
            scope: '/',
            id: 'com.example.webapp',
            icons: [
                {
                    src: '/icons/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: '/icons/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ],
            screenshots: [
                {
                    src: '/screenshots/home.png',
                    sizes: '1280x720',
                    type: 'image/png',
                    form_factor: 'wide',
                    label: 'Homescreen'
                }
            ],
            shortcuts: [
                {
                    name: 'New Document',
                    url: '/new'
                }
            ],
            categories: ['productivity', 'utilities'],
            related_applications: [
                {
                    platform: 'play',
                    url: 'https://play.google.com/store/apps/details?id=com.example.app'
                }
            ],
            prefer_related_applications: false
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when content is HTML instead of JSON', async () => {
        const content = `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body><h1>404 Not Found</h1></body>
</html>`;

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /appears to be HTML/i);
    });

    it('returns false when content is invalid JSON syntax', async () => {
        const content = '{ "name": "App", "short_name": }';

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => content
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /not valid JSON/i);
    });

    it('returns false when root JSON is not an object', async () => {
        const arrayContent = JSON.stringify([{ name: 'App' }]);

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => arrayContent
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Root JSON value must be an object/i);
    });

    it('returns false for empty body by default', async () => {
        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => ''
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /content is empty/i);
    });

    it('returns true for empty body when allowEmpty option is true', async () => {
        const validator = new IsValidWebmanifest({ allowEmpty: true });
        validator.setRequest({
            getResponseText$: async () => '   '
        });

        assert.equal(await validator.isValid$(), true);
    });

    it('returns false when string property has non-string type', async () => {
        const manifest = { name: 12345 };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Property "name" must be a string/i);
    });

    it('returns false when icons is not an array', async () => {
        const manifest = { icons: 'not-an-array' };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Property "icons" must be an array/i);
    });

    it('returns false when icon item is missing src string', async () => {
        const manifest = {
            icons: [
                { sizes: '192x192', type: 'image/png' }
            ]
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /must have a non-empty "src" string/i);
    });

    it('returns false when icon attribute has invalid type', async () => {
        const manifest = {
            icons: [
                { src: '/icon.png', sizes: 192 }
            ]
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /"sizes" must be a string/i);
    });

    it('returns false when screenshots element is missing src', async () => {
        const manifest = {
            screenshots: [
                { sizes: '1280x720' }
            ]
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Screenshot at index 0 must have a non-empty "src" string/i);
    });

    it('returns false when shortcuts element is missing name or url', async () => {
        const manifest = {
            shortcuts: [
                { name: 'Shortcut' }
            ]
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /must have a non-empty "url" string/i);
    });

    it('returns false when categories element is not a string', async () => {
        const manifest = {
            categories: [123]
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Category at index 0 must be a string/i);
    });

    it('returns false when prefer_related_applications is not a boolean', async () => {
        const manifest = {
            prefer_related_applications: 'yes'
        };

        const validator = new IsValidWebmanifest();
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifest)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Property "prefer_related_applications" must be a boolean/i);
    });

    it('enforces requireName option', async () => {
        const manifestWithoutName = { short_name: 'App' };

        const validator = new IsValidWebmanifest({ requireName: true });
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifestWithoutName)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Missing or empty required "name" property/i);
    });

    it('enforces requireIcons option', async () => {
        const manifestWithoutIcons = { name: 'App' };

        const validator = new IsValidWebmanifest({ requireIcons: true });
        validator.setRequest({
            getResponseText$: async () => JSON.stringify(manifestWithoutIcons)
        });

        assert.equal(await validator.isValid$(), false);
        assert.match(await validator.errorMessage$(), /Missing or empty required "icons" array/i);
    });

    it('returns false when input content is non-string', async () => {
        const result = IsValidWebmanifest.parseWebmanifest(12345);
        assert.equal(result.valid, false);
        assert.equal(result.error, 'Webmanifest content is not a string.');
    });
});
