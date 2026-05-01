import { LRUCache } from "lru-cache";

/**
 * @interface CacheEntry
 */
export interface CacheEntry<T> {
  data: T;
  etag?: string;
  lastModified?: string;
  timestamp: number;
}

/**
 * @interface CacheManagerOptions
 */
export interface CacheManagerOptions {
  cacheTTL?: number;
  cacheMaxSize?: number;
}

/**
 * @class CacheManager
 */
export class CacheManager {
  private cache: LRUCache<string, CacheEntry<unknown>>;
  private ttl: number;

  constructor(options?: CacheManagerOptions) {
    this.ttl = options?.cacheTTL ?? 300_000;
    this.cache = new LRUCache({
      max: options?.cacheMaxSize ?? 500,
      ttl: this.ttl,
      updateAgeOnGet: true,
    });
  }

  /**
   * @en Retrieves data along with HTTP validation metadata.
   */
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
      data: entry.data as T,
      etag: entry.etag,
      lastModified: entry.lastModified,
      isExpired,
    };
  }

  /**
   * @en Stores data with optional ETag and Last-Modified headers.
   */
  async setWithMetadata<T>(
    key: string,
    data: T,
    meta: { etag?: unknown; lastModified?: unknown },
  ): Promise<void> {
    this.cache.set(key, {
      data,
      etag: typeof meta.etag === "string" ? meta.etag : undefined,
      lastModified:
        typeof meta.lastModified === "string" ? meta.lastModified : undefined,
      timestamp: Date.now(),
    });
  }

  /**
   * @en Gets an item from cache.
   */
  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return entry.data as T;
  }

  /**
   * @en Standard async set method.
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  /**
   * @en Checks if key exists and is not expired.
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
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

  // --- Synchronous Methods ---

  getSync<T>(key: string): T | undefined {
    return this.cache.get(key)?.data as T | undefined;
  }

  setSync<T>(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
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
