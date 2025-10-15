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
export declare class QueueManager {
    private maxConcurrent;
    private queue;
    private running;
    /**
     * Creates a new QueueManager instance
     * @param maxConcurrent - Maximum number of tasks that can run simultaneously (default: 50)
     */
    constructor(maxConcurrent?: number);
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
    enqueue<T>(executor: () => Promise<T>): Promise<T>;
    /**
     * Gets the current number of running tasks
     * @returns The number of currently executing tasks
     */
    get activeCount(): number;
    /**
     * Gets the number of tasks waiting in queue
     * @returns The number of queued tasks
     */
    get queuedCount(): number;
}
//# sourceMappingURL=QueueManager.d.ts.map