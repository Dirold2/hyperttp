"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
class QueueManager {
    maxConcurrent;
    running = 0;
    queued = 0;
    head = null;
    tail = null;
    constructor(maxConcurrent = 50) {
        this.maxConcurrent = maxConcurrent;
    }
    enqueue(executor) {
        return new Promise((resolve, reject) => {
            const node = {
                executor,
                resolve: resolve,
                reject,
                next: null,
            };
            if (this.tail) {
                this.tail.next = node;
            }
            else {
                this.head = node;
            }
            this.tail = node;
            this.queued++;
            this.drain();
        });
    }
    drain() {
        while (this.running < this.maxConcurrent && this.head) {
            const task = this.head;
            this.head = task.next;
            if (!this.head) {
                this.tail = null;
            }
            this.queued--;
            this.running++;
            Promise.resolve()
                .then(task.executor)
                .then(task.resolve, task.reject)
                .finally(() => {
                this.running--;
                this.drain();
            });
        }
    }
    clear() {
        const error = new Error("Queue has been cleared");
        while (this.head) {
            const node = this.head;
            this.head = node.next;
            node.reject(error);
        }
        this.head = null;
        this.tail = null;
        this.queued = 0;
    }
    get activeCount() {
        return this.running;
    }
    get queuedCount() {
        return this.queued;
    }
    get pending() {
        return this.running + this.queued;
    }
    get isIdle() {
        return this.running === 0 && this.queued === 0;
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=QueueManager.js.map