import { CookieJar } from "tough-cookie";
import { HttpClientInterface, HttpClientOptions, RequestInterceptor, RequestInterface, RequestMetrics, ResponseInterceptor, ResponseType, StreamResponse } from "../../Types";
import { RequestBuilder } from "./RequestBuilder";
/**
 * Advanced HTTP client with built-in caching, rate limiting, request queuing,
 * automatic retries, cookie management, and response decompression.
 */
export default class HttpClientImproved implements HttpClientInterface {
    private cookieJar;
    private agent;
    private cache?;
    private queue?;
    private limiter?;
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
    private xmlParser;
    private parseResponse;
    private requestInternal;
    /**
     * Performs an HTTP GET request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    get<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP POST request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    post<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP PUT request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    put<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP DELETE request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    delete<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * Performs an HTTP PATCH request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    patch<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * @ru Получает потоковый ответ (для SSE, больших файлов).
     * @en Gets streaming response (for SSE, large files).
     */
    stream(req: RequestInterface | string): Promise<StreamResponse>;
    /**
     * Performs an HTTP HEAD request.
     * @param req The request object containing URL and headers
     * @returns A promise that resolves when the request completes
     */
    head(req: RequestInterface | string): Promise<{
        status: number;
        headers: Record<string, any>;
    }>;
    /**
     * Clears the request cache.
     */
    clearCache(): Promise<void>;
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