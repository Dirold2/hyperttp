export interface RateLimiterConfig {
    maxRequests?: number;
    windowMs?: number;
}
export declare class RateLimiter {
    private tokens;
    private lastRefill;
    private readonly max;
    private readonly window;
    private readonly refillRate;
    constructor(config?: RateLimiterConfig);
    wait(tokensNeeded?: number): Promise<void>;
    tryConsume(tokensNeeded?: number): boolean;
    private refill;
    get currentCount(): number;
    get remainingRequests(): number;
    get timeToReset(): number;
    reset(): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map