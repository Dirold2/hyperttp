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
export { default as HttpClientImproved } from "./HttpClientImproved";
export { QueueManager } from "./QueueManager";
export { CacheManager } from "./CacheManager";
export { RateLimiter } from "./RateLimiter";
export type { HttpClientOptions, HttpClientInterface, RequestInterface, RetryOptions, LogLevel, LoggerFunction, } from "./HttpClientImproved";
export type { CacheManagerOptions } from "./CacheManager";
export type { RateLimiterConfig } from "./RateLimiter";
//# sourceMappingURL=index.d.ts.map