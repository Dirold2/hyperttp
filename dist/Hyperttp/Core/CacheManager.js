"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
/**
 * @class CacheManager
 * @en High-performance in-memory cache based on LRU strategy.
 * Provides TTL support, metadata storage (etag, lastModified) and fast key-value access.
 *
 * @ru Высокопроизводительный in-memory кэш на основе LRU стратегии.
 * Поддерживает TTL, хранение метаданных (etag, lastModified) и быстрый доступ по ключу.
 */
class CacheManager {
    cache;
    constructor(options) {
        this.cache = new lru_cache_1.LRUCache({
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
    get(key) {
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
    set(key, value) {
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
    getWithMetadata(key) {
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
    setWithMetadata(key, data, meta) {
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
    has(key) {
        return this.cache.has(key);
    }
    /**
     * @en Deletes value from cache by key.
     * @ru Удаляет значение из кэша по ключу.
     *
     * @param key Cache key
     * @returns true if value was removed
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * @en Clears entire cache.
     * @ru Очищает весь кэш.
     */
    clear() {
        this.cache.clear();
    }
    /**
     * @en Returns current cache size.
     * @ru Возвращает текущий размер кэша.
     */
    get size() {
        return this.cache.size;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map