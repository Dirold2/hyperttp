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
            ttl: this.ttl,
            updateAgeOnGet: true,
        });
    }
    // ----------------------
    // Async API
    // ----------------------
    async get(key) {
        return this.cache.get(key);
    }
    async set(key, value) {
        this.cache.set(key, value);
    }
    async has(key) {
        return this.cache.has(key);
    }
    async delete(key) {
        return this.cache.delete(key);
    }
    async clear() {
        this.cache.clear();
    }
    // ----------------------
    // Sync API (супербыстрый)
    // ----------------------
    getSync(key) {
        return this.cache.get(key);
    }
    setSync(key, value) {
        this.cache.set(key, value);
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
    /** Количество элементов в кэше */
    get size() {
        return this.cache.size;
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheManager.js.map