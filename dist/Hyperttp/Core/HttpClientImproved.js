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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.TimeoutError = exports.HttpClientError = void 0;
const tough_cookie_1 = require("tough-cookie");
const undici_1 = require("undici");
const undici_2 = require("http-cookie-agent/undici");
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const fast_xml_parser_1 = require("fast-xml-parser");
const querystring = __importStar(require("querystring"));
const CacheManager_1 = require("./CacheManager");
const QueueManager_1 = require("./QueueManager");
const RateLimiter_1 = require("./RateLimiter");
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const inflate = (0, util_1.promisify)(zlib.inflate);
const brotliDecompress = (0, util_1.promisify)(zlib.brotliDecompress);
/**
 * Custom error classes for better error handling
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
class TimeoutError extends HttpClientError {
    constructor(url, timeout) {
        super(`Request timeout after ${timeout}ms for ${url}`);
        this.name = "TimeoutError";
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}
exports.TimeoutError = TimeoutError;
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
 * - Request/Response interceptors
 * - Redirect following
 * - Request metrics tracking
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxConcurrent: 10,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 },
 *   logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta),
 *   followRedirects: true
 * });
 *
 * const data = await client.get(request);
 * ```
 */
class HttpClientImproved {
    cookieJar = new tough_cookie_1.CookieJar();
    agent;
    cache;
    queue;
    limiter;
    inflight = new Map();
    retryOptions;
    defaultHeaders = {};
    options;
    requestInterceptors = [];
    responseInterceptors = [];
    requestMetrics = new Map();
    /**
     * Creates a new HttpClient instance
     * @param options - Configuration options for the HTTP client
     */
    constructor(options) {
        this.options = { followRedirects: true, maxRedirects: 5, ...options };
        // Initialize cache manager
        this.cache = new CacheManager_1.CacheManager({
            cacheTTL: this.options.cacheTTL,
            cacheMaxSize: this.options.cacheMaxSize,
        });
        // Initialize queue manager
        this.queue = new QueueManager_1.QueueManager(this.options.maxConcurrent ?? 50);
        // Initialize rate limiter
        this.limiter = new RateLimiter_1.RateLimiter(this.options.rateLimit);
        // Configure retry behavior
        this.retryOptions = {
            maxRetries: this.options.maxRetries ?? 3,
            baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
            maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
            retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
                408, 429, 500, 502, 503, 504,
            ],
            jitter: this.options.retryOptions?.jitter ?? true,
        };
        // Set default headers
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
        };
        // Initialize HTTP agent with cookie support (новый API для undici v7)
        this.agent = new undici_1.Agent({
            connections: 100,
            pipelining: 10,
        }).compose((0, undici_2.cookie)({ jar: this.cookieJar }));
    }
    /**
     * Sets or updates default headers for all requests
     * @param headers - Headers to merge with existing default headers
     */
    setDefaultHeaders(headers) {
        Object.assign(this.defaultHeaders, headers);
    }
    /**
     * Gets the cookie jar for manual cookie management
     * @returns The cookie jar instance
     */
    getCookieJar() {
        return this.cookieJar;
    }
    /**
     * Adds a request interceptor
     * @param interceptor - Function to intercept requests
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    /**
     * Adds a response interceptor
     * @param interceptor - Function to intercept responses
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    /**
     * Internal logging method
     * @private
     */
    log(level, msg, meta) {
        if (this.options.logger) {
            this.options.logger(level, msg, meta);
        }
    }
    /**
     * Decompresses response body based on content encoding
     * @private
     */
    async decompress(buf, enc, charset = "utf-8") {
        if (!enc)
            return buf.toString(charset);
        try {
            switch (enc.toLowerCase()) {
                case "gzip":
                    return (await gunzip(buf)).toString(charset);
                case "deflate":
                    return (await inflate(buf)).toString(charset);
                case "br":
                    return (await brotliDecompress(buf)).toString(charset);
                default:
                    return buf.toString(charset);
            }
        }
        catch (error) {
            this.log("error", `Decompression failed for encoding ${enc}`, error);
            return buf.toString(charset);
        }
    }
    /**
     * Calculates retry delay with exponential backoff and optional jitter
     * @private
     */
    calcDelay(attempt) {
        const base = Math.min(this.retryOptions.baseDelay * 2 ** attempt, this.retryOptions.maxDelay);
        return this.retryOptions.jitter
            ? base * (0.75 + Math.random() * 0.5)
            : base;
    }
    /**
     * Utility method for sleeping
     * @private
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Applies request interceptors
     * @private
     */
    async applyRequestInterceptors(config) {
        let result = config;
        for (const interceptor of this.requestInterceptors) {
            result = await interceptor(result);
        }
        return result;
    }
    /**
     * Applies response interceptors
     * @private
     */
    async applyResponseInterceptors(response) {
        let result = response;
        for (const interceptor of this.responseInterceptors) {
            result = await interceptor(result);
        }
        return result;
    }
    /**
     * Sends an HTTP request with automatic retry logic and redirect following
     * @private
     */
    async sendWithRetry(method, url, headers, body, redirects = 0) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                // Apply rate limiting
                await this.limiter.wait();
                // Apply request interceptors
                let finalConfig = await this.applyRequestInterceptors({
                    url,
                    method,
                    headers,
                    body,
                });
                // Set up request timeout
                const controller = new AbortController();
                const timeout = this.options.timeout ?? 15000;
                const timer = setTimeout(() => controller.abort(), timeout);
                try {
                    // Make the request
                    const res = await (0, undici_1.request)(finalConfig.url, {
                        method: finalConfig.method,
                        headers: finalConfig.headers,
                        body: finalConfig.body,
                        dispatcher: this.agent,
                        signal: controller.signal,
                    });
                    clearTimeout(timer);
                    // Read response body
                    const buf = Buffer.from(await res.body.arrayBuffer());
                    // Apply response interceptors
                    let response = await this.applyResponseInterceptors({
                        status: res.statusCode,
                        headers: res.headers,
                        body: buf,
                        url: finalConfig.url,
                    });
                    // Handle redirects
                    if (this.options.followRedirects &&
                        [301, 302, 303, 307, 308].includes(response.status)) {
                        if (redirects < (this.options.maxRedirects ?? 5)) {
                            const location = response.headers.location;
                            if (location) {
                                this.log("debug", `Redirecting to ${location}`, {
                                    originalUrl: finalConfig.url,
                                });
                                const redirectMethod = response.status === 303 ? "GET" : method;
                                return this.sendWithRetry(redirectMethod, location, headers, response.status === 303 ? undefined : body, redirects + 1);
                            }
                        }
                    }
                    // Check if we should retry based on status code
                    if (this.retryOptions.retryStatusCodes.includes(response.status)) {
                        this.log("warn", `Retrying ${method} ${finalConfig.url} due to status ${response.status}`, {
                            attempt: attempt + 1,
                            maxRetries: this.retryOptions.maxRetries,
                        });
                        if (attempt < this.retryOptions.maxRetries) {
                            await this.sleep(this.calcDelay(attempt));
                            continue;
                        }
                    }
                    return response;
                }
                catch (timeoutErr) {
                    clearTimeout(timer);
                    if (timeoutErr.name === "AbortError") {
                        throw new TimeoutError(url, timeout);
                    }
                    throw timeoutErr;
                }
            }
            catch (err) {
                lastError = err;
                this.log("error", `Request error ${method} ${url}: ${err.message}`, {
                    attempt: attempt + 1,
                    error: err,
                });
                if (attempt < this.retryOptions.maxRetries) {
                    await this.sleep(this.calcDelay(attempt));
                }
            }
        }
        if (lastError instanceof HttpClientError) {
            throw lastError;
        }
        throw new HttpClientError(`Request failed after ${this.retryOptions.maxRetries + 1} attempts`, undefined, lastError, url, method);
    }
    /**
     * Parses Content-Type header
     * @private
     */
    parseContentType(contentType) {
        if (!contentType)
            return { type: "text/plain", charset: "utf-8" };
        const parts = contentType.split(";");
        const type = parts[0].trim();
        const rawCharset = parts
            .find((p) => p.includes("charset"))
            ?.split("=")[1]
            ?.trim() || "utf-8";
        const charset = rawCharset;
        return { type, charset };
    }
    /**
     * Parses response body based on content type or responseType
     * @private
     */
    async parseResponse(res, responseType) {
        try {
            const { type, charset } = this.parseContentType(res.headers["content-type"]);
            const text = await this.decompress(res.body, res.headers["content-encoding"], charset);
            const finalType = responseType ?? "json";
            switch (finalType) {
                case "json":
                    if (type.includes("json"))
                        return JSON.parse(text);
                    try {
                        return JSON.parse(text);
                    }
                    catch {
                        return text;
                    }
                case "xml":
                    return new fast_xml_parser_1.XMLParser({ ignoreAttributes: false }).parse(text);
                case "text":
                    return text;
                case "buffer":
                    return res.body;
                default:
                    return text;
            }
        }
        catch (error) {
            this.log("error", "Failed to parse response", {
                error,
                status: res.status,
            });
            throw new HttpClientError(`Response parsing failed: ${error instanceof Error ? error.message : String(error)}`, res.status);
        }
    }
    /**
     * Internal request method with caching and deduplication
     * @private
     */
    async request(method, req, useCache = true, responseType) {
        const url = req.getURL();
        const rawBody = req.getBodyData();
        const headers = { ...this.defaultHeaders, ...req.getHeaders() };
        const contentType = headers["content-type"] || headers["Content-Type"] || "";
        const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        // Prepare request body
        let body;
        if (isBodyAllowed && rawBody) {
            if (contentType.includes("application/json")) {
                body = JSON.stringify(rawBody);
            }
            else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = querystring.stringify(rawBody);
            }
            else if (Buffer.isBuffer(rawBody)) {
                body = rawBody;
            }
            else {
                body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
            }
        }
        // Generate cache key
        const key = `${method}:${url}:${body ?? ""}`;
        // Check cache for GET requests
        if (method === "GET" && useCache) {
            const cached = this.cache.get(key);
            if (cached) {
                this.log("debug", `Cache hit for ${url}`);
                return cached;
            }
        }
        // Deduplicate in-flight requests
        if (this.inflight.has(key)) {
            this.log("debug", `Deduplicating request for ${url}`);
            return this.inflight.get(key);
        }
        // Create and track the request promise
        const promise = (async () => {
            const metrics = {
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
            try {
                this.log("debug", `Starting request: ${method} ${url}`);
                const result = await this.queue.enqueue(async () => {
                    const res = await this.sendWithRetry(method, url, headers, body);
                    metrics.statusCode = res.status;
                    metrics.bytesReceived = res.body.length;
                    metrics.bytesSent =
                        body instanceof Buffer
                            ? body.length
                            : Buffer.byteLength(body || "");
                    const parsed = await this.parseResponse(res, responseType);
                    // Cache GET requests
                    if (method === "GET" && useCache) {
                        this.cache.set(key, parsed);
                        metrics.cached = true;
                    }
                    return parsed;
                });
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                this.requestMetrics.set(key, metrics);
                this.log("info", `${method} ${url} completed in ${metrics.duration}ms`, metrics);
                return result;
            }
            catch (error) {
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                this.requestMetrics.set(key, metrics);
                throw error;
            }
            finally {
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
     */
    get(req, responseType) {
        return this.request("GET", req, true, responseType);
    }
    /**
     * Performs a POST request
     */
    post(req, responseType) {
        return this.request("POST", req, false, responseType);
    }
    /**
     * Performs a PUT request
     */
    put(req, responseType) {
        return this.request("PUT", req, false, responseType);
    }
    /**
     * Performs a DELETE request
     */
    delete(req, responseType) {
        return this.request("DELETE", req, false, responseType);
    }
    /**
     * Performs a PATCH request
     */
    patch(req, responseType) {
        return this.request("PATCH", req, false, responseType);
    }
    /**
     * Performs a HEAD request
     */
    head(req) {
        return this.request("HEAD", req, false).then(() => undefined);
    }
    /**
     * Clears all cached responses
     */
    clearCache() {
        this.cache.clear();
        this.log("info", "Cache cleared");
    }
    /**
     * Gets request metrics for a specific request
     */
    getMetrics(url, method) {
        const key = `${method}:${url}`;
        return this.requestMetrics.get(key);
    }
    /**
     * Gets statistics about the HTTP client state
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            inflightRequests: this.inflight.size,
            queuedRequests: this.queue.queuedCount,
            activeRequests: this.queue.activeCount,
            currentRateLimit: this.limiter.currentCount,
        };
    }
}
exports.default = HttpClientImproved;
//# sourceMappingURL=HttpClientImproved.js.map