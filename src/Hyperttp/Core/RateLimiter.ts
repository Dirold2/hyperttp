/**
 * Configuration options for the RateLimiter
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed within the time window (default: 100) */
  maxRequests?: number;
  /** Time window in milliseconds (default: 60000ms / 1 minute) */
  windowMs?: number;
}

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
export class RateLimiter {
  private timestamps: number[] = [];
  private max: number;
  private window: number;

  /**
   * Creates a new RateLimiter instance
   * @param config - Configuration for rate limiting behavior
   */
  constructor(config?: RateLimiterConfig) {
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
  async wait(): Promise<void> {
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
  get currentCount(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.window);
    return this.timestamps.length;
  }

  /**
   * Resets the rate limiter, clearing all recorded timestamps
   */
  reset(): void {
    this.timestamps = [];
  }
}
