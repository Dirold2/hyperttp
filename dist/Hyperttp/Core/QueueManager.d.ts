export declare class QueueManager {
    private maxConcurrent;
    private running;
    private size;
    private head;
    private tail;
    constructor(maxConcurrent?: number);
    enqueue<T>(executor: () => Promise<T>): Promise<T>;
    private runTask;
    private processQueue;
    get activeCount(): number;
    get queuedCount(): number;
}
//# sourceMappingURL=QueueManager.d.ts.map