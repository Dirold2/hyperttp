import { LRUCache } from "lru-cache";

export interface CacheEntry<T> {
  data: T;
  etag?: string;
  lastModified?: string;
  timestamp: number;
}

export interface CacheManagerOptions {
  cacheTTL?: number;
  cacheMaxSize?: number;
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry<any>>;
  private ttl: number;

  constructor(options?: CacheManagerOptions) {
    this.ttl = options?.cacheTTL ?? 300_000;
    this.cache = new LRUCache({
      max: options?.cacheMaxSize ?? 500,
      updateAgeOnGet: false,
    });
  }

  async getWithMetadata<T>(key: string): Promise<{
    data: T;
    etag?: string;
    lastModified?: string;
    isExpired: boolean;
  } | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttl;

    return {
      data: entry.data,
      etag: entry.etag,
      lastModified: entry.lastModified,
      isExpired,
    };
  }

  async setWithMetadata<T>(
    key: string,
    data: T,
    meta: { etag?: any; lastModified?: any },
  ): Promise<void> {
    this.cache.set(key, {
      data,
      etag: typeof meta.etag === "string" ? meta.etag : undefined,
      lastModified:
        typeof meta.lastModified === "string" ? meta.lastModified : undefined,
      timestamp: Date.now(),
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    entry.timestamp = Date.now();
    this.cache.set(key, entry);

    return entry.data as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.setWithMetadata(key, value, {});
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Если время жизни истекло — для метода has() записи "нет"
    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      // Опционально: удаляем сразу, чтобы не забивать память
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getSync<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  setSync<T>(key: string, value: T): void {
    this.setWithMetadata(key, value, {});
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

  get size(): number {
    return this.cache.size;
  }
}
