"use strict";
/**
 * HTTP Client Library
 *
 * A comprehensive HTTP client with advanced features including:
 * - Automatic caching with LRU eviction
 * - Rate limiting with sliding window
 * - Request queuing and concurrency control
 * - Automatic retries with exponential backoff
 * - Cookie management
 * - Request deduplication
 * - Response compression support
 *
 * @module http-client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.CacheManager = exports.QueueManager = exports.HttpClientImproved = void 0;
var HttpClientImproved_1 = require("./HttpClientImproved");
Object.defineProperty(exports, "HttpClientImproved", { enumerable: true, get: function () { return __importDefault(HttpClientImproved_1).default; } });
var QueueManager_1 = require("./QueueManager");
Object.defineProperty(exports, "QueueManager", { enumerable: true, get: function () { return QueueManager_1.QueueManager; } });
var CacheManager_1 = require("./CacheManager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return CacheManager_1.CacheManager; } });
var RateLimiter_1 = require("./RateLimiter");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return RateLimiter_1.RateLimiter; } });
//# sourceMappingURL=index.js.map