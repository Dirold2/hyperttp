"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
/**
 * LRU (Least Recently Used) cache manager with TTL support.
 * Provides a simple key-value storage with automatic eviction of old entries.
 *
 * @example
 * ```ts
 * const cache = new CacheManager({ cacheTTL: 60000, cacheMaxSize: 100 });
 * cache.set('key', { data: 'value' });
 * const value = cache.get<{ data: string }>('key');
 * ```
 */
class CacheManager {
    cache;
    ttl;
    /**
     * Creates a new CacheManager instance
     * @param options - Configuration options for cache behavior
     */
    constructor(options) {
        this.ttl = options?.cacheTTL ?? 300_000;
        this.cache = new lru_cache_1.LRUCache({
            max: options?.cacheMaxSize ?? 500,
            ttl: this.ttl,
            updateAgeOnGet: true,
        });
    }
    /**
     * Retrieves a value from the cache
     * @template T - The type of the cached value
     * @param key - The cache key to retrieve
     * @returns The cached value or null if not found or expired
     */
    get(key) {
        return this.cache.get(key) ?? null;
    }
    /**
     * Stores a value in the cache
     * @template T - The type of the value to cache
     * @param key - The cache key
     * @param value - The value to store
     */
    set(key, value) {
        this.cache.set(key, value);
    }
    /**
     * Checks if a key exists in the cache
     * @param key - The cache key to check
     * @returns True if the key exists and hasn't expired
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Removes a specific key from the cache
     * @param key - The cache key to delete
     * @returns True if the key was deleted, false if it didn't exist
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clears all entries from the cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Gets the current number of items in the cache
     * @returns The number of cached items
     */
    get size() {
        return this.cache.size;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map