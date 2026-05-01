type QueueNode = {
  executor: () => Promise<any>;
  resolve: (v: any) => void;
  reject: (e: any) => void;
  next: QueueNode | null;
};

export class QueueManager {
  private running = 0;
  private size = 0;

  private head: QueueNode | null = null;
  private tail: QueueNode | null = null;

  constructor(private maxConcurrent = 50) {}

  async enqueue<T>(executor: () => Promise<T>): Promise<T> {
    if (this.running < this.maxConcurrent) {
      return this.runTask(executor);
    }

    return new Promise<T>((resolve, reject) => {
      const newNode: QueueNode = { executor, resolve, reject, next: null };

      if (!this.tail) {
        this.head = newNode;
        this.tail = newNode;
      } else {
        this.tail.next = newNode;
        this.tail = newNode;
      }
      this.size++;
    });
  }

  private async runTask<T>(
    executor: () => Promise<T>,
    resolve?: (v: T) => void,
    reject?: (e: any) => void,
  ): Promise<T> {
    this.running++;
    try {
      const result = await executor();
      resolve?.(result);
      return result;
    } catch (error) {
      reject?.(error);
      throw error;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue() {
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

  get activeCount(): number {
    return this.running;
  }

  get queuedCount(): number {
    return this.size;
  }
}
