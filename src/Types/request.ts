/**
 * Represents HTTP request headers
 */
export type RequestHeaders = { [key: string]: string };

/**
 * Represents URL query parameters
 */
export type RequestQuery = { [key: string]: string };

/**
 * Represents body data for requests
 */
export type RequestBodyData = { [key: string]: string };

/**
 * Configuration for a request
 */
export type RequestConfig = {
  /** Protocol scheme (http or https) */
  scheme: string;

  /** Hostname or IP address */
  host: string;

  /** Port number */
  port: number;

  /** Optional path after host */
  path?: string;

  /** Optional headers */
  headers?: RequestHeaders;

  /** Optional query parameters */
  query?: RequestQuery;

  /** Optional body data */
  bodyData?: RequestBodyData;
};

/**
 * HTTP method type
 */
export type Method = "get" | "post";

/**
 * Represents a generic object response
 */
export type ObjectResponse = { [key: string]: any };

/**
 * Represents a plain string response
 */
export type StringResponse = string;

/**
 * Represents either an object or string response
 */
export type Response = ObjectResponse | StringResponse;

/**
 * Interface for a request object
 */
export interface RequestInterface {
  /** Set the request path */
  setPath(path: string): RequestInterface;

  /** Set the host for the request */
  setHost(host: string): RequestInterface;

  /** Get current request headers */
  getHeaders(): RequestHeaders;

  /** Replace all headers */
  setHeaders(headers: RequestHeaders): RequestInterface;

  /** Add headers to the existing ones */
  addHeaders(headers: RequestHeaders): RequestInterface;

  /** Get current query parameters */
  getQuery(): RequestQuery;

  /** Replace all query parameters */
  setQuery(query: RequestQuery): RequestInterface;

  /** Add query parameters */
  addQuery(query: RequestQuery): RequestInterface;

  /** Get query string representation */
  getQueryAsString(): string;

  /** Get request body data */
  getBodyData(): RequestBodyData;

  /** Get body data as string (e.g., for JSON or URL-encoded) */
  getBodyDataString(): string;

  /** Replace body data */
  setBodyData(bodyData: RequestBodyData): RequestInterface;

  /** Add data to the existing body */
  addBodyData(bodyData: RequestBodyData): RequestInterface;

  /** Get URI (path + query) */
  getURI(): string;

  /** Get full URL including scheme, host, port, path and query */
  getURL(): string;
}

/**
 * Interface for a HTTP client
 */
export interface HttpClientInterface {
  /**
   * Send a GET request
   * @param request Request object
   * @returns Response object or string
   */
  get(request: RequestInterface): Promise<Response>;

  /**
   * Send a POST request
   * @param request Request object
   * @returns Response object or string
   */
  post(request: RequestInterface): Promise<Response>;
}

/**
 * Options to configure HttpClient
 */
export interface HttpClientOptions {
  /** Maximum number of concurrent requests */
  maxConcurrent?: number;

  /** Rate limiting options */
  rateLimit?: { maxRequests?: number; windowMs?: number };

  /** Maximum number of retry attempts */
  maxRetries?: number;

  /** Cache time-to-live in milliseconds */
  cacheTTL?: number;

  /** Maximum number of cached items */
  cacheMaxSize?: number;

  /** Logger function to capture debug/info/warn/error messages */
  logger?: (
    level: "debug" | "info" | "warn" | "error",
    msg: string,
    meta?: any
  ) => void;

  /** User-Agent string to send with requests */
  userAgent?: string;

  /** Follow HTTP redirects (default true) */
  followRedirects?: boolean;

  /** Request timeout in milliseconds */
  timeout?: number;

  responseType?: ResponseType;
}

export type ResponseType = "json" | "text" | "buffer" | "xml";