export interface CacheEntry<T> {
    data: T;
    etag?: string;
    lastModified?: string;
}
export interface CacheManagerOptions {
    cacheTTL?: number;
    cacheMaxSize?: number;
}
//# sourceMappingURL=cache.d.ts.map