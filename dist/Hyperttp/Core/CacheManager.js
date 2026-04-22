"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const lru_cache_1 = require("lru-cache");
class CacheManager {
    cache;
    ttl;
    constructor(options) {
        this.ttl = options?.cacheTTL ?? 300_000;
        this.cache = new lru_cache_1.LRUCache({
            max: options?.cacheMaxSize ?? 500,
            updateAgeOnGet: false,
        });
    }
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
    async setWithMetadata(key, data, meta) {
        this.cache.set(key, {
            data,
            etag: typeof meta.etag === "string" ? meta.etag : undefined,
            lastModified: typeof meta.lastModified === "string" ? meta.lastModified : undefined,
            timestamp: Date.now(),
        });
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        const isExpired = Date.now() - entry.timestamp > this.ttl;
        if (isExpired) {
            this.cache.delete(key);
            return undefined;
        }
        entry.timestamp = Date.now();
        this.cache.set(key, entry);
        return entry.data;
    }
    async set(key, value) {
        await this.setWithMetadata(key, value, {});
    }
    async has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        // Если время жизни истекло — для метода has() записи "нет"
        const isExpired = Date.now() - entry.timestamp > this.ttl;
        if (isExpired) {
            // Опционально: удаляем сразу, чтобы не забивать память
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
    getSync(key) {
        return this.cache.get(key);
    }
    setSync(key, value) {
        this.setWithMetadata(key, value, {});
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