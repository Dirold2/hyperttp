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
export declare class CacheManager {
    private cache;
    private ttl;
    constructor(options?: CacheManagerOptions);
    /**
     * @en Retrieves data along with HTTP validation metadata.
     */
    getWithMetadata<T>(key: string): Promise<{
        data: T;
        etag?: string;
        lastModified?: string;
        isExpired: boolean;
    } | null>;
    /**
     * @en Stores data with optional ETag and Last-Modified headers.
     */
    setWithMetadata<T>(key: string, data: T, meta: {
        etag?: unknown;
        lastModified?: unknown;
    }): Promise<void>;
    /**
     * @en Gets an item from cache.
     */
    get<T>(key: string): Promise<T | undefined>;
    /**
     * @en Standard async set method.
     */
    set<T>(key: string, value: T): Promise<void>;
    /**
     * @en Checks if key exists and is not expired.
     */
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    getSync<T>(key: string): T | undefined;
    setSync<T>(key: string, value: T): void;
    hasSync(key: string): boolean;
    deleteSync(key: string): boolean;
    clearSync(): void;
    get size(): number;
}
//# sourceMappingURL=CacheManager.d.ts.map