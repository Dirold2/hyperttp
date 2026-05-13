"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseConverter = exports.RequestExecutor = exports.RequestBuilder = exports.RateLimiter = exports.QueueManager = exports.MetricsManager = exports.InterceptorManager = exports.HttpClientImproved = exports.CacheManager = void 0;
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
var CacheManager_js_1 = require("./CacheManager.js");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return CacheManager_js_1.CacheManager; } });
var HttpClientImproved_js_1 = require("./HttpClientImproved.js");
Object.defineProperty(exports, "HttpClientImproved", { enumerable: true, get: function () { return __importDefault(HttpClientImproved_js_1).default; } });
var InterceptorManager_js_1 = require("./InterceptorManager.js");
Object.defineProperty(exports, "InterceptorManager", { enumerable: true, get: function () { return InterceptorManager_js_1.InterceptorManager; } });
var MetricsManager_js_1 = require("./MetricsManager.js");
Object.defineProperty(exports, "MetricsManager", { enumerable: true, get: function () { return MetricsManager_js_1.MetricsManager; } });
var QueueManager_js_1 = require("./QueueManager.js");
Object.defineProperty(exports, "QueueManager", { enumerable: true, get: function () { return QueueManager_js_1.QueueManager; } });
var RateLimiter_js_1 = require("./RateLimiter.js");
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return RateLimiter_js_1.RateLimiter; } });
var RequestBuilder_js_1 = require("./RequestBuilder.js");
Object.defineProperty(exports, "RequestBuilder", { enumerable: true, get: function () { return RequestBuilder_js_1.RequestBuilder; } });
var RequestExecutor_js_1 = require("./RequestExecutor.js");
Object.defineProperty(exports, "RequestExecutor", { enumerable: true, get: function () { return RequestExecutor_js_1.RequestExecutor; } });
var ResponseConverter_js_1 = require("./ResponseConverter.js");
Object.defineProperty(exports, "ResponseConverter", { enumerable: true, get: function () { return ResponseConverter_js_1.ResponseConverter; } });
__exportStar(require("../../Types/index.js"), exports);
//# sourceMappingURL=index.js.map