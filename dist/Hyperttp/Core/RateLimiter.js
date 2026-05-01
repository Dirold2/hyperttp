"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * @class RateLimiter
 * @en Smooth rate limiting using the Token Bucket algorithm.
 * Allows for short bursts while maintaining a steady long-term rate.
 * @ru Плавное ограничение частоты запросов с использованием алгоритма Token Bucket.
 * Позволяет кратковременные всплески, сохраняя стабильную скорость в долгосрочной перспективе.
 */
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
    /**
     * @en Waits until enough tokens are available and consumes them.
     * @ru Ожидает появления достаточного количества токенов и потребляет их.
     * @param tokensNeeded - Number of tokens to consume (default: 1)
     */
    async wait(tokensNeeded = 1) {
        this.refill();
        tokensNeeded = Math.max(1, tokensNeeded);
        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return;
        }
        const deficit = tokensNeeded - this.tokens;
        const waitTimeMs = Math.ceil(deficit / this.refillRate);
        // Приостанавливаем выполнение на расчетное время
        await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
        this.refill();
        this.tokens -= tokensNeeded;
        this.tokens = Math.max(0, this.tokens);
    }
    /**
     * @en Attempts to consume tokens immediately.
     * @ru Пытается немедленно потребить токены.
     * @returns true if tokens were consumed, false otherwise (limit exceeded).
     */
    tryConsume(tokensNeeded = 1) {
        this.refill();
        tokensNeeded = Math.max(1, tokensNeeded);
        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
    /**
     * @en Internal method to refill the bucket based on elapsed time.
     * @ru Внутренний метод для пополнения корзины на основе прошедшего времени.
     */
    refill() {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        const newTokens = elapsedMs * this.refillRate;
        this.tokens = Math.min(this.max, this.tokens + newTokens);
        this.lastRefill = now;
    }
    /**
     * @en Returns the number of currently "used" slots.
     * @ru Возвращает количество текущих "занятых" слотов.
     */
    get currentCount() {
        this.refill();
        return Math.floor(this.max - this.tokens);
    }
    /**
     * @en Returns how many requests can be made right now.
     * @ru Возвращает количество запросов, которые можно выполнить прямо сейчас.
     */
    get remainingRequests() {
        this.refill();
        return Math.floor(this.tokens);
    }
    /**
     * @en Estimated time in ms until the next token is available.
     * @ru Ожидаемое время в мс до появления следующего токена.
     */
    get timeToReset() {
        this.refill();
        if (this.tokens >= 1)
            return 0;
        const deficitToOne = 1 - this.tokens;
        return Math.max(0, Math.ceil(deficitToOne / this.refillRate));
    }
    /**
     * @en Instantly refills the bucket to its maximum capacity.
     * @ru Мгновенно пополняет корзину до максимальной емкости.
     */
    reset() {
        this.tokens = this.max;
        this.lastRefill = Date.now();
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map