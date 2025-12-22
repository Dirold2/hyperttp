import { CookieJar } from "tough-cookie";
import { Agent, request } from "undici";
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
  /**
   * Creates a new HttpClientError instance.
   * @param message The error message
   * @param statusCode Optional HTTP status code
   * @param originalError Optional original error that caused this error
   * @param url Optional request URL
   * @param method Optional HTTP method
   */
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
  /**
   * Creates a new TimeoutError instance.
   * @param url The request URL that timed out
   * @param timeout The timeout duration in milliseconds
   */
  constructor(url: string, timeout: number) {
    super(`Request timeout after ${timeout}ms for ${url}`);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class RateLimitError extends HttpClientError {
  /**
   * Creates a new RateLimitError instance.
   * @param url The request URL that was rate limited
   * @param retryAfter Optional retry after duration in milliseconds
   */
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
  delete<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;
  patch<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;
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
  private cookieJar = new CookieJar();
  private agent: Agent;

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
   * Creates a new instance of HttpClientImproved.
   * @param options Optional configuration options for the HTTP client
   */
  constructor(options?: HttpClientOptions) {
    this.options = { followRedirects: true, maxRedirects: 5, ...options };

    this.cache = new CacheManager({
      cacheTTL: this.options.cacheTTL,
      cacheMaxSize: this.options.cacheMaxSize,
    });

    this.queue = new QueueManager(this.options.maxConcurrent ?? 50);
    this.limiter = new RateLimiter(this.options.rateLimit);

    this.retryOptions = {
      maxRetries: this.options.maxRetries ?? 3,
      baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
      maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
      retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
        408, 429, 500, 502, 503, 504,
      ],
      jitter: this.options.retryOptions?.jitter ?? true,
    };

    this.defaultHeaders = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
    };

    this.agent = new Agent({
      connections: 100,
      pipelining: 10,
      interceptors: {
        Client: [cookie({ jar: this.cookieJar })],
      },
    });
  }

  /**
   * Sets default headers that will be applied to all outgoing requests.
   * @param headers An object containing header names and values
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers);
  }

  /**
   * Returns the cookie jar used for managing HTTP cookies.
   * @returns The CookieJar instance
   */
  getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  /**
   * Adds a request interceptor to modify requests before they are sent.
   * @param interceptor The interceptor function to add
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Adds a response interceptor to modify responses after they are received.
   * @param interceptor The interceptor function to add
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /** Closes the HTTP agent to properly terminate keep-alive connections. */
  close(): void {
    this.agent.close();
  }

  private log(level: LogLevel, msg: string, meta?: any): void {
    if (this.options.logger) this.options.logger(level, msg, meta);
  }

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

  private calcDelay(attempt: number): number {
    const base = Math.min(
      this.retryOptions.baseDelay * 2 ** attempt,
      this.retryOptions.maxDelay,
    );
    return this.retryOptions.jitter
      ? base * (0.75 + Math.random() * 0.5)
      : base;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async applyRequestInterceptors(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
  }) {
    let result = config;
    for (const interceptor of this.requestInterceptors)
      result = await interceptor(result);
    return result;
  }

  private async applyResponseInterceptors(response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
  }) {
    let result = response;
    for (const interceptor of this.responseInterceptors)
      result = await interceptor(result);
    return result;
  }

  private resolveRedirect(location: string, baseUrl: string): string {
    try {
      return new URL(location, baseUrl).toString();
    } catch {
      return location;
    }
  }

  private parseRetryAfterMs(retryAfterHeader: unknown): number | undefined {
    if (!retryAfterHeader) return undefined;

    const raw = Array.isArray(retryAfterHeader)
      ? retryAfterHeader[0]
      : String(retryAfterHeader);

    const asSeconds = Number(raw);
    if (Number.isFinite(asSeconds))
      return Math.max(0, Math.floor(asSeconds * 1000));

    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());

    return undefined;
  }

  private async readBodyWithLimit(body: any): Promise<Buffer> {
    const buf = Buffer.from(await body.arrayBuffer());
    const limit = this.options.maxResponseBytes;
    if (typeof limit === "number" && limit > 0 && buf.length > limit) {
      throw new HttpClientError(
        `Response too large (${buf.length} bytes), limit is ${limit}`,
        0,
      );
    }
    return buf;
  }

  private async sendWithRetry(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | Buffer | undefined,
    metrics?: RequestMetrics,
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
        await this.limiter.wait();

        const finalConfig = await this.applyRequestInterceptors({
          url,
          method,
          headers,
          body,
        });

        const controller = new AbortController();
        const timeout = this.options.timeout ?? 15000;
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          const res = await request(finalConfig.url, {
            method: finalConfig.method,
            headers: finalConfig.headers,
            body: finalConfig.body,
            dispatcher: this.agent,
            signal: controller.signal,
          });

          clearTimeout(timer);

          const buf = await this.readBodyWithLimit(res.body);

          let response = await this.applyResponseInterceptors({
            status: res.statusCode,
            headers: res.headers as Record<string, any>,
            body: buf,
            url: finalConfig.url,
          });

          // Redirects
          if (
            this.options.followRedirects &&
            [301, 302, 303, 307, 308].includes(response.status) &&
            redirects < (this.options.maxRedirects ?? 5)
          ) {
            const location = response.headers.location as string | undefined;
            if (location) {
              const nextUrl = this.resolveRedirect(location, finalConfig.url);
              const redirectMethod = response.status === 303 ? "GET" : method;

              const nextHeaders = { ...headers };
              let nextBody = body;

              // If switching to GET, drop body-related headers.
              if (redirectMethod === "GET") {
                nextBody = undefined;
                delete nextHeaders["content-type"];
                delete nextHeaders["Content-Type"];
                delete nextHeaders["content-length"];
                delete nextHeaders["Content-Length"];
              }

              this.log("debug", `Redirecting to ${nextUrl}`, {
                originalUrl: finalConfig.url,
                status: response.status,
              });
              return this.sendWithRetry(
                redirectMethod,
                nextUrl,
                nextHeaders,
                nextBody,
                metrics,
                redirects + 1,
              );
            }
          }

          // Retry by status
          if (this.retryOptions.retryStatusCodes.includes(response.status)) {
            metrics && (metrics.retries += 1);

            if (response.status === 429) {
              const ra = this.parseRetryAfterMs(
                response.headers["retry-after"],
              );
              if (ra !== undefined) {
                this.log(
                  "warn",
                  `429 Rate limited, waiting Retry-After ${ra}ms`,
                  { url: finalConfig.url },
                );
                if (attempt < this.retryOptions.maxRetries) {
                  await this.sleep(ra);
                  continue;
                }
                throw new RateLimitError(finalConfig.url, ra);
              }
            }

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
          if (timeoutErr?.name === "AbortError")
            throw new TimeoutError(url, timeout);
          throw timeoutErr;
        }
      } catch (err: any) {
        lastError = err;

        this.log(
          "error",
          `Request error ${method} ${url}: ${err?.message ?? String(err)}`,
          {
            attempt: attempt + 1,
            error: err,
          },
        );

        metrics && (metrics.retries += 1);

        if (attempt < this.retryOptions.maxRetries) {
          await this.sleep(this.calcDelay(attempt));
          continue;
        }
      }
    }

    if (lastError instanceof HttpClientError) throw lastError;

    throw new HttpClientError(
      `Request failed after ${this.retryOptions.maxRetries + 1} attempts`,
      undefined,
      lastError instanceof Error ? lastError : undefined,
      url,
      method,
    );
  }

  private parseContentType(contentType?: string): {
    type: string;
    charset: BufferEncoding;
  } {
    if (!contentType) return { type: "text/plain", charset: "utf-8" };

    const parts = contentType.split(";");
    const type = parts[0].trim();

    const rawCharset =
      parts
        .map((p) => p.trim())
        .find((p) => p.toLowerCase().startsWith("charset="))
        ?.split("=")[1]
        ?.trim() || "utf-8";

    const normalized = rawCharset.toLowerCase();
    const allowed: BufferEncoding[] = [
      "utf8",
      "utf-8",
      "latin1",
      "ucs2",
      "ucs-2",
      "utf16le",
      "utf-16le",
      "ascii",
      "base64",
      "hex",
    ];
    const charset = (
      allowed.includes(normalized as BufferEncoding)
        ? (normalized as BufferEncoding)
        : "utf-8"
    ) as BufferEncoding;

    return { type, charset };
  }

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

  private async requestInternal<T = any>(
    method: string,
    req: RequestInterface,
    useCache = true,
    responseType?: ResponseType,
  ): Promise<T> {
    const url = req.getURL();
    const rawBody = req.getBodyData();
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...req.getHeaders(),
    };

    const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    // Prepare request body + auto content-type for JSON
    let body: string | Buffer | undefined;

    const contentType =
      headers["content-type"] || headers["Content-Type"] || "";

    if (isBodyAllowed && rawBody !== undefined && rawBody !== null) {
      if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
      } else if (typeof rawBody === "string") {
        body = rawBody;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = querystring.stringify(rawBody);
      } else {
        // default JSON
        body = JSON.stringify(rawBody);
        if (!contentType)
          headers["Content-Type"] = "application/json; charset=utf-8";
      }
    }

    const key = `${method}:${url}:${body ?? ""}`;

    if (method === "GET" && useCache) {
      const cached = this.cache.get<T>(key);
      if (cached) {
        this.log("debug", `Cache hit for ${url}`);
        return cached;
      }
    }

    if (this.inflight.has(key)) {
      this.log("debug", `Deduplicating request for ${url}`);
      return this.inflight.get(key)!;
    }

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
          const res = await this.sendWithRetry(
            method,
            url,
            headers,
            body,
            metrics,
          );

          metrics.statusCode = res.status;
          metrics.bytesReceived = res.body.length;
          metrics.bytesSent =
            body instanceof Buffer
              ? body.length
              : Buffer.byteLength(body || "");

          const parsed = await this.parseResponse(res, responseType);

          if (method === "GET" && useCache) {
            this.cache.set(key, parsed);
            metrics.cached = true;
          }

          return parsed as T;
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
        // ВАЖНО: только delete, без повторного set.
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Performs an HTTP GET request.
   * @param req The request object containing URL and headers
   * @param responseType Optional response parsing type
   * @returns A promise that resolves to the parsed response
   * @template T The expected response type
   */
  get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.requestInternal<T>("GET", req, true, responseType);
  }

  /**
   * Performs an HTTP POST request.
   * @param req The request object containing URL, body, and headers
   * @param responseType Optional response parsing type
   * @returns A promise that resolves to the parsed response
   * @template T The expected response type
   */
  post<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.requestInternal<T>("POST", req, false, responseType);
  }

  /**
   * Performs an HTTP PUT request.
   * @param req The request object containing URL, body, and headers
   * @param responseType Optional response parsing type
   * @returns A promise that resolves to the parsed response
   * @template T The expected response type
   */
  put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.requestInternal<T>("PUT", req, false, responseType);
  }

  /**
   * Performs an HTTP DELETE request.
   * @param req The request object containing URL and headers
   * @param responseType Optional response parsing type
   * @returns A promise that resolves to the parsed response
   * @template T The expected response type
   */
  delete<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.requestInternal<T>("DELETE", req, false, responseType);
  }

  /**
   * Performs an HTTP PATCH request.
   * @param req The request object containing URL, body, and headers
   * @param responseType Optional response parsing type
   * @returns A promise that resolves to the parsed response
   * @template T The expected response type
   */
  patch<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    return this.requestInternal<T>("PATCH", req, false, responseType);
  }

  /**
   * Performs an HTTP HEAD request.
   * @param req The request object containing URL and headers
   * @returns A promise that resolves when the request completes
   */
  head(req: RequestInterface): Promise<void> {
    return this.requestInternal<void>("HEAD", req, false).then(() => undefined);
  }

  /**
   * Clears the request cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.log("info", "Cache cleared");
  }

  /**
   * Retrieves performance metrics for a specific request.
   * @param url The request URL
   * @param method The HTTP method
   * @returns The request metrics if available, undefined otherwise
   */
  getMetrics(url: string, method: string): RequestMetrics | undefined {
    const keyPrefix = `${method}:${url}`;
    for (const [k, v] of this.requestMetrics.entries()) {
      if (k.startsWith(keyPrefix)) return v;
    }
    return undefined;
  }

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
