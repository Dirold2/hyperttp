/**
 * Configuration options for the RateLimiter
 */
export interface RateLimiterConfig {
    /** Maximum number of requests allowed within the time window (default: 100) */
    maxRequests?: number;
    /** Time window in milliseconds (default: 60000ms / 1 minute) */
    windowMs?: number;
    /** Maximum array size before aggressive cleanup (default: maxRequests * 2) */
    maxArraySize?: number;
}
/**
 * Implements a sliding window rate limiter to control request frequency.
 */
export declare class RateLimiter {
    private timestamps;
    private readonly max;
    private readonly window;
    private readonly maxArraySize;
    constructor(config?: RateLimiterConfig);
    /**
     * Cleans up old timestamps efficiently
     */
    private cleanup;
    /**
     * Waits if necessary to respect the rate limit, then records the current request.
     */
    wait(): Promise<void>;
    /**
     * Gets the current number of requests in the sliding window
     */
    get currentCount(): number;
    /**
     * Remaining requests in current window
     */
    get remainingRequests(): number;
    /**
     * Milliseconds until next reset
     */
    get timeToReset(): number;
    /**
     * Resets the rate limiter
     */
    reset(): void;
    /**
     * Removes a specific timestamp (для removeToken pattern)
     */
    removeToken(timestamp: number): boolean;
}
//# sourceMappingURL=RateLimiter.d.ts.map