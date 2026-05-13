export declare class QueueManager {
    private readonly maxConcurrent;
    private running;
    private queued;
    private head;
    private tail;
    constructor(maxConcurrent?: number);
    enqueue<T>(executor: () => Promise<T>): Promise<T>;
    private drain;
    clear(): void;
    get activeCount(): number;
    get queuedCount(): number;
    get pending(): number;
    get isIdle(): boolean;
}
//# sourceMappingURL=QueueManager.d.ts.map