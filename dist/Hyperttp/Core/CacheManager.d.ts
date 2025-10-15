/**
 * Configuration options for the CacheManager
 */
export interface CacheManagerOptions {
    /** Time-to-live for cached items in milliseconds (default: 300000ms / 5 minutes) */
    cacheTTL?: number;
    /** Maximum number of items to store in cache (default: 500) */
    cacheMaxSize?: number;
}
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
export declare class CacheManager {
    private cache;
    private ttl;
    /**
     * Creates a new CacheManager instance
     * @param options - Configuration options for cache behavior
     */
    constructor(options?: CacheManagerOptions);
    /**
     * Retrieves a value from the cache
     * @template T - The type of the cached value
     * @param key - The cache key to retrieve
     * @returns The cached value or null if not found or expired
     */
    get<T>(key: string): T | null;
    /**
     * Stores a value in the cache
     * @template T - The type of the value to cache
     * @param key - The cache key
     * @param value - The value to store
     */
    set<T>(key: string, value: T): void;
    /**
     * Checks if a key exists in the cache
     * @param key - The cache key to check
     * @returns True if the key exists and hasn't expired
     */
    has(key: string): boolean;
    /**
     * Removes a specific key from the cache
     * @param key - The cache key to delete
     * @returns True if the key was deleted, false if it didn't exist
     */
    delete(key: string): boolean;
    /**
     * Clears all entries from the cache
     */
    clear(): void;
    /**
     * Gets the current number of items in the cache
     * @returns The number of cached items
     */
    get size(): number;
}
//# sourceMappingURL=CacheManager.d.ts.map