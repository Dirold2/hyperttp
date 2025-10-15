"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * Implements a sliding window rate limiter to control request frequency.
 * Prevents exceeding a specified number of requests within a time window.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 });
 * await limiter.wait(); // Will delay if rate limit is exceeded
 * // Make your request here
 * ```
 */
class RateLimiter {
    timestamps = [];
    max;
    window;
    /**
     * Creates a new RateLimiter instance
     * @param config - Configuration for rate limiting behavior
     */
    constructor(config) {
        this.max = config?.maxRequests ?? 100;
        this.window = config?.windowMs ?? 60_000;
    }
    /**
     * Waits if necessary to respect the rate limit, then records the current request.
     * This method should be called before making each request.
     *
     * @returns A promise that resolves when it's safe to proceed with the request
     *
     * @example
     * ```ts
     * await limiter.wait();
     * const response = await fetch('https://api.example.com');
     * ```
     */
    async wait() {
        const now = Date.now();
        // Remove timestamps outside the current window
        this.timestamps = this.timestamps.filter((t) => now - t < this.window);
        // If we've hit the limit, wait until the oldest request expires
        if (this.timestamps.length >= this.max) {
            const delay = this.timestamps[0] + this.window - now;
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        // Record this request
        this.timestamps.push(Date.now());
    }
    /**
     * Gets the current number of requests in the sliding window
     * @returns The number of requests made within the current time window
     */
    get currentCount() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter((t) => now - t < this.window);
        return this.timestamps.length;
    }
    /**
     * Resets the rate limiter, clearing all recorded timestamps
     */
    reset() {
        this.timestamps = [];
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map