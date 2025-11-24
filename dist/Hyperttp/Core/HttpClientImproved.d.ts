import { CookieJar } from "tough-cookie";
import { type RateLimiterConfig } from "./RateLimiter";
import { ResponseType } from "../../Types";
/**
 * Custom error classes for better error handling
 */
export declare class HttpClientError extends Error {
    statusCode?: number | undefined;
    originalError?: Error | undefined;
    url?: string | undefined;
    method?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, originalError?: Error | undefined, url?: string | undefined, method?: string | undefined);
}
export declare class TimeoutError extends HttpClientError {
    constructor(url: string, timeout: number);
}
export declare class RateLimitError extends HttpClientError {
    retryAfter?: number | undefined;
    constructor(url: string, retryAfter?: number | undefined);
}
/**
 * Log levels for the HTTP client logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Logger function type for HTTP client operations
 */
export type LoggerFunction = (level: LogLevel, message: string, meta?: any) => void;
/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Base delay in milliseconds before first retry (default: 1000) */
    baseDelay: number;
    /** Maximum delay in milliseconds between retries (default: 30000) */
    maxDelay: number;
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryStatusCodes: number[];
    /** Whether to add random jitter to retry delays (default: true) */
    jitter: boolean;
}
/**
 * Request interceptor type
 */
export type RequestInterceptor = (config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
}) => Promise<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
}>;
/**
 * Response interceptor type
 */
export type ResponseInterceptor = (response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
}) => Promise<{
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
}>;
/**
 * Configuration options for the HttpClient
 */
export interface HttpClientOptions {
    /** Request timeout in milliseconds (default: 15000) */
    timeout?: number;
    /** Maximum number of concurrent requests (default: 50) */
    maxConcurrent?: number;
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Cache time-to-live in milliseconds (default: 300000) */
    cacheTTL?: number;
    /** Maximum cache size (default: 500) */
    cacheMaxSize?: number;
    /** Rate limiting configuration */
    rateLimit?: RateLimiterConfig;
    /** Custom User-Agent header (default: "Hyperttp/0.1.0 Node.js") */
    userAgent?: string;
    /** Logger function for debugging and monitoring */
    logger?: LoggerFunction;
    /** Custom retry options */
    retryOptions?: Partial<RetryOptions>;
    /** Follow redirects (default: true) */
    followRedirects?: boolean;
    /** Maximum redirects to follow (default: 5) */
    maxRedirects?: number;
}
/**
 * Interface for request objects
 */
export interface RequestInterface {
    /** Gets the full URL for the request */
    getURL(): string;
    /** Gets the request body data */
    getBodyData(): any;
    /** Gets the request headers */
    getHeaders(): Record<string, string>;
}
/**
 * Interface for HTTP client implementations
 */
export interface HttpClientInterface {
    /** Performs a GET request */
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /** Performs a POST request */
    post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /** Performs a PUT request */
    put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /** Performs a DELETE request */
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /** Performs a PATCH request */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /** Performs a HEAD request */
    head<T = any>(req: RequestInterface): Promise<void>;
    /** Clears the cache */
    clearCache(): void;
}
/**
 * Request metrics for tracking and monitoring
 */
export interface RequestMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    statusCode?: number;
    bytesReceived: number;
    bytesSent: number;
    retries: number;
    cached: boolean;
    url: string;
    method: string;
}
/**
 * Advanced HTTP client with built-in caching, rate limiting, request queuing,
 * automatic retries, cookie management, and response decompression.
 *
 * Features:
 * - Automatic request deduplication
 * - LRU caching with TTL
 * - Configurable rate limiting
 * - Concurrent request management
 * - Exponential backoff with jitter
 * - Cookie jar support
 * - Automatic response parsing (JSON/XML)
 * - Compression support (gzip, deflate, brotli)
 * - Request/Response interceptors
 * - Redirect following
 * - Request metrics tracking
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxConcurrent: 10,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 },
 *   logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta),
 *   followRedirects: true
 * });
 *
 * const data = await client.get(request);
 * ```
 */
export default class HttpClientImproved implements HttpClientInterface {
    private cookieJar;
    private agent;
    private cache;
    private queue;
    private limiter;
    private inflight;
    private retryOptions;
    private defaultHeaders;
    private options;
    private requestInterceptors;
    private responseInterceptors;
    private requestMetrics;
    /**
     * Creates a new HttpClient instance
     * @param options - Configuration options for the HTTP client
     */
    constructor(options?: HttpClientOptions);
    /**
     * Sets or updates default headers for all requests
     * @param headers - Headers to merge with existing default headers
     */
    setDefaultHeaders(headers: Record<string, string>): void;
    /**
     * Gets the cookie jar for manual cookie management
     * @returns The cookie jar instance
     */
    getCookieJar(): CookieJar;
    /**
     * Adds a request interceptor
     * @param interceptor - Function to intercept requests
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    /**
     * Adds a response interceptor
     * @param interceptor - Function to intercept responses
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    /**
     * Internal logging method
     * @private
     */
    private log;
    /**
     * Decompresses response body based on content encoding
     * @private
     */
    private decompress;
    /**
     * Calculates retry delay with exponential backoff and optional jitter
     * @private
     */
    private calcDelay;
    /**
     * Utility method for sleeping
     * @private
     */
    private sleep;
    /**
     * Applies request interceptors
     * @private
     */
    private applyRequestInterceptors;
    /**
     * Applies response interceptors
     * @private
     */
    private applyResponseInterceptors;
    /**
     * Sends an HTTP request with automatic retry logic and redirect following
     * @private
     */
    private sendWithRetry;
    /**
     * Parses Content-Type header
     * @private
     */
    private parseContentType;
    /**
     * Parses response body based on content type or responseType
     * @private
     */
    private parseResponse;
    /**
     * Internal request method with caching and deduplication
     * @private
     */
    private request;
    /**
     * Performs a GET request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and parameters
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     */
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a POST request
     */
    post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a PUT request
     */
    put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a DELETE request
     */
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a PATCH request
     */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a HEAD request
     */
    head(req: RequestInterface): Promise<void>;
    /**
     * Clears all cached responses
     */
    clearCache(): void;
    /**
     * Gets request metrics for a specific request
     */
    getMetrics(url: string, method: string): RequestMetrics | undefined;
    /**
     * Gets statistics about the HTTP client state
     */
    getStats(): {
        cacheSize: number;
        inflightRequests: number;
        queuedRequests: number;
        activeRequests: number;
        currentRateLimit: number;
    };
}
//# sourceMappingURL=HttpClientImproved.d.ts.map