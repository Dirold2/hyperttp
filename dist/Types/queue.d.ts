export type QueueExecutor = () => Promise<unknown>;
export type QueueNode = {
    executor: QueueExecutor;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    next: QueueNode | null;
};
//# sourceMappingURL=queue.d.ts.map