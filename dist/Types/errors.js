"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.TimeoutError = exports.HttpClientError = void 0;
class HttpClientError extends Error {
    code;
    statusCode;
    originalError;
    url;
    method;
    constructor(message, code = "HTTP_ERROR", statusCode, originalError, url, method) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.url = url;
        this.method = method;
        this.name = "HttpClientError";
    }
}
exports.HttpClientError = HttpClientError;
class TimeoutError extends HttpClientError {
    constructor(url, timeout) {
        super(`Timeout after ${timeout}ms`, "TIMEOUT", 408, undefined, url);
        this.name = "TimeoutError";
    }
}
exports.TimeoutError = TimeoutError;
class RateLimitError extends HttpClientError {
    constructor(url, retryAfter) {
        super(`Rate limited${retryAfter ? ` retry in ${retryAfter}ms` : ""}`, "RATE_LIMIT", 429, undefined, url);
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=errors.js.map