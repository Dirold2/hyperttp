import { CookieJar } from "tough-cookie"
import { CookieAgent } from "http-cookie-agent/undici"
import { request } from "undici"
import * as zlib from "zlib"
import { promisify } from "util"
import { XMLParser } from "fast-xml-parser"
import * as querystring from "querystring"
import { CacheManager } from "./CacheManager"
import { QueueManager } from "./QueueManager"
import { RateLimiter, type RateLimiterConfig } from "./RateLimiter"
import { ResponseType } from '../../Types'

const gunzip = promisify(zlib.gunzip)
const inflate = promisify(zlib.inflate)
const brotliDecompress = promisify(zlib.brotliDecompress)

/**
 * Log levels for the HTTP client logger
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

/**
 * Logger function type for HTTP client operations
 */
export type LoggerFunction = (level: LogLevel, message: string, meta?: any) => void

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay: number
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelay: number
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryStatusCodes: number[]
  /** Whether to add random jitter to retry delays (default: true) */
  jitter: boolean
}

/**
 * Configuration options for the HttpClient
 */
export interface HttpClientOptions {
  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number
  /** Maximum number of concurrent requests (default: 50) */
  maxConcurrent?: number
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Cache time-to-live in milliseconds (default: 300000) */
  cacheTTL?: number
  /** Maximum cache size (default: 500) */
  cacheMaxSize?: number
  /** Rate limiting configuration */
  rateLimit?: RateLimiterConfig
  /** Custom User-Agent header (default: "Hyperttp/0.1.0 Node.js") */
  userAgent?: string
  /** Logger function for debugging and monitoring */
  logger?: LoggerFunction
  /** Custom retry options */
  retryOptions?: Partial<RetryOptions>
}

/**
 * Interface for request objects
 */
export interface RequestInterface {
  /** Gets the full URL for the request */
  getURL(): string
  /** Gets the request body data */
  getBodyData(): any
  /** Gets the request headers */
  getHeaders(): Record<string, string>
}

/**
 * Interface for HTTP client implementations
 */
export interface HttpClientInterface {
  /** Performs a GET request */
  get<T = any>(req: RequestInterface): Promise<T>
  /** Performs a POST request */
  post<T = any>(req: RequestInterface): Promise<T>
  /** Performs a PUT request */
  put<T = any>(req: RequestInterface): Promise<T>
  /** Performs a DELETE request */
  delete<T = any>(req: RequestInterface): Promise<T>
  /** Clears the cache */
  clearCache(): void
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
  private cookieJar = new CookieJar()
  private agent: CookieAgent
  private cache: CacheManager
  private queue: QueueManager
  private limiter: RateLimiter
  private inflight = new Map<string, Promise<any>>()
  private retryOptions: RetryOptions
  private defaultHeaders: Record<string, string> = {}
  private options: HttpClientOptions

  /**
   * Creates a new HttpClient instance
   * @param options - Configuration options for the HTTP client
   */
  constructor(options?: HttpClientOptions) {
    this.options = options ?? {}

    // Initialize cache manager
    this.cache = new CacheManager({
      cacheTTL: this.options.cacheTTL,
      cacheMaxSize: this.options.cacheMaxSize,
    })

    // Initialize queue manager
    this.queue = new QueueManager(this.options.maxConcurrent ?? 50)

    // Initialize rate limiter
    this.limiter = new RateLimiter(this.options.rateLimit)

    // Configure retry behavior
    this.retryOptions = {
      maxRetries: this.options.maxRetries ?? 3,
      baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
      maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
      retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [408, 429, 500, 502, 503, 504],
      jitter: this.options.retryOptions?.jitter ?? true,
    }

    // Set default headers
    this.defaultHeaders = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
    }

    // Initialize HTTP agent with cookie support
    this.agent = new CookieAgent({
      cookies: { jar: this.cookieJar },
      connections: 100,
      pipelining: 10,
    })
  }

  /**
   * Sets or updates default headers for all requests
   * @param headers - Headers to merge with existing default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers)
  }

  /**
   * Gets the cookie jar for manual cookie management
   * @returns The cookie jar instance
   */
  getCookieJar(): CookieJar {
    return this.cookieJar
  }

  /**
   * Internal logging method
   * @private
   */
  private log(level: LogLevel, msg: string, meta?: any): void {
    if (this.options.logger) {
      this.options.logger(level, msg, meta)
    }
  }

  /**
   * Decompresses response body based on content encoding
   * @private
   */
  private async decompress(buf: Buffer, enc?: string): Promise<string> {
    if (!enc) return buf.toString("utf-8")

    try {
      switch (enc.toLowerCase()) {
        case "gzip":
          return (await gunzip(buf)).toString("utf-8")
        case "deflate":
          return (await inflate(buf)).toString("utf-8")
        case "br":
          return (await brotliDecompress(buf)).toString("utf-8")
        default:
          return buf.toString("utf-8")
      }
    } catch (error) {
      this.log("error", `Decompression failed for encoding ${enc}`, error)
      return buf.toString("utf-8")
    }
  }

  /**
   * Calculates retry delay with exponential backoff and optional jitter
   * @private
   */
  private calcDelay(attempt: number): number {
    const base = Math.min(this.retryOptions.baseDelay * 2 ** attempt, this.retryOptions.maxDelay)
    return this.retryOptions.jitter ? base * (0.75 + Math.random() * 0.5) : base
  }

  /**
   * Utility method for sleeping
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Sends an HTTP request with automatic retry logic
   * @private
   */
  private async sendWithRetry(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string | Buffer,
  ): Promise<{ status: number; headers: Record<string, any>; body: Buffer }> {
    let lastError: any

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // Apply rate limiting
        await this.limiter.wait()

        // Set up request timeout
        const controller = new AbortController()
        const timeout = this.options.timeout ?? 15000
        const timer = setTimeout(() => controller.abort(), timeout)

        // Make the request
        const res = await request(url, {
          method,
          headers,
          body,
          dispatcher: this.agent,
          signal: controller.signal,
        })

        clearTimeout(timer)

        // Read response body
        const buf = Buffer.from(await res.body.arrayBuffer())

        // Check if we should retry based on status code
        if (this.retryOptions.retryStatusCodes.includes(res.statusCode)) {
          this.log("warn", `Retrying ${method} ${url} due to status ${res.statusCode}`, {
            attempt: attempt + 1,
            maxRetries: this.retryOptions.maxRetries,
          })

          if (attempt < this.retryOptions.maxRetries) {
            await this.sleep(this.calcDelay(attempt))
            continue
          }
        }

        return { status: res.statusCode, headers: res.headers as Record<string, any>, body: buf }
      } catch (err: any) {
        lastError = err
        this.log("error", `Request error ${method} ${url}: ${err.message}`, {
          attempt: attempt + 1,
          error: err,
        })

        if (attempt < this.retryOptions.maxRetries) {
          await this.sleep(this.calcDelay(attempt))
        }
      }
    }

    throw lastError
  }

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
  private async parseResponse(
    res: { status: number; headers: Record<string, any>; body: Buffer },
    responseType?: ResponseType
  ): Promise<any> {
    try {
      const text = await this.decompress(res.body, res.headers["content-encoding"]);
      const contentType = res.headers["content-type"];
      const type = responseType ?? "json";

      switch (type) {
        case "json":
          if (contentType?.includes("json")) return JSON.parse(text);
          try { return JSON.parse(text); } catch { return text; }

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
      this.log("error", "Failed to parse response", { error, status: res.status });
      throw new Error(`Response parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Internal request method with caching and deduplication
   * @private
   * @param method HTTP method
   * @param req Request object
   * @param useCache Whether to use cache (GET requests)
   * @param responseType Type of response: 'json' | 'text' | 'buffer' | 'xml'
   */
  private async request<T = any>(
    method: string,
    req: RequestInterface,
    useCache = true,
    responseType?: ResponseType
  ): Promise<T> {
    const url = req.getURL();
    const rawBody = req.getBodyData();
    const headers = { ...this.defaultHeaders, ...req.getHeaders() };
    const contentType = headers["content-type"] || headers["Content-Type"] || "";
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
      try {
        this.log("debug", `Starting request: ${method} ${url}`);

        const result = await this.queue.enqueue(async () => {
          const res = await this.sendWithRetry(method, url, headers, body);
          const parsed = await this.parseResponse(res, responseType);

          // Cache GET requests
          if (method === "GET" && useCache) {
            this.cache.set(key, parsed);
          }

          return parsed;
        });

        return result;
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
   *
   * @example
   * ```ts
   * const data = await client.get(req); // Default JSON
   * const text = await client.get(req, 'text'); // Plain text
   * const buf = await client.get(req, 'buffer'); // Buffer
   * const xml = await client.get(req, 'xml'); // Parsed XML
   * ```
   */
  get<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("GET", req, true, responseType);
  }

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
  post<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("POST", req, false, responseType);
  }

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
  put<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("PUT", req, false, responseType);
  }

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
  delete<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("DELETE", req, false, responseType);
  }

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
  patch<T = any>(req: RequestInterface, responseType?: ResponseType): Promise<T> {
    return this.request<T>("PATCH", req, false, responseType);
  }


  /**
   * Clears all cached responses
   */
  clearCache(): void {
    this.cache.clear()
    this.log("info", "Cache cleared")
  }

  /**
   * Gets statistics about the HTTP client state
   * @returns Object containing current state information
   */
  getStats(): {
    cacheSize: number
    inflightRequests: number
    queuedRequests: number
    activeRequests: number
    currentRateLimit: number
  } {
    return {
      cacheSize: this.cache.size,
      inflightRequests: this.inflight.size,
      queuedRequests: this.queue.queuedCount,
      activeRequests: this.queue.activeCount,
      currentRateLimit: this.limiter.currentCount,
    }
  }
}
