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

export { default as HttpClientImproved } from "./HttpClientImproved.js";
export { RequestBuilder } from "./RequestBuilder.js";
export { QueueManager } from "./QueueManager.js";
export { CacheManager } from "./CacheManager.js";
export { RateLimiter } from "./RateLimiter.js";

export type {
  HttpClientOptions,
  HttpClientInterface,
  RequestInterface,
  RetryOptions,
  LogLevel,
  LoggerFunction,
} from "../../Types/index.js";

export type { CacheManagerOptions } from "./CacheManager.js";
export type { RateLimiterConfig } from "./RateLimiter.js";
