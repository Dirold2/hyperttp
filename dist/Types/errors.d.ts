export declare class HttpClientError extends Error {
    code: string;
    statusCode?: number | undefined;
    originalError?: Error | undefined;
    url?: string | undefined;
    method?: string | undefined;
    constructor(message: string, code?: string, statusCode?: number | undefined, originalError?: Error | undefined, url?: string | undefined, method?: string | undefined);
}
export declare class TimeoutError extends HttpClientError {
    constructor(url: string, timeout: number);
}
export declare class RateLimitError extends HttpClientError {
    constructor(url: string, retryAfter?: number);
}
//# sourceMappingURL=errors.d.ts.map