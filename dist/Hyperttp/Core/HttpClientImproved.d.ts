import { type RateLimiterConfig } from "./RateLimiter";
import { ResponseType } from "../../Types";
/**
 * Base error class for HTTP client operations.
 * Contains additional context about the failed request including status code, URL, and method.
 */
export declare class HttpClientError extends Error {
    statusCode?: number | undefined;
    originalError?: Error | undefined;
    url?: string | undefined;
    method?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, originalError?: Error | undefined, url?: string | undefined, method?: string | undefined);
}
/**
 * Error thrown when an HTTP request exceeds the configured timeout duration.
 * Contains information about the URL and timeout value that caused the failure.
 */
export declare class TimeoutError extends HttpClientError {
    constructor(url: string, timeout: number);
}
/**
 * Error thrown when an HTTP request is rate limited by the server.
 * Contains information about the URL and optional retry-after duration.
 */
export declare class RateLimitError extends HttpClientError {
    retryAfter?: number | undefined;
    constructor(url: string, retryAfter?: number | undefined);
}
/**
 * Log level for HTTP client logging.
 * Defines the verbosity of log output from the client.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Function type for logging HTTP client events.
 * Used to customize how the client logs various events like requests, responses, and errors.
 *
 * @param level - The severity level of the log message
 * @param message - The log message content
 * @param meta - Optional additional context or metadata
 */
export type LoggerFunction = (level: LogLevel, message: string, meta?: any) => void;
/**
 * Configuration options for HTTP request retry behavior.
 * Defines how the client should handle failed requests and when to retry them.
 */
export interface RetryOptions {
    /** Maximum number of retry attempts before giving up */
    maxRetries: number;
    /** Base delay in milliseconds between retry attempts (exponential backoff) */
    baseDelay: number;
    /** Maximum delay in milliseconds between retry attempts */
    maxDelay: number;
    /** HTTP status codes that should trigger a retry */
    retryStatusCodes: number[];
    /** Whether to add random jitter to retry delays to prevent thundering herd */
    jitter: boolean;
}
/**
 * Function type for intercepting and modifying HTTP requests before they are sent.
 * Request interceptors can modify the URL, method, headers, or body of outgoing requests.
 *
 * @param config - The request configuration object
 * @returns A promise that resolves to the modified request configuration
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
 * Function type for intercepting and modifying HTTP responses before they are processed.
 * Response interceptors can modify the status, headers, body, or URL of incoming responses.
 *
 * @param response - The response object containing status, headers, body, and URL
 * @returns A promise that resolves to the modified response object
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
 * Configuration options for the HttpClientImproved instance.
 * Defines all the behavior settings for HTTP requests including timeouts, retries, caching, and more.
 */
export interface HttpClientOptions {
    /** Request timeout in milliseconds (default: 15000) */
    timeout?: number;
    /** Maximum number of concurrent requests (default: 50) */
    maxConcurrent?: number;
    /** Maximum number of retry attempts for failed requests (default: 3) */
    maxRetries?: number;
    /** Cache time-to-live in milliseconds (default: 300000) */
    cacheTTL?: number;
    /** Maximum number of cached entries (default: 500) */
    cacheMaxSize?: number;
    /** Rate limiting configuration to prevent overwhelming servers */
    rateLimit?: RateLimiterConfig;
    /** User-Agent string for HTTP requests (default: "Hyperttp/0.1.0 Node.js") */
    userAgent?: string;
    /** Custom logger function for HTTP client events */
    logger?: LoggerFunction;
    /** Retry behavior configuration */
    retryOptions?: Partial<RetryOptions>;
    /** Whether to automatically follow HTTP redirects (default: true) */
    followRedirects?: boolean;
    /** Maximum number of redirects to follow (default: 5) */
    maxRedirects?: number;
    /** Maximum response size in bytes (default: 1MB) */
    maxResponseBytes?: number;
    /** Function to validate HTTP status codes (default: 200-299) */
    validateStatus?: (status: number) => boolean;
    /** HTTP methods that should be cached (default: ["GET", "HEAD"]) */
    cacheMethods?: string[];
    /** Maximum number of request metrics to store (default: 10000) */
    maxMetricsSize?: number;
    /** Whether to enable verbose logging (default: false) */
    verbose?: boolean;
}
/**
 * Interface for defining HTTP request parameters.
 * Used to encapsulate URL, headers, and body data for HTTP requests.
 *
 * @example
 * ```ts
 * class ApiRequest implements RequestInterface {
 *   constructor(
 *     private url: string,
 *     private headers: Record<string, string> = {},
 *     private body?: any
 *   ) {}
 *
 *   getURL(): string { return this.url; }
 *   getHeaders(): Record<string, string> { return this.headers; }
 *   getBodyData(): any { return this.body; }
 * }
 * ```
 */
export interface RequestInterface {
    /** Returns the full URL for the HTTP request */
    getURL(): string;
    /** Returns the request body data (string, Buffer, or any serializable object) */
    getBodyData(): any;
    /** Returns the HTTP headers for the request */
    getHeaders(): Record<string, string>;
}
/**
 * Interface defining the contract for HTTP client implementations.
 * Provides methods for making HTTP requests with various HTTP methods.
 */
export interface HttpClientInterface {
    /**
     * Makes an HTTP GET request
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP POST request
     * @param req - Request configuration or URL string
     * @param body - Request body data
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    post<T = any>(req: RequestInterface, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP PUT request
     * @param req - Request configuration or URL string
     * @param body - Request body data
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    put<T = any>(req: RequestInterface, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP DELETE request
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP PATCH request
     * @param req - Request configuration
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP HEAD request
     * @param req - Request configuration or URL string
     * @returns Promise resolving to status and headers
     */
    head(req: RequestInterface): Promise<{
        status: number;
        headers: Record<string, any>;
    }>;
    /**
     * Clears the internal cache of the HTTP client
     */
    clearCache(): void;
}
/**
 * Metrics collected for HTTP requests to monitor performance and behavior.
 * Contains timing information, response details, and caching information.
 */
export interface RequestMetrics {
    /** Timestamp when the request started */
    startTime: number;
    /** Timestamp when the request completed */
    endTime: number;
    /** Total duration of the request in milliseconds */
    duration: number;
    /** HTTP status code of the response (if available) */
    statusCode?: number;
    /** Number of bytes received in the response */
    bytesReceived: number;
    /** Number of bytes sent in the request body */
    bytesSent: number;
    /** Number of retry attempts made for this request */
    retries: number;
    /** Whether the response was served from cache */
    cached: boolean;
    /** URL of the request */
    url: string;
    /** HTTP method used (GET, POST, etc.) */
    method: string;
    /** Hash of the request body for cache key generation */
    bodyHash?: string;
}
/**
 * @ru
 * Улучшенный HTTP-клиент с кэшированием, ограничением скорости, логикой повторных попыток и расширенными функциями.
 * Предоставляет надежный интерфейс для выполнения HTTP-запросов с автоматической обработкой
 * распространенных паттернов, таких как повторные попытки, кэширование и перехват запросов/ответов.
 * @en
 * Enhanced HTTP client with caching, rate limiting, retry logic, and advanced features.
 * Provides a robust interface for making HTTP requests with automatic handling of
 * common patterns like retries, caching, and request/response interception.
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxRetries: 3,
 *   cacheTTL: 300000,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 }
 * });
 *
 * const response = await client.get('https://api.example.com/data');
 * ```
 *
 * @example
 * ```ts
 * // Using the fluent request builder
 * const client = new HttpClientImproved();
 * const response = await client.request('https://api.example.com/data')
 *   .headers({ 'Authorization': 'Bearer token' })
 *   .json()
 *   .send();
 * ```
 *
 * @example
 * ```ts
 * // Using RequestInterface for complex requests
 * import { RequestInterface } from './src';
 *
 * class ApiRequest implements RequestInterface {
 *   constructor(
 *     private url: string,
 *     private headers: Record<string, string> = {},
 *     private body?: any
 *   ) {}
 *
 *   getURL(): string { return this.url; }
 *   getHeaders(): Record<string, string> { return this.headers; }
 *   getBodyData(): any { return this.body; }
 * }
 *
 * const client = new HttpClientImproved();
 * const request = new ApiRequest('https://api.example.com/data');
 * const response = await client.get(request);
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
    constructor(options?: HttpClientOptions);
    private log;
    /**
     * Creates a hash of the request body for cache key generation.
     * @param body - Request body (string or Buffer)
     * @returns SHA1 hash of the body, truncated to 8 characters
     */
    private hashBody;
    /**
     * Calculates the delay for retry attempts using exponential backoff.
     * @param attempt - Current retry attempt number (0-based)
     * @returns Delay in milliseconds
     */
    private calcDelay;
    /**
     * Creates a promise that resolves after the specified delay.
     * @param ms - Delay in milliseconds
     * @returns Promise that resolves after the delay
     */
    private sleep;
    /**
     * Applies all registered request interceptors to modify the request configuration.
     * Interceptors are executed in sequence, with each one receiving the output of the previous.
     * @param config - Original request configuration
     * @returns Modified request configuration
     */
    private applyRequestInterceptors;
    /**
     * Applies all registered response interceptors to modify the response data.
     * Interceptors are executed in sequence, with each one receiving the output of the previous.
     * @param response - Original response data
     * @returns Modified response data
     */
    private applyResponseInterceptors;
    /**
     * Resolves a redirect location relative to the base URL.
     * Handles both absolute and relative redirect URLs.
     * @param location - The redirect location from the response
     * @param baseUrl - The original request URL
     * @returns The resolved absolute URL
     */
    private resolveRedirect;
    /**
     * Parses the Retry-After header to determine when to retry a request.
     * Supports both seconds and HTTP date formats.
     * @param retryAfterHeader - The Retry-After header value
     * @returns Delay in milliseconds, or undefined if not parseable
     */
    private parseRetryAfterMs;
    /**
     * Reads response body with size limit enforcement.
     * Collects chunks until the response is complete or the limit is exceeded.
     * @param body - Async iterable of response chunks
     * @returns Complete response body as a Buffer
     */
    private readBodyWithLimit;
    /**
     * Removes old metrics entries to prevent memory leaks.
     * Keeps only metrics from the last 24 hours.
     */
    private trimMetrics;
    /**
     * Sends an HTTP request with retry logic and rate limiting.
     * Handles timeouts, redirects, and various retry scenarios.
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - Target URL
     * @param headers - HTTP headers
     * @param body - Request body (optional)
     * @param metrics - Optional metrics object to track request details
     * @param redirects - Number of redirects followed so far
     * @returns Promise resolving to the response data
     */
    private sendWithRetry;
    /**
     * Parses the Content-Type header to extract MIME type and character encoding.
     * @param contentType - Content-Type header value
     * @returns Object containing type and charset information
     */
    private parseContentType;
    /**
     * Parses the HTTP response body based on content type and requested response type.
     * Handles JSON, XML, text, and buffer responses with fallback parsing.
     * @param res - HTTP response object
     * @param responseType - Desired response type
     * @returns Parsed response data
     */
    private parseResponse;
    /**
     * Makes an HTTP request without using the cache.
     * Used for methods that shouldn't be cached or when caching is disabled.
     * @param method - HTTP method
     * @param req - Request configuration
     * @param responseType - Expected response type
     * @returns Promise resolving to the response data
     */
    private requestInternalWithoutCache;
    /**
     * Makes an HTTP request with caching support.
     * Handles cache lookups, request deduplication, and automatic cache storage.
     * @param method - HTTP method
     * @param req - Request configuration
     * @param useCache - Whether to use caching (default: true)
     * @param responseType - Expected response type
     * @returns Promise resolving to the response data
     */
    private requestInternal;
    /**
     * Makes an HTTP GET request.
     * Supports both RequestInterface objects and direct URL strings.
     * GET requests are cached by default unless caching is disabled.
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    get<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP POST request.
     * Supports both RequestInterface objects and direct URL strings with body data.
     * POST requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param body - Request body data (optional)
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    post<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP PUT request.
     * Supports both RequestInterface objects and direct URL strings with body data.
     * PUT requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param body - Request body data (optional)
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    put<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP DELETE request.
     * Supports both RequestInterface objects and direct URL strings.
     * DELETE requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    delete<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP PATCH request.
     * PATCH requests are not cached by default due to their side effects.
     * @param req - Request configuration
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Makes an HTTP HEAD request.
     * Returns only the status code and headers without the response body.
     * HEAD requests are not cached by default.
     * @param req - Request configuration or URL string
     * @returns Promise resolving to status and headers
     */
    head(req: RequestInterface | string): Promise<{
        status: number;
        headers: Record<string, any>;
    }>;
    /**
     * Clears the internal cache of the HTTP client.
     * Removes all cached responses and resets the cache state.
     */
    clearCache(): void;
    /**
     * Clears all collected request metrics.
     * Removes performance and timing data from memory.
     */
    clearMetrics(): void;
    /**
     * Retrieves metrics for a specific request by its URL.
     * @param key - The URL or cache key to retrieve metrics for
     * @returns Metrics object if found, undefined otherwise
     */
    getMetrics(key: string): RequestMetrics | undefined;
    /**
     * Retrieves all collected request metrics.
     * @returns Array of all metrics objects
     */
    getAllMetrics(): RequestMetrics[];
    /**
     * Creates a fluent request builder for making HTTP requests.
     * Provides a chainable API for building and sending requests.
     * @param url - The target URL for the request
     * @returns RequestBuilder instance for chaining
     */
    request<T = any>(url: string): RequestBuilder<T>;
    /**
     * Returns current statistics about the HTTP client's state.
     * Useful for monitoring and debugging performance.
     * @returns Object containing various client statistics
     */
    getStats(): {
        cacheSize: number;
        inflightRequests: number;
        queuedRequests: number;
        activeRequests: number;
        currentRateLimit: number;
        metricsSize: number;
    };
}
/**
 * Fluent request builder for making HTTP requests with a chainable API.
 * Provides a convenient way to build and send HTTP requests with various options.
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved();
 * const response = await client.request('https://api.example.com/data')
 *   .headers({ 'Authorization': 'Bearer token' })
 *   .query({ limit: 10, offset: 0 })
 *   .json()
 *   .send();
 * ```
 */
declare class RequestBuilder<T = any> {
    private _url;
    private _method;
    private _headers;
    private _body?;
    private _responseType;
    /**
     * Creates a new request builder for the specified URL.
     * @param url - The target URL for the request
     */
    constructor(url: string);
    /**
     * Sets HTTP headers for the request.
     * @param headers - Object containing header key-value pairs
     * @returns The builder instance for chaining
     */
    headers(headers: Record<string, string>): this;
    /**
     * Sets the request body data.
     * @param bodyData - The body data to send with the request
     * @returns The builder instance for chaining
     */
    body(bodyData: any): this;
    /**
     * Sets the response type to JSON.
     * @returns The builder instance for chaining
     */
    json(): this;
    /**
     * Sets the response type to plain text.
     * @returns The builder instance for chaining
     */
    text(): this;
    /**
     * Sets the response type to XML.
     * @returns The builder instance for chaining
     */
    xml(): this;
    /**
     * Sets the HTTP method to POST.
     * @returns The builder instance for chaining
     */
    post(): this;
    /**
     * Sets the HTTP method to PUT.
     * @returns The builder instance for chaining
     */
    put(): this;
    /**
     * Sets the HTTP method to PATCH.
     * @returns The builder instance for chaining
     */
    patch(): this;
    /**
     * Sets the HTTP method to DELETE.
     * @returns The builder instance for chaining
     */
    delete(): this;
    /**
     * Adds query parameters to the URL.
     * @param params - Object containing query parameter key-value pairs
     * @returns The builder instance for chaining
     */
    query(params: Record<string, string | number | boolean>): this;
    /**
     * Sets a JSON body for the request.
     * Automatically sets the Content-Type header to application/json.
     * @param body - The JSON body data
     * @returns The builder instance for chaining
     */
    jsonBody<T>(body: T): this;
    /**
     * Sends the HTTP request and returns the response.
     * @returns Promise resolving to the response data
     */
    send(): Promise<T>;
}
export {};
//# sourceMappingURL=HttpClientImproved.d.ts.map