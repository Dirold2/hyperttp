"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.TimeoutError = exports.HttpClientError = void 0;
/**
 * Base error class for HTTP client operations.
 * Contains additional context about the failed request including status code, URL, and method.
 */
class HttpClientError extends Error {
    statusCode;
    originalError;
    url;
    method;
    constructor(message, statusCode, originalError, url, method) {
        super(message);
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.url = url;
        this.method = method;
        this.name = "HttpClientError";
        Object.setPrototypeOf(this, HttpClientError.prototype);
    }
}
exports.HttpClientError = HttpClientError;
/**
 * Error thrown when an HTTP request exceeds the configured timeout duration.
 * Contains information about the URL and timeout value that caused the failure.
 */
class TimeoutError extends HttpClientError {
    constructor(url, timeout) {
        super(`Request timeout after ${timeout}ms for ${url}`);
        this.name = "TimeoutError";
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Error thrown when an HTTP request is rate limited by the server.
 * Contains information about the URL and optional retry-after duration.
 */
class RateLimitError extends HttpClientError {
    retryAfter;
    constructor(url, retryAfter) {
        super(`Rate limited for ${url}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`);
        this.retryAfter = retryAfter;
        this.name = "RateLimitError";
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
exports.RateLimitError = RateLimitError;
__exportStar(require("./request"), exports);
//# sourceMappingURL=index.js.map