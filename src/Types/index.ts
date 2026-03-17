import { RateLimiterConfig } from "../Hyperttp/Core";
import { ResponseType } from "./request";

/**
 * Interface for a universal URL extractor
 */
export interface UrlExtractorInterface {
  /**
   * Register a platform with its URL patterns
   * @param platform Platform name (e.g., "yandex", "spotify")
   * @param patterns Array of URL patterns for the platform
   */
  registerPlatform(platform: string, patterns: UrlPattern[]): void;

  /**
   * Extract an entity ID or related info from a URL
   * @param url URL to extract from
   * @param entity Entity type ("track", "album", "artist", "playlist", etc.)
   * @param platform Platform name that has been registered
   * @returns Record of extracted values (keys depend on the pattern)
   */
  extractId<T extends string | number>(
    url: string,
    entity: string,
    platform: string,
  ): Record<string, T>;
}

/**
 * Defines a URL extraction pattern for a platform
 */
export interface UrlPattern<T extends string = string> {
  /** Entity type this pattern applies to (track, album, artist, playlist, etc.) */
  entity: string;

  /** Regex with named capturing groups to extract IDs or info */
  regex: RegExp;

  /** Names of the capturing groups to extract */
  groupNames: T[];
}

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
  /** Whether to enable request queuing (default: true) */
  enableQueue?: boolean;
  /** Whether to enable rate limiting (default: true) */
  enableRateLimit?: boolean;
  /** Whether to enable caching (default: true) */
  enableCache?: boolean;
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
  get<T = any>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP POST request
   * @param req - Request configuration or URL string
   * @param body - Request body data
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  post<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP PUT request
   * @param req - Request configuration or URL string
   * @param body - Request body data
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  put<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  stream(req: RequestInterface | string): Promise<StreamResponse>;

  /**
   * Makes an HTTP DELETE request
   * @param req - Request configuration or URL string
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  delete<T = any>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP PATCH request
   * @param req - Request configuration
   * @param responseType - Expected response type (default: "json")
   * @returns Promise resolving to the response data
   */
  patch<T = any>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;

  /**
   * Makes an HTTP HEAD request
   * @param req - Request configuration or URL string
   * @returns Promise resolving to status and headers
   */
  head(
    req: RequestInterface | string,
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

export interface StreamResponse {
  status: number;
  headers: Record<string, any>;
  body: AsyncIterable<Uint8Array>;
  url: string;
}

export * from "./request";
