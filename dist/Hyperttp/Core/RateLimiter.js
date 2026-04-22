"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    tokens;
    lastRefill;
    max;
    window;
    refillRate; // tokens per ms
    constructor(config) {
        this.max = Math.max(1, config?.maxRequests ?? 100);
        this.window = Math.max(1, config?.windowMs ?? 60_000);
        this.refillRate = this.max / this.window;
        this.tokens = this.max;
        this.lastRefill = Date.now();
    }
    async wait(tokensNeeded = 1) {
        this.refill();
        tokensNeeded = Math.max(1, tokensNeeded);
        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return;
        }
        const deficit = tokensNeeded - this.tokens;
        const waitTimeMs = Math.ceil(deficit / this.refillRate);
        await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
        this.refill();
        this.tokens -= tokensNeeded;
        this.tokens = Math.max(0, this.tokens);
    }
    tryConsume(tokensNeeded = 1) {
        this.refill();
        tokensNeeded = Math.max(1, tokensNeeded);
        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
    refill() {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        const newTokens = elapsedMs * this.refillRate;
        this.tokens = Math.min(this.max, this.tokens + newTokens);
        this.lastRefill = now;
    }
    get currentCount() {
        this.refill();
        return Math.floor(this.max - this.tokens);
    }
    get remainingRequests() {
        this.refill();
        return Math.floor(this.tokens);
    }
    get timeToReset() {
        this.refill();
        if (this.tokens >= 1)
            return 0;
        const deficitToOne = 1 - this.tokens;
        return Math.ceil(deficitToOne / this.refillRate);
    }
    reset() {
        this.tokens = this.max;
        this.lastRefill = Date.now();
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map