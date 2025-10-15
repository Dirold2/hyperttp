"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
/**
 * Manages concurrent execution of asynchronous tasks with a configurable limit.
 * Uses a queue-based approach to prevent overwhelming the system with too many
 * simultaneous operations.
 *
 * @example
 * ```ts
 * const queue = new QueueManager(5); // Max 5 concurrent tasks
 * const result = await queue.enqueue(() => fetch('https://api.example.com'));
 * ```
 */
class QueueManager {
    maxConcurrent;
    queue = [];
    running = 0;
    /**
     * Creates a new QueueManager instance
     * @param maxConcurrent - Maximum number of tasks that can run simultaneously (default: 50)
     */
    constructor(maxConcurrent = 50) {
        this.maxConcurrent = maxConcurrent;
    }
    /**
     * Enqueues a task for execution, respecting the concurrency limit.
     * If the limit is reached, the task will wait in queue until a slot becomes available.
     *
     * @template T - The return type of the executor function
     * @param executor - An async function to execute
     * @returns A promise that resolves with the executor's result
     *
     * @example
     * ```ts
     * const data = await queue.enqueue(async () => {
     *   const response = await fetch('https://api.example.com/data');
     *   return response.json();
     * });
     * ```
     */
    async enqueue(executor) {
        // Wait if we've reached the concurrency limit
        if (this.running >= this.maxConcurrent) {
            await new Promise((resolve) => this.queue.push(resolve));
        }
        this.running++;
        try {
            return await executor();
        }
        finally {
            this.running--;
            // Process next task in queue
            const next = this.queue.shift();
            if (next)
                next();
        }
    }
    /**
     * Gets the current number of running tasks
     * @returns The number of currently executing tasks
     */
    get activeCount() {
        return this.running;
    }
    /**
     * Gets the number of tasks waiting in queue
     * @returns The number of queued tasks
     */
    get queuedCount() {
        return this.queue.length;
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=QueueManager.js.map