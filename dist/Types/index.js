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
__exportStar(require("./request"), exports);
/**
 * Базовый класс ошибки
 */
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
        Object.setPrototypeOf(this, HttpClientError.prototype);
    }
}
exports.HttpClientError = HttpClientError;
class TimeoutError extends HttpClientError {
    constructor(url, timeout) {
        super(`Request timeout after ${timeout}ms for ${url}`, "TIMEOUT", 408, undefined, url);
        this.name = "TimeoutError";
    }
}
exports.TimeoutError = TimeoutError;
class RateLimitError extends HttpClientError {
    retryAfter;
    constructor(url, retryAfter) {
        super(`Rate limited for ${url}${retryAfter ? `, retry after ${retryAfter}ms` : ""}`, "RATE_LIMIT", 429, undefined, url);
        this.retryAfter = retryAfter;
        this.name = "RateLimitError";
    }
}
exports.RateLimitError = RateLimitError;
//# sourceMappingURL=index.js.map