import { HttpClientInterface, HttpClientOptions, RequestInterface, RequestMetrics, ResponseType, StreamResponse } from "../../Types";
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
     * @ru Получает потоковый ответ (для SSE, больших файлов).
     * @en Gets streaming response (for SSE, large files).
     */
    stream(req: RequestInterface | string): Promise<StreamResponse>;
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
     * @ru Устанавливает потоковый режим ответа.
     * @en Sets streaming response mode.
     */
    stream(): this;
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