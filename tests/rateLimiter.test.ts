import { describe, it, expect } from "vitest";
import { RateLimiter } from "../src";

describe("RateLimiter", () => {
  it("should wait if limit exceeded", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    const times: number[] = [];

    const task = async () => {
      await limiter.wait();
      times.push(Date.now());
    };

    await Promise.all([task(), task(), task()]);
    
    expect(times.length).toBe(3);
    expect(times[2] - times[0]).toBeGreaterThanOrEqual(90);
  });

  it("should reset correctly", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    await limiter.wait();
    await limiter.wait();
    expect(limiter.currentCount).toBe(2);

    limiter.reset();
    expect(limiter.currentCount).toBe(0);
  });

  it("cleanup removes old timestamps", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 50 });
    limiter['timestamps'] = [Date.now() - 60];
    await limiter.wait();
    expect(limiter.currentCount).toBe(1);
  });

  it("remainingRequests correct", async () => {
    const limiter = new RateLimiter({ maxRequests: 5 });
    await limiter.wait();
    await limiter.wait();
    expect(limiter.remainingRequests).toBe(3);
  });

  it("timeToReset accurate", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    await limiter.wait();
    const resetTime = limiter.timeToReset;
    expect(resetTime).toBeGreaterThan(900);
  });

  it("removeToken works", async () => {
    const limiter = new RateLimiter({ maxRequests: 2 });
    const ts = Date.now();
    limiter['timestamps'].push(ts);
    expect(limiter.removeToken(ts)).toBe(true);
    expect(limiter.currentCount).toBe(0);
  });
});
