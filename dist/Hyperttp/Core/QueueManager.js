"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
class QueueManager {
    maxConcurrent;
    running = 0;
    size = 0;
    head = null;
    tail = null;
    constructor(maxConcurrent = 50) {
        this.maxConcurrent = maxConcurrent;
    }
    async enqueue(executor) {
        if (this.running < this.maxConcurrent) {
            return this.runTask(executor);
        }
        return new Promise((resolve, reject) => {
            const newNode = { executor, resolve, reject, next: null };
            if (!this.tail) {
                this.head = newNode;
                this.tail = newNode;
            }
            else {
                this.tail.next = newNode;
                this.tail = newNode;
            }
            this.size++;
        });
    }
    async runTask(executor, resolve, reject) {
        this.running++;
        try {
            const result = await executor();
            resolve?.(result);
            return result;
        }
        catch (error) {
            reject?.(error);
            throw error;
        }
        finally {
            this.running--;
            this.processQueue();
        }
    }
    processQueue() {
        while (this.running < this.maxConcurrent && this.head) {
            const task = this.head;
            this.head = this.head.next;
            if (!this.head) {
                this.tail = null;
            }
            this.size--;
            queueMicrotask(() => {
                this.runTask(task.executor, task.resolve, task.reject);
            });
        }
    }
    get activeCount() {
        return this.running;
    }
    get queuedCount() {
        return this.size;
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=QueueManager.js.map