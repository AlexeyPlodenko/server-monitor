import AbstractValidator from "./AbstractValidator.js";
import {d} from "../helpers.js";

const DEFAULT_STAGE_THRESHOLDS_MS = {
    dnsLookup: 100,
    tcpConnection: 100,
    tlsHandshake: 150,
    firstByte: 300,
    download: 200
};

export default class HasLoadedWithinMs extends AbstractValidator {
    /**
     * @type {number}
     */
    expectedLoadTimeMs;

    /**
     * @type {Object}
     */
    options;

    /**
     * @param {number} expectedLoadTimeMs
     * @param {Object} [options={}]
     * @param {Object} [options.stageThresholds] - Custom threshold limits per stage in ms
     * @param {string} [options.highlightTag=' ⚠️'] - Tag appended to slow timing stages
     */
    constructor(expectedLoadTimeMs, options = {}) {
        super();

        this.expectedLoadTimeMs = expectedLoadTimeMs;
        this.options = {
            stageThresholds: { ...DEFAULT_STAGE_THRESHOLDS_MS, ...(options.stageThresholds || {}) },
            highlightTag: options.highlightTag !== undefined ? options.highlightTag : ' ⚠️',
            ...options
        };
    }

    /**
     * @returns {Promise<number>}
     */
    async getValue$() {
        return this.getRequest().getLoadTimeMs$();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isValid$() {
        const loadedMs = await this.getValue$();
        return loadedMs < this.expectedLoadTimeMs;
    }

    /**
     * Helper to check if a stage timing is considered slow (exceeds threshold).
     * @param {string} stageKey
     * @param {number} valueMs
     * @returns {boolean}
     */
    isStageSlow(stageKey, valueMs) {
        if (valueMs == null) return false;

        const stageThresholds = this.options.stageThresholds || {};
        const threshold = stageThresholds[stageKey];

        if (threshold != null && valueMs > threshold) {
            return true;
        }

        return false;
    }

    /**
     * @returns {Promise<string>}
     */
    async errorMessage$() {
        const loadedMs = await this.getValue$();
        const request = this.getRequest();
        let message = `Failed to load within ${this.expectedLoadTimeMs}ms. Loaded in ${loadedMs}ms.`;

        if (typeof request.getTimings === 'function') {
            const timings = request.getTimings();
            if (timings) {
                const stages = [
                    { key: 'dnsLookup', label: 'DNS', val: timings.dnsLookup },
                    { key: 'tcpConnection', label: 'TCP', val: timings.tcpConnection },
                    { key: 'tlsHandshake', label: 'TLS', val: timings.tlsHandshake },
                    { key: 'firstByte', label: 'TTFB', val: timings.firstByte },
                    { key: 'download', label: 'Download', val: timings.download },
                ];

                const parts = [];
                const tag = this.options.highlightTag || '';

                for (const stage of stages) {
                    if (stage.val != null) {
                        const isSlow = this.isStageSlow(stage.key, stage.val);
                        const highlightStr = isSlow ? tag : '';
                        parts.push(`${stage.label}: ${stage.val}ms${highlightStr}`);
                    }
                }

                if (parts.length > 0) {
                    message += ` (${parts.join(', ')})`;
                }
            }
        }

        return message;
    }
}

