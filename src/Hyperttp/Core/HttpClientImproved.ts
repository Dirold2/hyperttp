import { CookieJar } from "tough-cookie";
import { Agent, request } from "undici";
import { cookie } from 'http-cookie-agent/undici';

import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { URLSearchParams } from "url";
import { createHash } from "crypto";

import { CacheManager } from "./CacheManager";
import { QueueManager } from "./QueueManager";
import { RateLimiter, type RateLimiterConfig } from "./RateLimiter";
import { ResponseType } from "../../Types";

let defaultClient: HttpClientImproved | null = null;

/**
 * Base error class for HTTP client operations.
 * Contains additional context about the failed request including status code, URL, and method.
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

/**
 * Error thrown when an HTTP request exceeds the configured timeout duration.
 * Contains information about the URL and timeout value that caused the failure.
 */
export class TimeoutError extends HttpClientError {
  constructor(url: string, timeout: number) {
    super(`Request timeout after ${timeout}ms for ${url}`);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when an HTTP request is rate limited by the server.
 * Contains information about the URL and optional retry-after duration.
 */
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
export type LoggerFunction = (
  level: LogLevel,
  message: string,
  meta?: any,
) => void;

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
  delete<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP PATCH request
   * @param req - Request configuration
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  patch<T = any>(
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP HEAD request
   * @param req - Request configuration or URL string
   * @returns Promise resolving to status and headers
   */
  head(
    req: RequestInterface,
  ): Promise<{ status: number; headers: Record<string, any> }>;

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
  private cookieJar = new CookieJar();
  private agent: Agent;
  private cache: CacheManager;
  private queue: QueueManager;
  private limiter: RateLimiter;
  private inflight = new Map<string, Promise<any>>();
  private retryOptions: RetryOptions;
  private defaultHeaders: Record<string, string> = {};
  private options: Required<HttpClientOptions>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private requestMetrics = new Map<string, RequestMetrics>();

  constructor(options?: HttpClientOptions) {
    this.options = {
      timeout: options?.timeout ?? 15000,
      maxConcurrent: options?.maxConcurrent ?? 50,
      maxRetries: options?.maxRetries ?? 3,
      cacheTTL: options?.cacheTTL ?? 300000,
      cacheMaxSize: options?.cacheMaxSize ?? 500,
      followRedirects: options?.followRedirects ?? true,
      maxRedirects: options?.maxRedirects ?? 5,
      validateStatus:
        options?.validateStatus ??
        ((status: number) => status >= 200 && status < 300),
      cacheMethods: options?.cacheMethods ?? ["GET", "HEAD"],
      maxMetricsSize: options?.maxMetricsSize ?? 10000,
      rateLimit: options?.rateLimit ?? { maxRequests: 100, windowMs: 60000 },
      userAgent: options?.userAgent ?? "Hyperttp/0.1.0 Node.js",
      logger:
        options?.logger ??
        ((level, message, meta) => {
          const methods = {
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error,
          };
          (methods[level as LogLevel] || console.log)(
            `[${level.toUpperCase()}] ${message}`,
            meta || "",
          );
        }),
      retryOptions: options?.retryOptions ?? {},
      maxResponseBytes: options?.maxResponseBytes ?? 1024 * 1024,
      verbose: false,
    };

    this.cache = new CacheManager({
      cacheTTL: this.options.cacheTTL,
      cacheMaxSize: this.options.cacheMaxSize,
    });

    this.queue = new QueueManager(this.options.maxConcurrent ?? 100);
    this.limiter = new RateLimiter(this.options.rateLimit);

    this.retryOptions = {
      maxRetries: this.options.maxRetries,
      baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
      maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
      retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
        408, 429, 500, 502, 503, 504,
      ],
      jitter: this.options.retryOptions?.jitter ?? true,
    };

    this.defaultHeaders = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
    };

    this.agent = new Agent({
      connections: 256,
      pipelining: 1,
      interceptors: {
        Client: [cookie({ jar: this.cookieJar })],
      },
    });

  }

  private log(level: LogLevel, msg: string, meta?: any): void {
    if (!this.options.logger) return;

    const minLevel: LogLevel =
      process.env.NODE_ENV === "production" ? "warn" : "info";

    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(minLevel);

    if (currentLevelIndex < minLevelIndex) return;

    if (this.options.verbose || level !== "info") {
      this.options.logger(level, msg, meta);
    }
  }

  /**
   * Creates a hash of the request body for cache key generation.
   * @param body - Request body (string or Buffer)
   * @returns SHA1 hash of the body, truncated to 8 characters
   */
  private hashBody(body?: string | Buffer): string {
    if (!body) return "";
    if (typeof body === "string") body = Buffer.from(body, "utf-8");
    return createHash("sha1").update(body).digest("hex").slice(0, 8);
  }

  /**
   * Calculates the delay for retry attempts using exponential backoff.
   * @param attempt - Current retry attempt number (0-based)
   * @returns Delay in milliseconds
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
   * Creates a promise that resolves after the specified delay.
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Applies all registered request interceptors to modify the request configuration.
   * Interceptors are executed in sequence, with each one receiving the output of the previous.
   * @param config - Original request configuration
   * @returns Modified request configuration
   */
  private async applyRequestInterceptors(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
  }) {
    if (!this.requestInterceptors.length) return config;

    let result = config;
    for (const interceptor of this.requestInterceptors) {
      try {
        result = await interceptor(result);
      } catch (error) {
        this.log("error", "Request interceptor failed", { error });
        throw error;
      }
    }
    return result;
  }

  /**
   * Applies all registered response interceptors to modify the response data.
   * Interceptors are executed in sequence, with each one receiving the output of the previous.
   * @param response - Original response data
   * @returns Modified response data
   */
  private async applyResponseInterceptors(response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
  }) {
    let result = response;
    for (const interceptor of this.responseInterceptors) {
      try {
        result = await interceptor(result);
      } catch (error) {
        this.log("error", "Response interceptor failed", { error });
        throw error;
      }
    }
    return result;
  }

  /**
   * Resolves a redirect location relative to the base URL.
   * Handles both absolute and relative redirect URLs.
   * @param location - The redirect location from the response
   * @param baseUrl - The original request URL
   * @returns The resolved absolute URL
   */
  private resolveRedirect(location: string, baseUrl: string): string {
    try {
      return new URL(location, baseUrl).toString();
    } catch {
      return location;
    }
  }

  /**
   * Parses the Retry-After header to determine when to retry a request.
   * Supports both seconds and HTTP date formats.
   * @param retryAfterHeader - The Retry-After header value
   * @returns Delay in milliseconds, or undefined if not parseable
   */
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

  /**
   * Reads response body with size limit enforcement.
   * Collects chunks until the response is complete or the limit is exceeded.
   * @param body - Async iterable of response chunks
   * @returns Complete response body as a Buffer
   */
  private async readBodyWithLimit(
    body: AsyncIterable<Uint8Array>
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const limit = this.options.maxResponseBytes;
    let total = 0;

    for await (const chunk of body) {
      const buf = Buffer.from(chunk);
      total += buf.length;

      if (limit && total > limit) {
        throw new HttpClientError(
          `Response too large (${total} bytes), limit is ${limit}`,
          0
        );
      }

      chunks.push(buf);
    }

    return Buffer.concat(chunks, total);
  }

  /**
   * Removes old metrics entries to prevent memory leaks.
   * Keeps only metrics from the last 24 hours.
   */
  private trimMetrics() {
    if (this.requestMetrics.size > this.options.maxMetricsSize) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const [key, metrics] of this.requestMetrics) {
        if (metrics.endTime < cutoff) {
          this.requestMetrics.delete(key);
        }
      }
    }
  }

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
        const timeout = this.options.timeout;
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

          if (!this.options.validateStatus(response.status)) {
            throw new HttpClientError(
              `Request failed with status ${response.status}`,
              response.status,
              undefined,
              finalConfig.url,
              finalConfig.method,
            );
          }

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
        } finally {
          clearTimeout(timer);
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

  /**
   * Parses the Content-Type header to extract MIME type and character encoding.
   * @param contentType - Content-Type header value
   * @returns Object containing type and charset information
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

    return {
      type,
      charset: allowed.includes(normalized as BufferEncoding)
        ? (normalized as BufferEncoding)
        : "utf-8",
    };
  }

  /**
   * Parses the HTTP response body based on content type and requested response type.
   * Handles JSON, XML, text, and buffer responses with fallback parsing.
   * @param res - HTTP response object
   * @param responseType - Desired response type
   * @returns Parsed response data
   */
  private async parseResponse(
    res: { status: number; headers: Record<string, any>; body: Buffer },
    responseType?: ResponseType,
  ): Promise<any> {
    const { type, charset } = this.parseContentType(
      res.headers["content-type"],
    );
    const text = res.body.toString(charset);

    const finalType: ResponseType =
      responseType ?? (type.includes("application/json") ? "json" : "text");

    try {
      switch (finalType) {
        case "json": {
          try {
            return JSON.parse(text);
          } catch {
            try {
              return new XMLParser({ ignoreAttributes: false }).parse(text);
            } catch {
              return { data: text };
            }
          }
        }

        case "xml": {
          try {
            const jsonData = JSON.parse(text);
            return new XMLBuilder({ format: true }).build({ root: jsonData });
          } catch {
            return text;
          }
        }

        case "text":
          return text;

        case "buffer":
          return res.body;

        default:
          return text;
      }
    } catch (err: any) {
      throw new HttpClientError(
        `Parsing failed: ${err?.message ?? String(err)}`,
        res.status,
      );
    }
  }

  /**
   * Makes an HTTP request without using the cache.
   * Used for methods that shouldn't be cached or when caching is disabled.
   * @param method - HTTP method
   * @param req - Request configuration
   * @param responseType - Expected response type
   * @returns Promise resolving to the response data
   */
  private async requestInternalWithoutCache<T = any>(
    method: string,
    req: RequestInterface,
    responseType?: ResponseType,
  ): Promise<T> {
    const url = req.getURL();
    const rawBody = req.getBodyData();
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...req.getHeaders(),
    };

    const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    let body: string | Buffer | undefined;
    const contentType = headers["content-type"] || headers["Content-Type"] || "";

    if (isBodyAllowed && rawBody !== undefined && rawBody !== null) {
      if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
      } else if (typeof rawBody === "string") {
        body = rawBody;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = new URLSearchParams(rawBody).toString();
      } else {
        body = JSON.stringify(rawBody);
        if (!contentType)
          headers["Content-Type"] = "application/json; charset=utf-8";
      }
    }

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

    const result = await this.queue.enqueue(async () => {
      const res = await this.sendWithRetry(method, url, headers, body, metrics);
      metrics.statusCode = res.status;
      metrics.bytesReceived = res.body.length;
      metrics.bytesSent = body instanceof Buffer 
        ? body.length 
        : Buffer.byteLength(body || "");

      if (method === "HEAD") {
        return { status: res.status, headers: res.headers } as any;
      }

      const parsed = await this.parseResponse(res, responseType);
      return parsed as T;
    });

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    this.requestMetrics.set(url, metrics);
    this.trimMetrics();

    return result;
  }

  /**
   * Makes an HTTP request with caching support.
   * Handles cache lookups, request deduplication, and automatic cache storage.
   * @param method - HTTP method
   * @param req - Request configuration
   * @param useCache - Whether to use caching (default: true)
   * @param responseType - Expected response type
   * @returns Promise resolving to the response data
   */
  private async requestInternal<T = any>(
    method: string,
    req: RequestInterface,
    useCache = true,
    responseType?: ResponseType,
  ): Promise<T> {
    if (this.options.cacheTTL === 0) {
      return this.requestInternalWithoutCache(method, req, responseType);
    }


    const url = req.getURL();
    const rawBody = req.getBodyData();
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...req.getHeaders(),
    };

    const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    let body: string | Buffer | undefined;
    const contentType =
      headers["content-type"] || headers["Content-Type"] || "";

    if (isBodyAllowed && rawBody !== undefined && rawBody !== null) {
      if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
      } else if (typeof rawBody === "string") {
        body = rawBody;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        body = new URLSearchParams(rawBody).toString();
      } else {
        body = JSON.stringify(rawBody);
        if (!contentType)
          headers["Content-Type"] = "application/json; charset=utf-8";
      }
    }

    const bodyHash = this.hashBody(body);
    const cacheKey = createHash("sha1")
      .update(method + url + bodyHash + responseType)
      .digest("hex");

    if (this.options.cacheMethods.includes(method) && useCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        this.log("debug", `Cache hit for ${url}`);
        return cached;
      }
    }

    if (this.inflight.has(cacheKey)) {
      this.log("debug", `Deduplicating request for ${url}`);
      return this.inflight.get(cacheKey)!;
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
        bodyHash,
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

          if (method === "HEAD") {
            return { status: res.status, headers: res.headers } as any;
          }

          const parsed = await this.parseResponse(res, responseType);

          if (this.options.cacheMethods.includes(method) && useCache) {
            this.cache.set(cacheKey, parsed);
            metrics.cached = true;
          }

          return parsed as T;
        });

        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.requestMetrics.set(cacheKey, metrics);
        this.trimMetrics();

        this.log(
          "info",
          `${method} ${url} completed in ${metrics.duration}ms`,
          metrics,
        );
        return result;
      } catch (error) {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.requestMetrics.set(cacheKey, metrics);
        this.trimMetrics();
        throw error;
      } finally {
        this.inflight.delete(cacheKey);
      }
    })();

    this.inflight.set(cacheKey, promise);
    return promise;
  }

  /**
   * Makes an HTTP GET request.
   * Supports both RequestInterface objects and direct URL strings.
   * GET requests are cached by default unless caching is disabled.
   * @param req - Request configuration or URL string
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  get<T = any>(
    req: RequestInterface | string,
    responseType: ResponseType = "json",
  ): Promise<T> {
    if (typeof req === "string") {
      const simpleReq: RequestInterface = {
        getURL: () => req,
        getBodyData: () => undefined as any,
        getHeaders: () => ({}),
      };
      return this.requestInternal<T>("GET", simpleReq, true, responseType);
    } else {
      return this.requestInternal<T>("GET", req, true, responseType);
    }
  }

  /**
   * Makes an HTTP POST request.
   * Supports both RequestInterface objects and direct URL strings with body data.
   * POST requests are not cached by default due to their side effects.
   * @param req - Request configuration or URL string
   * @param body - Request body data (optional)
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  post<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType: ResponseType = "json",
  ): Promise<T> {
    if (typeof req === "string") {
      const simpleReq: RequestInterface = {
        getURL: () => req,
        getBodyData: () => body,
        getHeaders: () => ({ "Content-Type": "application/json" }),
      };
      return this.requestInternal<T>("POST", simpleReq, false, responseType);
    } else {
      return this.requestInternal<T>("POST", req, false, responseType);
    }
  }

  /**
   * Makes an HTTP PUT request.
   * Supports both RequestInterface objects and direct URL strings with body data.
   * PUT requests are not cached by default due to their side effects.
   * @param req - Request configuration or URL string
   * @param body - Request body data (optional)
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  put<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType: ResponseType = "json",
  ): Promise<T> {
    if (typeof req === "string") {
      const client = defaultClient ?? (defaultClient = new HttpClientImproved());
      const simpleReq: RequestInterface = {
        getURL: () => req,
        getBodyData: () => body,
        getHeaders: () => ({ "Content-Type": "application/json" }),
      };
      return client.put(simpleReq, responseType);
    }
    return this.requestInternal<T>("PUT", req, false, responseType);
  }

  /**
   * Makes an HTTP DELETE request.
   * Supports both RequestInterface objects and direct URL strings.
   * DELETE requests are not cached by default due to their side effects.
   * @param req - Request configuration or URL string
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  delete<T = any>(
    req: RequestInterface | string,
    responseType: ResponseType = "json",
  ): Promise<T> {
    if (typeof req === "string") {
      const client = defaultClient ?? (defaultClient = new HttpClientImproved());
      const simpleReq: RequestInterface = {
        getURL: () => req,
        getBodyData: () => undefined as any,
        getHeaders: () => ({}),
      };
      return client.delete(simpleReq, responseType);
    }
    return this.requestInternal<T>("DELETE", req, false, responseType);
  }

  /**
   * Makes an HTTP PATCH request.
   * PATCH requests are not cached by default due to their side effects.
   * @param req - Request configuration
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  patch<T = any>(
    req: RequestInterface,
    responseType: ResponseType = "json",
  ): Promise<T> {
    return this.requestInternal<T>("PATCH", req, false, responseType);
  }

  /**
   * Makes an HTTP HEAD request.
   * Returns only the status code and headers without the response body.
   * HEAD requests are not cached by default.
   * @param req - Request configuration or URL string
   * @returns Promise resolving to status and headers
   */
  async head(
    req: RequestInterface | string,
  ): Promise<{ status: number; headers: Record<string, any> }> {
    if (typeof req === "string") {
      const client = defaultClient ?? (defaultClient = new HttpClientImproved());
      const simpleReq: RequestInterface = {
        getURL: () => req,
        getBodyData: () => undefined as any,
        getHeaders: () => ({}),
      };
      return client.head(simpleReq);
    }
    return this.requestInternal("HEAD", req, false) as Promise<{
      status: number;
      headers: Record<string, any>;
    }>;
  }

  /**
   * Clears the internal cache of the HTTP client.
   * Removes all cached responses and resets the cache state.
   */
  clearCache(): void {
    this.cache.clear();
    this.log("info", "Cache cleared");
  }

  /**
   * Clears all collected request metrics.
   * Removes performance and timing data from memory.
   */
  clearMetrics(): void {
    this.requestMetrics.clear();
    this.log("info", "Metrics cleared");
  }

  /**
   * Retrieves metrics for a specific request by its URL.
   * @param key - The URL or cache key to retrieve metrics for
   * @returns Metrics object if found, undefined otherwise
   */
  getMetrics(key: string): RequestMetrics | undefined {
    return this.requestMetrics.get(key);
  }

  /**
   * Retrieves all collected request metrics.
   * @returns Array of all metrics objects
   */
  getAllMetrics(): RequestMetrics[] {
    return Array.from(this.requestMetrics.values());
  }

  /**
   * Creates a fluent request builder for making HTTP requests.
   * Provides a chainable API for building and sending requests.
   * @param url - The target URL for the request
   * @returns RequestBuilder instance for chaining
   */
  request<T = any>(url: string): RequestBuilder<T> {
    return new RequestBuilder(url);
  }

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
  } {
    return {
      cacheSize: this.cache.size,
      inflightRequests: this.inflight.size,
      queuedRequests: this.queue.queuedCount,
      activeRequests: this.queue.activeCount,
      currentRateLimit: this.limiter.currentCount,
      metricsSize: this.requestMetrics.size,
    };
  }
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
class RequestBuilder<T = any> {
  private _url: string;
  private _method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET";
  private _headers: Record<string, string> = {};
  private _body?: any;
  private _responseType: ResponseType = "json";

  /**
   * Creates a new request builder for the specified URL.
   * @param url - The target URL for the request
   */
  constructor(url: string) {
    this._url = url;
  }

  /**
   * Sets HTTP headers for the request.
   * @param headers - Object containing header key-value pairs
   * @returns The builder instance for chaining
   */
  headers(headers: Record<string, string>): this {
    this._headers = headers;
    return this;
  }

  /**
   * Sets the request body data.
   * @param bodyData - The body data to send with the request
   * @returns The builder instance for chaining
   */
  body(bodyData: any): this {
    this._body = bodyData;
    return this;
  }

  /**
   * Sets the response type to JSON.
   * @returns The builder instance for chaining
   */
  json(): this {
    this._responseType = "json";
    return this;
  }

  /**
   * Sets the response type to plain text.
   * @returns The builder instance for chaining
   */
  text(): this {
    this._responseType = "text";
    return this;
  }

  /**
   * Sets the response type to XML.
   * @returns The builder instance for chaining
   */
  xml(): this {
    this._responseType = "xml";
    return this;
  }

  /**
   * Sets the HTTP method to POST.
   * @returns The builder instance for chaining
   */
  post(): this {
    this._method = "POST";
    return this;
  }

  /**
   * Sets the HTTP method to PUT.
   * @returns The builder instance for chaining
   */
  put(): this {
    this._method = "PUT";
    return this;
  }

  /**
   * Sets the HTTP method to PATCH.
   * @returns The builder instance for chaining
   */
  patch(): this {
    this._method = "PATCH";
    return this;
  }

  /**
   * Sets the HTTP method to DELETE.
   * @returns The builder instance for chaining
   */
  delete(): this {
    this._method = "DELETE";
    return this;
  }

  /**
   * Adds query parameters to the URL.
   * @param params - Object containing query parameter key-value pairs
   * @returns The builder instance for chaining
   */
  query(params: Record<string, string | number | boolean>): this {
    const urlObj = new URL(this._url);
    Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, String(v)));
    this._url = urlObj.toString();
    return this;
  }

  /**
   * Sets a JSON body for the request.
   * Automatically sets the Content-Type header to application/json.
   * @param body - The JSON body data
   * @returns The builder instance for chaining
   */
  jsonBody<T>(body: T): this {
    this._body = body;
    this._headers['Content-Type'] = 'application/json; charset=utf-8';
    return this;
  }

  /**
   * Sends the HTTP request and returns the response.
   * @returns Promise resolving to the response data
   */
  async send(): Promise<T> {
    const client = defaultClient ?? (defaultClient = new HttpClientImproved());
    const req: RequestInterface = {
      getURL: () => this._url,
      getBodyData: () => this._body,
      getHeaders: () => this._headers,
    };

    switch (this._method) {
      case "GET":
        return client.get(req, this._responseType);
      case "POST":
        return client.post(req, this._responseType);
      case "PUT":
        return client.put(req, this._responseType);
      case "DELETE":
        return client.delete(req, this._responseType);
      case "PATCH":
        return client.patch(req, this._responseType);
      default:
        return client.get(req, this._responseType);
    }
  }
}
