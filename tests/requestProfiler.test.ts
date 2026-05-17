import { describe, it, expect } from "vitest";
import { RequestProfiler } from "../src";

describe("RequestProfiler", () => {
  it("should profile latency, cpu and memory for async executor", async () => {
    const { result, profile } = await RequestProfiler.profile(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });

    expect(profile.wallClockEnd).toBeGreaterThanOrEqual(profile.wallClockStart);
    expect(profile.durationMs).toBeGreaterThanOrEqual(0);

    expect(profile.cpu.userMs).toBeGreaterThanOrEqual(0);
    expect(profile.cpu.systemMs).toBeGreaterThanOrEqual(0);
    expect(profile.cpu.totalMs).toBeGreaterThanOrEqual(0);
    expect(profile.cpu.percent).toBeGreaterThanOrEqual(0);

    expect(profile.memory.before.rss).toBeGreaterThan(0);
    expect(profile.memory.after.rss).toBeGreaterThan(0);
    expect(typeof profile.memory.delta.heapUsed).toBe("number");
  });
});