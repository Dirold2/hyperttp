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
export { MetricsManager } from "./MetricsManager.js";
export { InterceptorManager } from "./InterceptorManager.js";
export { RequestExecutor } from "./RequestExecutor.js";
export { ResponseTransformer } from "./ResponseTransformer.js";

export {
  HttpClientError,
  TimeoutError,
  RateLimitError,
} from "../../Types/index.js";

export type {
  HttpClientInterface,
  HttpClientOptions,
  RequestInterface,
  RequestConfig,
  RequestBodyData,
  RequestHeaders,
  RequestQuery,
  ResponseType,
  StreamResponse,
  RequestMetrics,
  RequestInterceptor,
  ResponseInterceptor,
  RetryOptions,
  LogLevel,
  Method,
} from "../../Types/index.js";

// Экспорт конфигураций конкретных менеджеров
export type { CacheManagerOptions } from "./CacheManager.js";
export type { RateLimiterConfig } from "./RateLimiter.js";
export type { MetricsConfig } from "./MetricsManager.js";
