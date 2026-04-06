import { LRUCache } from "lru-cache";

export interface CacheManagerOptions {
  /** TTL для элементов в миллисекундах (по умолчанию 5 минут) */
  cacheTTL?: number;
  /** Максимальное количество элементов в кэше (по умолчанию 500) */
  cacheMaxSize?: number;
}

export class CacheManager {
  private cache: LRUCache<string, any>;
  private ttl: number;

  constructor(options?: CacheManagerOptions) {
    this.ttl = options?.cacheTTL ?? 300_000;
    this.cache = new LRUCache({
      max: options?.cacheMaxSize ?? 500,
      ttl: this.ttl,
      updateAgeOnGet: true,
    });
  }

  // ----------------------
  // Async API
  // ----------------------
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // ----------------------
  // Sync API (супербыстрый)
  // ----------------------
  getSync<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  setSync<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  hasSync(key: string): boolean {
    return this.cache.has(key);
  }

  deleteSync(key: string): boolean {
    return this.cache.delete(key);
  }

  clearSync(): void {
    this.cache.clear();
  }

  /** Количество элементов в кэше */
  get size(): number {
    return this.cache.size;
  }
}
