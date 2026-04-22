"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.TimeoutError = exports.HttpClientError = exports.MetricsManager = exports.RateLimiter = exports.CacheManager = exports.QueueManager = exports.RequestBuilder = exports.HttpClientImproved = void 0;
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
var HttpClientImproved_js_1 = require("./HttpClientImproved.js");
Object.defineProperty(exports, "HttpClientImproved", { enumerable: true, get: function () { return __importDefault(HttpClientImproved_js_1).default; } });
var RequestBuilder_js_1 = require("./RequestBuilder.js");
Object.defineProperty(exports, "RequestBuilder", { enumerable: true, get: function () { return RequestBuilder_js_1.RequestBuilder; } });
var QueueManager_js_1 = require("./QueueManager.js");
Object.defineProperty(exports, "QueueManager", { enumerable: true, get: function () { return QueueManager_js_1.QueueManager; } });
var CacheManager_js_1 = require("./CacheManager.js");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return CacheManager_js_1.CacheManager; } });
var RateLimiter_js_1 = require("./RateLimiter.js");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return RateLimiter_js_1.RateLimiter; } });
var MetricsManager_js_1 = require("./MetricsManager.js");
Object.defineProperty(exports, "MetricsManager", { enumerable: true, get: function () { return MetricsManager_js_1.MetricsManager; } });
var index_js_1 = require("../../Types/index.js");
Object.defineProperty(exports, "HttpClientError", { enumerable: true, get: function () { return index_js_1.HttpClientError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return index_js_1.TimeoutError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return index_js_1.RateLimitError; } });
//# sourceMappingURL=index.js.map