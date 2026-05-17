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
export { CacheManager } from "./CacheManager.js";
export { default as HttpClientImproved } from "./HttpClientImproved.js";
export { InterceptorManager } from "./InterceptorManager.js";
export { MetricsManager } from "./MetricsManager.js";
export { QueueManager } from "./QueueManager.js";
export { RateLimiter } from "./RateLimiter.js";
export { RequestBuilder } from "./RequestBuilder.js";
export { RequestExecutor } from "./RequestExecutor.js";
export { RequestProfiler } from "./RequestProfiler.js";
export { ResponseConverter } from "./ResponseConverter.js";

export * from "../../Types/index.js";
export type * from "../../Types/index.js";
