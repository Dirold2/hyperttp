import { RateLimiter } from "@hyperttp/ratelimit";
import { describe, it, expect, vitest } from "vitest";

describe("RateLimiter", () => {
  it("should wait if limit exceeded", async () => {
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 2,
      windowMs: 100,
    });
    const times: number[] = [];

    const task = async () => {
      await limiter.wait();
      times.push(Date.now());
    };

    await Promise.all([task(), task(), task()]);

    expect(times.length).toBe(3);

    const duration = times[2] - times[0];

    expect(duration).toBeGreaterThanOrEqual(48);
    expect(duration).toBeLessThan(100);
  });

  it("should reset correctly", async () => {
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 2,
      windowMs: 100,
    });
    await limiter.wait();
    await limiter.wait();
    expect(limiter.currentCount).toBe(2);

    limiter.reset();
    expect(limiter.currentCount).toBe(0);
  });

  it("should reject waiting promises on reset", async () => {
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 1,
      windowMs: 1_000,
    });

    await limiter.wait();

    const waiting = limiter.wait();
    limiter.reset();

    await expect(waiting).rejects.toThrow("Rate limiter has been reset");
    expect(limiter.currentCount).toBe(0);
  });

  it("should naturally refill tokens over time", async () => {
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 2,
      windowMs: 50,
    });

    limiter.tryConsume(2);
    expect(limiter.tryConsume(1)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 35));

    expect(limiter.tryConsume(1)).toBe(true);
  });

  it("remainingRequests correct", async () => {
    const limiter = new RateLimiter({ enabled: true, maxRequests: 5 });
    await limiter.wait();
    await limiter.wait();
    expect(limiter.remainingRequests).toBe(3);
  });

  it("timeToReset accurate", async () => {
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 2,
      windowMs: 1000,
    });

    await limiter.wait();
    await limiter.wait();

    const resetTime = limiter.timeToReset;

    expect(resetTime).toBeGreaterThan(400);
    expect(resetTime).toBeLessThanOrEqual(500);
  });

  it("manual token consumption works", () => {
    vitest.useFakeTimers();
    const limiter = new RateLimiter({
      enabled: true,
      maxRequests: 10,
      windowMs: 1000,
    });

    limiter.tryConsume(5);

    expect(limiter.remainingRequests).toBe(5);
    expect(limiter.currentCount).toBe(5);

    vitest.useRealTimers();
  });
});
