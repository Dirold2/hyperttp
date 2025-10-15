import { describe, it, expect } from "vitest";
import { RateLimiter } from "../src"; // поправь путь если нужно

describe("RateLimiter", () => {
  it("should wait if limit is exceeded", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    const times: number[] = [];

    const task = async () => {
      await limiter.wait();
      times.push(Date.now());
    };

    await Promise.all([task(), task(), task()]);

    expect(times.length).toBe(3);
    expect(times[2] - times[0]).toBeGreaterThanOrEqual(50);
  });

  it("should reset correctly", async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    await limiter.wait();
    await limiter.wait();
    expect(limiter.currentCount).toBe(2);

    limiter.reset();
    expect(limiter.currentCount).toBe(0);
  });
});
