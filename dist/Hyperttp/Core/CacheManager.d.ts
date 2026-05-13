import { CacheManagerOptions } from "../../Types/cache";
/**
 * @class CacheManager
 * @en High-performance in-memory cache based on LRU strategy.
 * Provides TTL support, metadata storage (etag, lastModified) and fast key-value access.
 *
 * @ru Высокопроизводительный in-memory кэш на основе LRU стратегии.
 * Поддерживает TTL, хранение метаданных (etag, lastModified) и быстрый доступ по ключу.
 */
export declare class CacheManager {
    private readonly cache;
    constructor(options?: CacheManagerOptions);
    /**
     * @en Retrieves cached value by key.
     * @ru Получает значение из кэша по ключу.
     *
     * @template T
     * @param key Cache key
     * @returns Cached value or undefined if not found
     */
    get<T>(key: string): T | undefined;
    /**
     * @en Stores value in cache.
     * @ru Сохраняет значение в кэш.
     *
     * @template T
     * @param key Cache key
     * @param value Value to store
     */
    set<T>(key: string, value: T): void;
    /**
     * @en Retrieves cached entry with metadata (etag, lastModified).
     * @ru Получает запись кэша вместе с метаданными (etag, lastModified).
     *
     * @template T
     * @param key Cache key
     * @returns Cached entry with metadata or undefined
     */
    getWithMetadata<T>(key: string): {
        data: T;
        etag?: string;
        lastModified?: string;
    } | undefined;
    /**
     * @en Stores value with optional HTTP metadata (etag, lastModified).
     * @ru Сохраняет значение с дополнительными HTTP метаданными (etag, lastModified).
     *
     * @template T
     * @param key Cache key
     * @param data Value to store
     * @param meta Optional HTTP metadata
     */
    setWithMetadata<T>(key: string, data: T, meta?: {
        etag?: string;
        lastModified?: string;
    }): void;
    /**
     * @en Checks if key exists in cache.
     * @ru Проверяет наличие ключа в кэше.
     *
     * @param key Cache key
     * @returns true if exists, otherwise false
     */
    has(key: string): boolean;
    /**
     * @en Deletes value from cache by key.
     * @ru Удаляет значение из кэша по ключу.
     *
     * @param key Cache key
     * @returns true if value was removed
     */
    delete(key: string): boolean;
    /**
     * @en Clears entire cache.
     * @ru Очищает весь кэш.
     */
    clear(): void;
    /**
     * @en Returns current cache size.
     * @ru Возвращает текущий размер кэша.
     */
    get size(): number;
}
//# sourceMappingURL=CacheManager.d.ts.map