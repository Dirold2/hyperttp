import { QueueNode } from "../../Types/queue";

export class QueueManager {
  private running = 0;
  private queued = 0;
  private head: QueueNode | null = null;
  private tail: QueueNode | null = null;

  constructor(private readonly maxConcurrent = 50) {}

  enqueue<T>(executor: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const node: QueueNode = {
        executor,
        resolve: resolve as (value: unknown) => void,
        reject,
        next: null,
      };

      if (this.tail) {
        this.tail.next = node;
      } else {
        this.head = node;
      }

      this.tail = node;
      this.queued++;
      this.drain();
    });
  }

  private drain(): void {
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

  clear(): void {
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

  get activeCount(): number {
    return this.running;
  }

  get queuedCount(): number {
    return this.queued;
  }

  get pending(): number {
    return this.running + this.queued;
  }

  get isIdle(): boolean {
    return this.running === 0 && this.queued === 0;
  }
}
