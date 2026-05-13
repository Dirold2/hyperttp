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
  }
}

export class TimeoutError extends HttpClientError {
  constructor(url: string, timeout: number) {
    super(`Timeout after ${timeout}ms`, "TIMEOUT", 408, undefined, url);
    this.name = "TimeoutError";
  }
}

export class RateLimitError extends HttpClientError {
  constructor(url: string, retryAfter?: number) {
    super(
      `Rate limited${retryAfter ? ` retry in ${retryAfter}ms` : ""}`,
      "RATE_LIMIT",
      429,
      undefined,
      url,
    );
  }
}
