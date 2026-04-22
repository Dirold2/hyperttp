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
export declare class CacheManager {
    private cache;
    private ttl;
    constructor(options?: CacheManagerOptions);
    getWithMetadata<T>(key: string): Promise<{
        data: T;
        etag?: string;
        lastModified?: string;
        isExpired: boolean;
    } | null>;
    setWithMetadata<T>(key: string, data: T, meta: {
        etag?: any;
        lastModified?: any;
    }): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
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