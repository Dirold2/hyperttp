"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * Implements a sliding window rate limiter to control request frequency.
 */
class RateLimiter {
    timestamps = [];
    max;
    window;
    maxArraySize;
    constructor(config) {
        this.max = Math.max(1, config?.maxRequests ?? 100);
        this.window = Math.max(1, config?.windowMs ?? 60_000);
        this.maxArraySize = config?.maxArraySize ?? this.max * 2;
    }
    /**
     * Cleans up old timestamps efficiently
     */
    cleanup() {
        const now = Date.now();
        if (this.timestamps.length > this.maxArraySize) {
            this.timestamps = this.timestamps.filter((t) => now - t < this.window);
            return;
        }
        while (this.timestamps.length > 0 &&
            now - this.timestamps[0] >= this.window) {
            this.timestamps.shift();
        }
    }
    /**
     * Waits if necessary to respect the rate limit, then records the current request.
     */
    async wait() {
        this.cleanup();
        if (this.timestamps.length >= this.max) {
            const delay = this.timestamps[0] + this.window - Date.now();
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        this.timestamps.push(Date.now());
    }
    /**
     * Gets the current number of requests in the sliding window
     */
    get currentCount() {
        this.cleanup();
        return this.timestamps.length;
    }
    /**
     * Remaining requests in current window
     */
    get remainingRequests() {
        return Math.max(0, this.max - this.currentCount);
    }
    /**
     * Milliseconds until next reset
     */
    get timeToReset() {
        if (this.timestamps.length === 0)
            return 0;
        const now = Date.now();
        return this.timestamps[0] + this.window - now;
    }
    /**
     * Resets the rate limiter
     */
    reset() {
        this.timestamps.length = 0;
    }
    /**
     * Removes a specific timestamp (для removeToken pattern)
     */
    removeToken(timestamp) {
        const index = this.timestamps.indexOf(timestamp);
        if (index > -1) {
            this.timestamps.splice(index, 1);
            return true;
        }
        return false;
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map