export interface CacheManagerOptions {
    /** TTL для элементов в миллисекундах (по умолчанию 5 минут) */
    cacheTTL?: number;
    /** Максимальное количество элементов в кэше (по умолчанию 500) */
    cacheMaxSize?: number;
}
export declare class CacheManager {
    private cache;
    private ttl;
    constructor(options?: CacheManagerOptions);
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
    /** Количество элементов в кэше */
    get size(): number;
}
//# sourceMappingURL=CacheManager.d.ts.map