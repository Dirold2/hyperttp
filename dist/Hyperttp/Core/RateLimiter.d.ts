import type { RateLimitOptions } from "../../Types/options";
/**
 * @class RateLimiter
 * @en Token bucket rate limiter with FIFO wait queue.
 * @ru Rate limiter на основе token bucket с FIFO-очередью ожидания.
 */
export declare class RateLimiter {
    private readonly enabled;
    private readonly max;
    private readonly window;
    private readonly refillRate;
    private tokens;
    private lastRefill;
    private waiters;
    private timer;
    constructor(config?: RateLimitOptions);
    /**
     * @en Waits until enough tokens are available and consumes them.
     * @ru Ждёт появления достаточного числа токенов и потребляет их.
     */
    wait(tokensNeeded?: number): Promise<void>;
    /**
     * @en Attempts to consume tokens immediately.
     * @ru Пытается немедленно потребить токены.
     */
    tryConsume(tokensNeeded?: number): boolean;
    /**
     * @en Internal method to refill the bucket based on elapsed time.
     * @ru Внутренний метод пополнения корзины на основе прошедшего времени.
     */
    private refill;
    /**
     * @en Processes queued waiters in FIFO order.
     * @ru Обрабатывает ожидающие запросы в FIFO-порядке.
     */
    private drainQueue;
    /**
     * @en Schedules the next queue drain based on the next token refill time.
     * @ru Планирует следующий проход по очереди с учётом времени до следующего токена.
     */
    private scheduleDrain;
    /**
     * @en Returns the number of currently available tokens.
     * @ru Возвращает текущее число доступных токенов.
     */
    get remainingRequests(): number;
    /**
     * @en Returns the number of currently "used" slots.
     * @ru Возвращает число уже занятых слотов.
     */
    get currentCount(): number;
    /**
     * @en Estimated time in ms until the next token is available.
     * @ru Оценка времени в мс до появления следующего токена.
     */
    get timeToReset(): number;
    /**
     * @en Instantly refills the bucket to max capacity and clears waiting timers.
     * @ru Мгновенно пополняет корзину до максимума и очищает таймеры ожидания.
     */
    reset(): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map