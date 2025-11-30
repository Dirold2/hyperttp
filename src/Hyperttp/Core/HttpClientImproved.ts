import { CookieJar } from "tough-cookie";
import { Agent, Dispatcher, request } from "undici";
import { cookie } from "http-cookie-agent/undici";
import * as zlib from "zlib";
import { promisify } from "util";
import { XMLParser } from "fast-xml-parser";
import * as querystring from "querystring";
import { CacheManager } from "./CacheManager";
import { QueueManager } from "./QueueManager";
import { RateLimiter, type RateLimiterConfig } from "./RateLimiter";
import { ResponseType } from "../../Types";

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * Custom error classes for better error handling
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error,
    public url?: string,
    public method?: string,
  ) {
    super(message);
    this.name = "HttpClientError";
    Object.setPrototypeOf(this, HttpClientError.prototype);
  }
}

export class TimeoutError extends HttpClientError {
  constructor(url: string, timeout: number) {
    super(`Request timeout after ${timeout}ms for ${url}`);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class RateLimitError extends HttpClientError {
  constructor(
    url: string,
    public retryAfter?: number,
  ) {
    super(
      `Rate limited for ${url}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`,
    );
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Log levels for the HTTP client logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger function type for HTTP client operations
 */
export type LoggerFunction = (
  level: LogLevel,
  message: string,
  meta?: any,
) => void;

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
  delete<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;
  /** Performs a PATCH request */
  patch<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;
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
  private cookieJar = new CookieJar();
  private agent: Dispatcher;
  private cache: CacheManager;
  private queue: QueueManager;
  private limiter: RateLimiter;
  private inflight = new Map<string, Promise<any>>();
  private retryOptions: RetryOptions;
  private defaultHeaders: Record<string, string> = {};
  private options: HttpClientOptions;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private requestMetrics = new Map<string, RequestMetrics>();

  /**
   * Creates a new HttpClient instance
   * @param options - Configuration options for the HTTP client
   */
  constructor(options?: HttpClientOptions) {
    this.options = { followRedirects: true, maxRedirects: 5, ...options };

    // Initialize cache manager
    this.cache = new CacheManager({
      cacheTTL: this.options.cacheTTL,
      cacheMaxSize: this.options.cacheMaxSize,
    });

    // Initialize queue manager
    this.queue = new QueueManager(this.options.maxConcurrent ?? 50);

    // Initialize rate limiter
    this.limiter = new RateLimiter(this.options.rateLimit);

    // Configure retry behavior
    this.retryOptions = {
      maxRetries: this.options.maxRetries ?? 3,
      baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
      maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
      retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
        408, 429, 500, 502, 503, 504,
      ],
      jitter: this.options.retryOptions?.jitter ?? true,
    };

    // Set default headers
    this.defaultHeaders = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
    };

    // Initialize HTTP agent with cookie support (новый API для undici v7)
    this.agent = new Agent({
      connections: 100,
      pipelining: 10,
    }).compose(cookie({ jar: this.cookieJar }));
  }

  /**
   * Sets or updates default headers for all requests
   * @param headers - Headers to merge with existing default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers);
  }

  /**
   * Gets the cookie jar for manual cookie management
   * @returns The cookie jar instance
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  /**
   * Adds a request interceptor
   * @param interceptor - Function to intercept requests
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Adds a response interceptor
   * @param interceptor - Function to intercept responses
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Internal logging method
   * @private
   */
  private log(level: LogLevel, msg: string, meta?: any): void {
    if (this.options.logger) {
      this.options.logger(level, msg, meta);
    }
  }

  /**
   * Decompresses response body based on content encoding
   * @private
   */
  private async decompress(
    buf: Buffer,
    enc?: string,
    charset: BufferEncoding = "utf-8",
  ): Promise<string> {
    if (!enc) return buf.toString(charset);

    try {
      switch (enc.toLowerCase()) {
        case "gzip":
          return (await gunzip(buf)).toString(charset);
        case "deflate":
          return (await inflate(buf)).toString(charset);
        case "br":
          return (await brotliDecompress(buf)).toString(charset);
        default:
          return buf.toString(charset);
      }
    } catch (error) {
      this.log("error", `Decompression failed for encoding ${enc}`, error);
      return buf.toString(charset);
    }
  }

  /**
   * Calculates retry delay with exponential backoff and optional jitter
   * @private
   */
  private calcDelay(attempt: number): number {
    const base = Math.min(
      this.retryOptions.baseDelay * 2 ** attempt,
      this.retryOptions.maxDelay,
    );
    return this.retryOptions.jitter
      ? base * (0.75 + Math.random() * 0.5)
      : base;
  }

  /**
   * Utility method for sleeping
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Applies request interceptors
   * @private
   */
  private async applyRequestInterceptors(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
  }): Promise<typeof config> {
    let result = config;
    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * Applies response interceptors
   * @private
   */
  private async applyResponseInterceptors(response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
  }): Promise<typeof response> {
    let result = response;
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result);
    }
    return result;
  }

  /**
   * Sends an HTTP request with automatic retry logic and redirect following
   * @private
   */
  private async sendWithRetry(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string | Buffer,
    redirects = 0,
  ): Promise<{
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
  }> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this.limiter.wait();

        // Apply request interceptors
        let finalConfig = await this.applyRequestInterceptors({
          url,
          method,
          headers,
          body,
        });

        // Set up request timeout
        const controller = new AbortController();
        const timeout = this.options.timeout ?? 15000;
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          // Make the request
          const res = await request(finalConfig.url, {
            method: finalConfig.method,
            headers: finalConfig.headers,
            body: finalConfig.body,
            dispatcher: this.agent,
            signal: controller.signal,
          });

          clearTimeout(timer);

          // Read response body
          const buf = Buffer.from(await res.body.arrayBuffer());

          // Apply response interceptors
          let response = await this.applyResponseInterceptors({
            status: res.statusCode,
            headers: res.headers as Record<string, any>,
            body: buf,
            url: finalConfig.url,
          });

          // Handle redirects
          if (
            this.options.followRedirects &&
            [301, 302, 303, 307, 308].includes(response.status)
          ) {
            if (redirects < (this.options.maxRedirects ?? 5)) {
              const location = response.headers.location as string;
              if (location) {
                this.log("debug", `Redirecting to ${location}`, {
                  originalUrl: finalConfig.url,
                });
                const redirectMethod = response.status === 303 ? "GET" : method;
                return this.sendWithRetry(
                  redirectMethod,
                  location,
                  headers,
                  response.status === 303 ? undefined : body,
                  redirects + 1,
                );
              }
            }
          }

          // Check if we should retry based on status code
          if (this.retryOptions.retryStatusCodes.includes(response.status)) {
            this.log(
              "warn",
              `Retrying ${method} ${finalConfig.url} due to status ${response.status}`,
              {
                attempt: attempt + 1,
                maxRetries: this.retryOptions.maxRetries,
              },
            );

            if (attempt < this.retryOptions.maxRetries) {
              await this.sleep(this.calcDelay(attempt));
              continue;
            }
          }

          return response;
        } catch (timeoutErr: any) {
          clearTimeout(timer);
          if (timeoutErr.name === "AbortError") {
            throw new TimeoutError(url, timeout);
          }
          throw timeoutErr;
        }
      } catch (err: any) {
        lastError = err;
        this.log("error", `Request error ${method} ${url}: ${err.message}`, {
          attempt: attempt + 1,
          error: err,
        });

        if (attempt < this.retryOptions.maxRetries) {
          await this.sleep(this.calcDelay(attempt));
        }
      }
    }

    if (lastError instanceof HttpClientError) {
      throw lastError;
    }

    throw new HttpClientError(
      `Request failed after ${this.retryOptions.maxRetries + 1} attempts`,
      undefined,
      lastError,
      url,
      method,
    );
  }

  /**
   * Parses Content-Type header
   * @private
   */
  private parseContentType(contentType?: string): {
    type: string;
    charset: BufferEncoding;
  } {
    if (!contentType) return { type: "text/plain", charset: "utf-8" };

    const parts = contentType.split(";");
    const type = parts[0].trim();
    const rawCharset =
      parts
        .find((p) => p.includes("charset"))
        ?.split("=")[1]
        ?.trim() || "utf-8";
    const charset = rawCharset as BufferEncoding;

    return { type, charset };
  }

  /**
   * Parses response body based on content type or responseType
   * @private
   */
  private async parseResponse(
    res: { status: number; headers: Record<string, any>; body: Buffer },
    responseType?: ResponseType,
  ): Promise<any> {
    try {
      const { type, charset } = this.parseContentType(
        res.headers["content-type"],
      );
      const text = await this.decompress(
        res.body,
        res.headers["content-encoding"],
        charset,
      );
      const finalType = responseType ?? "json";

      switch (finalType) {
        case "json":
          if (type.includes("json")) return JSON.parse(text);
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }

        case "xml":
          return new XMLParser({ ignoreAttributes: false }).parse(text);

        case "text":
          return text;

        case "buffer":
          return res.body;

        default:
          return text;
      }
    } catch (error) {
      this.log("error", "Failed to parse response", {
        error,
        status: res.status,
      });
      throw new HttpClientError(
        `Response parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        res.status,
      );
    }
  }

  /**
   * Internal request method with caching and deduplication
   * @private
   */
  private async request<T = any>(
    method: string,
    req: RequestInterface,
    useCache = true,
    responseType?: ResponseType,
  ): Promise<T> {
    const url = req.getURL();
    const rawBody = req.getBodyData();
    const headers = { ...this.defaultHeaders, ...req.getHeaders() };
    const contentType =
      headers["content-type"] || headers["Content-Type"] || "";
    const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // Prepare request body
    let body: string | Buffer | undefined;
    if (isBodyAllowed && rawBody) {
      if (contentType.includes("application/json")) {
        body = JSON.stringify(rawBody);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = querystring.stringify(rawBody);
      } else if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
      } else {
        body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
      }
    }

    // Generate cache key
    const key = `${method}:${url}:${body ?? ""}`;

    // Check cache for GET requests
    if (method === "GET" && useCache) {
      const cached = this.cache.get<T>(key);
      if (cached) {
        this.log("debug", `Cache hit for ${url}`);
        return cached;
      }
    }

    // Deduplicate in-flight requests
    if (this.inflight.has(key)) {
      this.log("debug", `Deduplicating request for ${url}`);
      return this.inflight.get(key)!;
    }

    // Create and track the request promise
    const promise = (async () => {
      const metrics: RequestMetrics = {
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        bytesReceived: 0,
        bytesSent: 0,
        retries: 0,
        cached: false,
        url,
        method,
      };

      try {
        this.log("debug", `Starting request: ${method} ${url}`);

        const result = await this.queue.enqueue(async () => {
          const res = await this.sendWithRetry(method, url, headers, body);
          metrics.statusCode = res.status;
          metrics.bytesReceived = res.body.length;
          metrics.bytesSent =
            body instanceof Buffer
              ? body.length
              : Buffer.byteLength(body || "");

          const parsed = await this.parseResponse(res, responseType);

          // Cache GET requests
          if (method === "GET" && useCache) {
            this.cache.set(key, parsed);
            metrics.cached = true;
          }

          return parsed;
        });

        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.requestMetrics.set(key, metrics);

        this.log(
          "info",
          `${method} ${url} completed in ${metrics.duration}ms`,
          metrics,
        );
        return result;
      } catch (error) {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.requestMetrics.set(key, metrics);
        throw error;
      } finally {
        // Clean up inflight map
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Performs a GET request
   * @template T - Expected response type
   * @param req Request object containing URL, headers, and parameters
   * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
   * @returns Promise resolving to the parsed response of the specified type
   */
  get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("GET", req, true, responseType);
  }

  /**
   * Performs a POST request
   */
  post<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.request<T>("POST", req, false, responseType);
  }

  /**
   * Performs a PUT request
   */
  put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("PUT", req, false, responseType);
  }

  /**
   * Performs a DELETE request
   */
  delete<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.request<T>("DELETE", req, false, responseType);
  }

  /**
   * Performs a PATCH request
   */
  patch<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.request<T>("PATCH", req, false, responseType);
  }

  /**
   * Performs a HEAD request
   */
  head(req: RequestInterface): Promise<void> {
    return this.request<void>("HEAD", req, false).then(() => undefined);
  }

  /**
   * Clears all cached responses
   */
  clearCache(): void {
    this.cache.clear();
    this.log("info", "Cache cleared");
  }

  /**
   * Gets request metrics for a specific request
   */
  getMetrics(url: string, method: string): RequestMetrics | undefined {
    const key = `${method}:${url}`;
    return this.requestMetrics.get(key);
  }

  /**
   * Gets statistics about the HTTP client state
   */
  getStats(): {
    cacheSize: number;
    inflightRequests: number;
    queuedRequests: number;
    activeRequests: number;
    currentRateLimit: number;
  } {
    return {
      cacheSize: this.cache.size,
      inflightRequests: this.inflight.size,
      queuedRequests: this.queue.queuedCount,
      activeRequests: this.queue.activeCount,
      currentRateLimit: this.limiter.currentCount,
    };
  }
}
