import { CookieJar } from "tough-cookie";
import { type RateLimiterConfig } from "./RateLimiter";
import { ResponseType } from '../../Types';
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
    get<T = any>(req: RequestInterface): Promise<T>;
    /** Performs a POST request */
    post<T = any>(req: RequestInterface): Promise<T>;
    /** Performs a PUT request */
    put<T = any>(req: RequestInterface): Promise<T>;
    /** Performs a DELETE request */
    delete<T = any>(req: RequestInterface): Promise<T>;
    /** Clears the cache */
    clearCache(): void;
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
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxConcurrent: 10,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 },
 *   logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta)
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
     * Sends an HTTP request with automatic retry logic
     * @private
     */
    private sendWithRetry;
    /**
     * Parses response body based on content type or responseType
     * @private
     * @param res Response object
     * @param responseType Optional type of response: 'json' | 'text' | 'buffer' | 'xml'
     * @returns Parsed response
     *
     * @example
     * ```ts
     * const res = await client.get(req, 'json');   // JSON
     * const text = await client.get(req, 'text');  // Plain text
     * const buf = await client.get(req, 'buffer'); // Buffer
     * const xml = await client.get(req, 'xml');    // XML parsed as object
     * ```
     */
    private parseResponse;
    /**
     * Internal request method with caching and deduplication
     * @private
     * @param method HTTP method
     * @param req Request object
     * @param useCache Whether to use cache (GET requests)
     * @param responseType Type of response: 'json' | 'text' | 'buffer' | 'xml'
     */
    private request;
    /**
     * Performs a GET request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and parameters
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.get(req); // Default JSON
     * const text = await client.get(req, 'text'); // Plain text
     * const buf = await client.get(req, 'buffer'); // Buffer
     * const xml = await client.get(req, 'xml'); // Parsed XML
     * ```
     */
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a POST request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.post(req); // Default JSON
     * const text = await client.post(req, 'text'); // Plain text
     * const buf = await client.post(req, 'buffer'); // Buffer
     * const xml = await client.post(req, 'xml'); // Parsed XML
     * ```
     */
    post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a PUT request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.put(req); // Default JSON
     * const text = await client.put(req, 'text'); // Plain text
     * const buf = await client.put(req, 'buffer'); // Buffer
     * const xml = await client.put(req, 'xml'); // Parsed XML
     * ```
     */
    put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a DELETE request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and optional body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.delete(req); // Default JSON
     * const text = await client.delete(req, 'text'); // Plain text
     * const buf = await client.delete(req, 'buffer'); // Buffer
     * const xml = await client.delete(req, 'xml'); // Parsed XML
     * ```
     */
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs a PATCH request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.patch(req); // Default JSON
     * const text = await client.patch(req, 'text'); // Plain text
     * const buf = await client.patch(req, 'buffer'); // Buffer
     * const xml = await client.patch(req, 'xml'); // Parsed XML
     * ```
     */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Clears all cached responses
     */
    clearCache(): void;
    /**
     * Gets statistics about the HTTP client state
     * @returns Object containing current state information
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