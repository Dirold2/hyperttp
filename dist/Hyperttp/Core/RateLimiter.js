"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
/**
 * @class RateLimiter
 * @en Token bucket rate limiter with FIFO wait queue.
 * @ru Rate limiter на основе token bucket с FIFO-очередью ожидания.
 */
class RateLimiter {
    enabled;
    max;
    window;
    refillRate; // tokens per ms
    tokens;
    lastRefill;
    waiters = [];
    timer = null;
    constructor(config) {
        this.enabled = config?.enabled ?? false;
        this.max = Math.max(1, config?.maxRequests ?? 100);
        this.window = Math.max(1, config?.windowMs ?? 60_000);
        this.refillRate = this.max / this.window;
        this.tokens = this.max;
        this.lastRefill = Date.now();
    }
    /**
     * @en Waits until enough tokens are available and consumes them.
     * @ru Ждёт появления достаточного числа токенов и потребляет их.
     */
    async wait(tokensNeeded = 1) {
        if (!this.enabled)
            return;
        tokensNeeded = Math.max(1, Math.floor(tokensNeeded));
        if (tokensNeeded > this.max) {
            tokensNeeded = this.max;
        }
        this.refill();
        if (this.waiters.length === 0 && this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return;
        }
        return new Promise((resolve, reject) => {
            this.waiters.push({ tokensNeeded, resolve, reject });
            this.scheduleDrain();
        });
    }
    /**
     * @en Attempts to consume tokens immediately.
     * @ru Пытается немедленно потребить токены.
     */
    tryConsume(tokensNeeded = 1) {
        if (!this.enabled)
            return true;
        tokensNeeded = Math.max(1, Math.floor(tokensNeeded));
        if (tokensNeeded > this.max) {
            tokensNeeded = this.max;
        }
        this.refill();
        if (this.waiters.length === 0 && this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }
        return false;
    }
    /**
     * @en Internal method to refill the bucket based on elapsed time.
     * @ru Внутренний метод пополнения корзины на основе прошедшего времени.
     */
    refill() {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        if (elapsedMs <= 0)
            return;
        const added = elapsedMs * this.refillRate;
        if (added > 0) {
            this.tokens = Math.min(this.max, this.tokens + added);
            this.lastRefill = now;
        }
    }
    /**
     * @en Processes queued waiters in FIFO order.
     * @ru Обрабатывает ожидающие запросы в FIFO-порядке.
     */
    drainQueue() {
        this.timer = null;
        this.refill();
        while (this.waiters.length > 0) {
            const next = this.waiters[0];
            if (this.tokens < next.tokensNeeded) {
                break;
            }
            this.tokens -= next.tokensNeeded;
            this.waiters.shift();
            next.resolve();
        }
        if (this.waiters.length > 0) {
            this.scheduleDrain();
        }
    }
    /**
     * @en Schedules the next queue drain based on the next token refill time.
     * @ru Планирует следующий проход по очереди с учётом времени до следующего токена.
     */
    scheduleDrain() {
        if (this.timer || this.waiters.length === 0)
            return;
        const first = this.waiters[0];
        const needed = Math.max(0, first.tokensNeeded - this.tokens);
        if (needed <= 0) {
            queueMicrotask(() => this.drainQueue());
            return;
        }
        const waitMs = Math.ceil(needed / this.refillRate);
        this.timer = setTimeout(() => {
            this.drainQueue();
        }, Math.max(1, waitMs));
    }
    /**
     * @en Returns the number of currently available tokens.
     * @ru Возвращает текущее число доступных токенов.
     */
    get remainingRequests() {
        if (!this.enabled)
            return Number.POSITIVE_INFINITY;
        this.refill();
        return Math.max(0, Math.floor(this.tokens));
    }
    /**
     * @en Returns the number of currently "used" slots.
     * @ru Возвращает число уже занятых слотов.
     */
    get currentCount() {
        if (!this.enabled)
            return 0;
        this.refill();
        return Math.max(0, Math.floor(this.max - this.tokens));
    }
    /**
     * @en Estimated time in ms until the next token is available.
     * @ru Оценка времени в мс до появления следующего токена.
     */
    get timeToReset() {
        if (!this.enabled)
            return 0;
        this.refill();
        if (this.tokens >= 1)
            return 0;
        const deficit = 1 - this.tokens;
        return Math.max(0, Math.ceil(deficit / this.refillRate));
    }
    /**
     * @en Instantly refills the bucket to max capacity and clears waiting timers.
     * @ru Мгновенно пополняет корзину до максимума и очищает таймеры ожидания.
     */
    reset() {
        const error = new Error("Rate limiter has been reset");
        while (this.waiters.length > 0) {
            const waiter = this.waiters.shift();
            waiter?.reject(error);
        }
        this.tokens = this.max;
        this.lastRefill = Date.now();
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map