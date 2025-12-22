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
    /**
     * Creates a new HttpClientError instance.
     * @param message The error message
     * @param statusCode Optional HTTP status code
     * @param originalError Optional original error that caused this error
     * @param url Optional request URL
     * @param method Optional HTTP method
     */
    constructor(message: string, statusCode?: number | undefined, originalError?: Error | undefined, url?: string | undefined, method?: string | undefined);
}
export declare class TimeoutError extends HttpClientError {
    /**
     * Creates a new TimeoutError instance.
     * @param url The request URL that timed out
     * @param timeout The timeout duration in milliseconds
     */
    constructor(url: string, timeout: number);
}
export declare class RateLimitError extends HttpClientError {
    retryAfter?: number | undefined;
    /**
     * Creates a new RateLimitError instance.
     * @param url The request URL that was rate limited
     * @param retryAfter Optional retry after duration in milliseconds
     */
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
    /** HTTP status codes that should trigger a retry */
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
    /** Custom User-Agent header */
    userAgent?: string;
    /** Logger function for debugging and monitoring */
    logger?: LoggerFunction;
    /** Custom retry options */
    retryOptions?: Partial<RetryOptions>;
    /** Follow redirects (default: true) */
    followRedirects?: boolean;
    /** Maximum redirects to follow (default: 5) */
    maxRedirects?: number;
    /** Optional: limit response body size in bytes (protects memory) */
    maxResponseBytes?: number;
}
/**
 * Interface for request objects
 */
export interface RequestInterface {
    getURL(): string;
    getBodyData(): any;
    getHeaders(): Record<string, string>;
}
/**
 * Interface for HTTP client implementations
 */
export interface HttpClientInterface {
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    head(req: RequestInterface): Promise<void>;
    clearCache(): void;
}
/**
 * Interface for request performance metrics
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
     * Creates a new instance of HttpClientImproved.
     * @param options Optional configuration options for the HTTP client
     */
    constructor(options?: HttpClientOptions);
    /**
     * Sets default headers that will be applied to all outgoing requests.
     * @param headers An object containing header names and values
     */
    setDefaultHeaders(headers: Record<string, string>): void;
    /**
     * Returns the cookie jar used for managing HTTP cookies.
     * @returns The CookieJar instance
     */
    getCookieJar(): CookieJar;
    /**
     * Adds a request interceptor to modify requests before they are sent.
     * @param interceptor The interceptor function to add
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    /**
     * Adds a response interceptor to modify responses after they are received.
     * @param interceptor The interceptor function to add
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    /** Closes the HTTP agent to properly terminate keep-alive connections. */
    close(): void;
    private log;
    private decompress;
    private calcDelay;
    private sleep;
    private applyRequestInterceptors;
    private applyResponseInterceptors;
    private resolveRedirect;
    private parseRetryAfterMs;
    private readBodyWithLimit;
    private sendWithRetry;
    private parseContentType;
    private parseResponse;
    private requestInternal;
    /**
     * Performs an HTTP GET request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP POST request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP PUT request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP DELETE request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP PATCH request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP HEAD request.
     * @param req The request object containing URL and headers
     * @returns A promise that resolves when the request completes
     */
    head(req: RequestInterface): Promise<void>;
    /**
     * Clears the request cache.
     */
    clearCache(): void;
    /**
     * Retrieves performance metrics for a specific request.
     * @param url The request URL
     * @param method The HTTP method
     * @returns The request metrics if available, undefined otherwise
     */
    getMetrics(url: string, method: string): RequestMetrics | undefined;
    /**
     * Returns current statistics about the HTTP client's state.
     * @returns An object containing cache size, request counts, and rate limit information
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