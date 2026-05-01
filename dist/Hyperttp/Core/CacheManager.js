"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
/**
 * @class CacheManager
 */
class CacheManager {
    cache;
    ttl;
    constructor(options) {
        this.ttl = options?.cacheTTL ?? 300_000;
        this.cache = new lru_cache_1.LRUCache({
            max: options?.cacheMaxSize ?? 500,
            ttl: this.ttl,
            updateAgeOnGet: true,
        });
    }
    /**
     * @en Retrieves data along with HTTP validation metadata.
     */
    async getWithMetadata(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const isExpired = Date.now() - entry.timestamp > this.ttl;
        return {
            data: entry.data,
            etag: entry.etag,
            lastModified: entry.lastModified,
            isExpired,
        };
    }
    /**
     * @en Stores data with optional ETag and Last-Modified headers.
     */
    async setWithMetadata(key, data, meta) {
        this.cache.set(key, {
            data,
            etag: typeof meta.etag === "string" ? meta.etag : undefined,
            lastModified: typeof meta.lastModified === "string" ? meta.lastModified : undefined,
            timestamp: Date.now(),
        });
    }
    /**
     * @en Gets an item from cache.
     */
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        return entry.data;
    }
    /**
     * @en Standard async set method.
     */
    async set(key, value) {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
        });
    }
    /**
     * @en Checks if key exists and is not expired.
     */
    async has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        const isExpired = Date.now() - entry.timestamp > this.ttl;
        if (isExpired) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    async delete(key) {
        return this.cache.delete(key);
    }
    async clear() {
        this.cache.clear();
    }
    // --- Synchronous Methods ---
    getSync(key) {
        return this.cache.get(key)?.data;
    }
    setSync(key, value) {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
        });
    }
    hasSync(key) {
        return this.cache.has(key);
    }
    deleteSync(key) {
        return this.cache.delete(key);
    }
    clearSync() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map