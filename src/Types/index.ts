import { ResponseType, RequestInterface } from "./request";
export * from "./request";

/**
 * Базовый класс ошибки
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public code: string = "HTTP_ERROR",
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
    super(
      `Request timeout after ${timeout}ms for ${url}`,
      "TIMEOUT",
      408,
      undefined,
      url,
    );
    this.name = "TimeoutError";
  }
}

export class RateLimitError extends HttpClientError {
  constructor(
    url: string,
    public retryAfter?: number,
  ) {
    super(
      `Rate limited for ${url}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`,
      "RATE_LIMIT",
      429,
      undefined,
      url,
    );
    this.name = "RateLimitError";
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryStatusCodes: number[];
  jitter: boolean;
}

export type RequestInterceptor = (config: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}) => Promise<any> | any;

export type ResponseInterceptor = (response: {
  status: number;
  headers: Record<string, any>;
  body: Buffer;
  url: string;
}) => Promise<any> | any;

export interface HttpClientOptions {
  timeout?: number;
  maxConcurrent?: number;
  maxRetries?: number;
  cacheTTL?: number;
  cacheMaxSize?: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  userAgent?: string;
  logger?: (level: LogLevel, message: string, meta?: any) => void;
  retryOptions?: Partial<RetryOptions>;
  followRedirects?: boolean;
  maxRedirects?: number;
  maxResponseBytes?: number;
  validateStatus?: (status: number) => boolean;
  cacheMethods?: string[];
  maxMetricsSize?: number;
  verbose?: boolean;
  enableQueue?: boolean;
  enableRateLimit?: boolean;
  enableCache?: boolean;
}

export interface HttpClientInterface {
  get<T = any>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;
  post<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;
  put<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;
  delete<T = any>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;
  patch<T = any>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;
  head(
    req: RequestInterface | string,
  ): Promise<{ status: number; headers: Record<string, any> }>;
  stream(req: RequestInterface | string): Promise<StreamResponse>;
  clearCache(): void;
}

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
  bodyHash?: string;
}

export interface StreamResponse {
  status: number;
  headers: Record<string, any>;
  body: AsyncIterable<Uint8Array>;
  url: string;
}

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
