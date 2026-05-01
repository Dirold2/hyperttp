/**
 * @interface RateLimiterConfig
 * @en Configuration for the token bucket rate limiter.
 * @ru Конфигурация для ограничителя частоты запросов (алгоритм Token Bucket).
 */
export interface RateLimiterConfig {
    /** * @en Maximum number of requests allowed within the window.
     * @ru Максимальное количество запросов, разрешенных в пределах окна.
     * @default 100
     */
    maxRequests?: number;
    /** * @en Time window in milliseconds.
     * @ru Временное окно в миллисекундах.
     * @default 60000 (1 minute)
     */
    windowMs?: number;
}
/**
 * @class RateLimiter
 * @en Smooth rate limiting using the Token Bucket algorithm.
 * Allows for short bursts while maintaining a steady long-term rate.
 * @ru Плавное ограничение частоты запросов с использованием алгоритма Token Bucket.
 * Позволяет кратковременные всплески, сохраняя стабильную скорость в долгосрочной перспективе.
 */
export declare class RateLimiter {
    private tokens;
    private lastRefill;
    private readonly max;
    private readonly window;
    private readonly refillRate;
    constructor(config?: RateLimiterConfig);
    /**
     * @en Waits until enough tokens are available and consumes them.
     * @ru Ожидает появления достаточного количества токенов и потребляет их.
     * @param tokensNeeded - Number of tokens to consume (default: 1)
     */
    wait(tokensNeeded?: number): Promise<void>;
    /**
     * @en Attempts to consume tokens immediately.
     * @ru Пытается немедленно потребить токены.
     * @returns true if tokens were consumed, false otherwise (limit exceeded).
     */
    tryConsume(tokensNeeded?: number): boolean;
    /**
     * @en Internal method to refill the bucket based on elapsed time.
     * @ru Внутренний метод для пополнения корзины на основе прошедшего времени.
     */
    private refill;
    /**
     * @en Returns the number of currently "used" slots.
     * @ru Возвращает количество текущих "занятых" слотов.
     */
    get currentCount(): number;
    /**
     * @en Returns how many requests can be made right now.
     * @ru Возвращает количество запросов, которые можно выполнить прямо сейчас.
     */
    get remainingRequests(): number;
    /**
     * @en Estimated time in ms until the next token is available.
     * @ru Ожидаемое время в мс до появления следующего токена.
     */
    get timeToReset(): number;
    /**
     * @en Instantly refills the bucket to its maximum capacity.
     * @ru Мгновенно пополняет корзину до максимальной емкости.
     */
    reset(): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map