import { describe, it, expect } from "vitest";
import { QueueManager } from "../src";

describe("QueueManager", () => {
  it("should run tasks respecting concurrency limit", async () => {
    const results: number[] = [];
    const queue = new QueueManager(2);

    await Promise.all([
      queue.enqueue(async () => {
        results.push(1);
      }),
      queue.enqueue(async () => {
        results.push(2);
      }),
      queue.enqueue(async () => {
        results.push(3);
      }),
    ]);

    expect(results.sort()).toEqual([1, 2, 3]);
    expect(queue.activeCount).toBe(0);
    expect(queue.queuedCount).toBe(0);
  });

  it("should correctly count active and queued tasks", async () => {
    const queue = new QueueManager(1);
    const results: number[] = [];

    const task1 = queue.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 50));
      results.push(1);
    });
    const task2 = queue.enqueue(async () => {
      results.push(2);
    });

    expect(queue.activeCount).toBe(1);
    expect(queue.queuedCount).toBe(1);

    await Promise.all([task1, task2]);
    expect(results).toEqual([1, 2]);
    expect(queue.activeCount).toBe(0);
    expect(queue.queuedCount).toBe(0);
  });
});
