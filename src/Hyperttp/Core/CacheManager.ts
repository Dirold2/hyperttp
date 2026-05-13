import { LRUCache } from "lru-cache";
import { CacheEntry, CacheManagerOptions } from "../../Types/cache";

/**
 * @class CacheManager
 * @en High-performance in-memory cache based on LRU strategy.
 * Provides TTL support, metadata storage (etag, lastModified) and fast key-value access.
 *
 * @ru Высокопроизводительный in-memory кэш на основе LRU стратегии.
 * Поддерживает TTL, хранение метаданных (etag, lastModified) и быстрый доступ по ключу.
 */
export class CacheManager {
  private readonly cache: LRUCache<string, CacheEntry<any>>;

  constructor(options?: CacheManagerOptions) {
    this.cache = new LRUCache({
      max: options?.cacheMaxSize ?? 500,
      ttl: options?.cacheTTL ?? 300_000,
      updateAgeOnGet: true,
    });
  }

  /**
   * @en Retrieves cached value by key.
   * @ru Получает значение из кэша по ключу.
   *
   * @template T
   * @param key Cache key
   * @returns Cached value or undefined if not found
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key)?.data;
  }

  /**
   * @en Stores value in cache.
   * @ru Сохраняет значение в кэш.
   *
   * @template T
   * @param key Cache key
   * @param value Value to store
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
    });
  }

  /**
   * @en Retrieves cached entry with metadata (etag, lastModified).
   * @ru Получает запись кэша вместе с метаданными (etag, lastModified).
   *
   * @template T
   * @param key Cache key
   * @returns Cached entry with metadata or undefined
   */
  getWithMetadata<T>(key: string):
    | {
        data: T;
        etag?: string;
        lastModified?: string;
      }
    | undefined {
    return this.cache.get(key);
  }

  /**
   * @en Stores value with optional HTTP metadata (etag, lastModified).
   * @ru Сохраняет значение с дополнительными HTTP метаданными (etag, lastModified).
   *
   * @template T
   * @param key Cache key
   * @param data Value to store
   * @param meta Optional HTTP metadata
   */
  setWithMetadata<T>(
    key: string,
    data: T,
    meta?: {
      etag?: string;
      lastModified?: string;
    },
  ): void {
    this.cache.set(key, {
      data,
      etag: meta?.etag,
      lastModified: meta?.lastModified,
    });
  }

  /**
   * @en Checks if key exists in cache.
   * @ru Проверяет наличие ключа в кэше.
   *
   * @param key Cache key
   * @returns true if exists, otherwise false
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * @en Deletes value from cache by key.
   * @ru Удаляет значение из кэша по ключу.
   *
   * @param key Cache key
   * @returns true if value was removed
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * @en Clears entire cache.
   * @ru Очищает весь кэш.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * @en Returns current cache size.
   * @ru Возвращает текущий размер кэша.
   */
  get size(): number {
    return this.cache.size;
  }
}
