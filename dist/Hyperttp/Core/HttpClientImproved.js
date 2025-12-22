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
    /**
     * Creates a new HttpClientError instance.
     * @param message The error message
     * @param statusCode Optional HTTP status code
     * @param originalError Optional original error that caused this error
     * @param url Optional request URL
     * @param method Optional HTTP method
     */
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
    /**
     * Creates a new TimeoutError instance.
     * @param url The request URL that timed out
     * @param timeout The timeout duration in milliseconds
     */
    constructor(url, timeout) {
        super(`Request timeout after ${timeout}ms for ${url}`);
        this.name = "TimeoutError";
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}
exports.TimeoutError = TimeoutError;
class RateLimitError extends HttpClientError {
    retryAfter;
    /**
     * Creates a new RateLimitError instance.
     * @param url The request URL that was rate limited
     * @param retryAfter Optional retry after duration in milliseconds
     */
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
     * Creates a new instance of HttpClientImproved.
     * @param options Optional configuration options for the HTTP client
     */
    constructor(options) {
        this.options = { followRedirects: true, maxRedirects: 5, ...options };
        this.cache = new CacheManager_1.CacheManager({
            cacheTTL: this.options.cacheTTL,
            cacheMaxSize: this.options.cacheMaxSize,
        });
        this.queue = new QueueManager_1.QueueManager(this.options.maxConcurrent ?? 50);
        this.limiter = new RateLimiter_1.RateLimiter(this.options.rateLimit);
        this.retryOptions = {
            maxRetries: this.options.maxRetries ?? 3,
            baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
            maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
            retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
                408, 429, 500, 502, 503, 504,
            ],
            jitter: this.options.retryOptions?.jitter ?? true,
        };
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
        };
        this.agent = new undici_1.Agent({
            connections: 100,
            pipelining: 10,
            interceptors: {
                Client: [(0, undici_2.cookie)({ jar: this.cookieJar })],
            },
        });
    }
    /**
     * Sets default headers that will be applied to all outgoing requests.
     * @param headers An object containing header names and values
     */
    setDefaultHeaders(headers) {
        Object.assign(this.defaultHeaders, headers);
    }
    /**
     * Returns the cookie jar used for managing HTTP cookies.
     * @returns The CookieJar instance
     */
    getCookieJar() {
        return this.cookieJar;
    }
    /**
     * Adds a request interceptor to modify requests before they are sent.
     * @param interceptor The interceptor function to add
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    /**
     * Adds a response interceptor to modify responses after they are received.
     * @param interceptor The interceptor function to add
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    /** Closes the HTTP agent to properly terminate keep-alive connections. */
    close() {
        this.agent.close();
    }
    log(level, msg, meta) {
        if (this.options.logger)
            this.options.logger(level, msg, meta);
    }
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
    calcDelay(attempt) {
        const base = Math.min(this.retryOptions.baseDelay * 2 ** attempt, this.retryOptions.maxDelay);
        return this.retryOptions.jitter
            ? base * (0.75 + Math.random() * 0.5)
            : base;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async applyRequestInterceptors(config) {
        let result = config;
        for (const interceptor of this.requestInterceptors)
            result = await interceptor(result);
        return result;
    }
    async applyResponseInterceptors(response) {
        let result = response;
        for (const interceptor of this.responseInterceptors)
            result = await interceptor(result);
        return result;
    }
    resolveRedirect(location, baseUrl) {
        try {
            return new URL(location, baseUrl).toString();
        }
        catch {
            return location;
        }
    }
    parseRetryAfterMs(retryAfterHeader) {
        if (!retryAfterHeader)
            return undefined;
        const raw = Array.isArray(retryAfterHeader)
            ? retryAfterHeader[0]
            : String(retryAfterHeader);
        const asSeconds = Number(raw);
        if (Number.isFinite(asSeconds))
            return Math.max(0, Math.floor(asSeconds * 1000));
        const asDate = Date.parse(raw);
        if (!Number.isNaN(asDate))
            return Math.max(0, asDate - Date.now());
        return undefined;
    }
    async readBodyWithLimit(body) {
        const buf = Buffer.from(await body.arrayBuffer());
        const limit = this.options.maxResponseBytes;
        if (typeof limit === "number" && limit > 0 && buf.length > limit) {
            throw new HttpClientError(`Response too large (${buf.length} bytes), limit is ${limit}`, 0);
        }
        return buf;
    }
    async sendWithRetry(method, url, headers, body, metrics, redirects = 0) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                await this.limiter.wait();
                const finalConfig = await this.applyRequestInterceptors({
                    url,
                    method,
                    headers,
                    body,
                });
                const controller = new AbortController();
                const timeout = this.options.timeout ?? 15000;
                const timer = setTimeout(() => controller.abort(), timeout);
                try {
                    const res = await (0, undici_1.request)(finalConfig.url, {
                        method: finalConfig.method,
                        headers: finalConfig.headers,
                        body: finalConfig.body,
                        dispatcher: this.agent,
                        signal: controller.signal,
                    });
                    clearTimeout(timer);
                    const buf = await this.readBodyWithLimit(res.body);
                    let response = await this.applyResponseInterceptors({
                        status: res.statusCode,
                        headers: res.headers,
                        body: buf,
                        url: finalConfig.url,
                    });
                    // Redirects
                    if (this.options.followRedirects &&
                        [301, 302, 303, 307, 308].includes(response.status) &&
                        redirects < (this.options.maxRedirects ?? 5)) {
                        const location = response.headers.location;
                        if (location) {
                            const nextUrl = this.resolveRedirect(location, finalConfig.url);
                            const redirectMethod = response.status === 303 ? "GET" : method;
                            const nextHeaders = { ...headers };
                            let nextBody = body;
                            // If switching to GET, drop body-related headers.
                            if (redirectMethod === "GET") {
                                nextBody = undefined;
                                delete nextHeaders["content-type"];
                                delete nextHeaders["Content-Type"];
                                delete nextHeaders["content-length"];
                                delete nextHeaders["Content-Length"];
                            }
                            this.log("debug", `Redirecting to ${nextUrl}`, {
                                originalUrl: finalConfig.url,
                                status: response.status,
                            });
                            return this.sendWithRetry(redirectMethod, nextUrl, nextHeaders, nextBody, metrics, redirects + 1);
                        }
                    }
                    // Retry by status
                    if (this.retryOptions.retryStatusCodes.includes(response.status)) {
                        metrics && (metrics.retries += 1);
                        if (response.status === 429) {
                            const ra = this.parseRetryAfterMs(response.headers["retry-after"]);
                            if (ra !== undefined) {
                                this.log("warn", `429 Rate limited, waiting Retry-After ${ra}ms`, { url: finalConfig.url });
                                if (attempt < this.retryOptions.maxRetries) {
                                    await this.sleep(ra);
                                    continue;
                                }
                                throw new RateLimitError(finalConfig.url, ra);
                            }
                        }
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
                    if (timeoutErr?.name === "AbortError")
                        throw new TimeoutError(url, timeout);
                    throw timeoutErr;
                }
            }
            catch (err) {
                lastError = err;
                this.log("error", `Request error ${method} ${url}: ${err?.message ?? String(err)}`, {
                    attempt: attempt + 1,
                    error: err,
                });
                metrics && (metrics.retries += 1);
                if (attempt < this.retryOptions.maxRetries) {
                    await this.sleep(this.calcDelay(attempt));
                    continue;
                }
            }
        }
        if (lastError instanceof HttpClientError)
            throw lastError;
        throw new HttpClientError(`Request failed after ${this.retryOptions.maxRetries + 1} attempts`, undefined, lastError instanceof Error ? lastError : undefined, url, method);
    }
    parseContentType(contentType) {
        if (!contentType)
            return { type: "text/plain", charset: "utf-8" };
        const parts = contentType.split(";");
        const type = parts[0].trim();
        const rawCharset = parts
            .map((p) => p.trim())
            .find((p) => p.toLowerCase().startsWith("charset="))
            ?.split("=")[1]
            ?.trim() || "utf-8";
        const normalized = rawCharset.toLowerCase();
        const allowed = [
            "utf8",
            "utf-8",
            "latin1",
            "ucs2",
            "ucs-2",
            "utf16le",
            "utf-16le",
            "ascii",
            "base64",
            "hex",
        ];
        const charset = (allowed.includes(normalized)
            ? normalized
            : "utf-8");
        return { type, charset };
    }
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
    async requestInternal(method, req, useCache = true, responseType) {
        const url = req.getURL();
        const rawBody = req.getBodyData();
        const headers = {
            ...this.defaultHeaders,
            ...req.getHeaders(),
        };
        const isBodyAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        // Prepare request body + auto content-type for JSON
        let body;
        const contentType = headers["content-type"] || headers["Content-Type"] || "";
        if (isBodyAllowed && rawBody !== undefined && rawBody !== null) {
            if (Buffer.isBuffer(rawBody)) {
                body = rawBody;
            }
            else if (typeof rawBody === "string") {
                body = rawBody;
            }
            else if (contentType.includes("application/x-www-form-urlencoded")) {
                body = querystring.stringify(rawBody);
            }
            else {
                // default JSON
                body = JSON.stringify(rawBody);
                if (!contentType)
                    headers["Content-Type"] = "application/json; charset=utf-8";
            }
        }
        const key = `${method}:${url}:${body ?? ""}`;
        if (method === "GET" && useCache) {
            const cached = this.cache.get(key);
            if (cached) {
                this.log("debug", `Cache hit for ${url}`);
                return cached;
            }
        }
        if (this.inflight.has(key)) {
            this.log("debug", `Deduplicating request for ${url}`);
            return this.inflight.get(key);
        }
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
                    const res = await this.sendWithRetry(method, url, headers, body, metrics);
                    metrics.statusCode = res.status;
                    metrics.bytesReceived = res.body.length;
                    metrics.bytesSent =
                        body instanceof Buffer
                            ? body.length
                            : Buffer.byteLength(body || "");
                    const parsed = await this.parseResponse(res, responseType);
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
                // ВАЖНО: только delete, без повторного set.
                this.inflight.delete(key);
            }
        })();
        this.inflight.set(key, promise);
        return promise;
    }
    /**
     * Performs an HTTP GET request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    get(req, responseType) {
        return this.requestInternal("GET", req, true, responseType);
    }
    /**
     * Performs an HTTP POST request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    post(req, responseType) {
        return this.requestInternal("POST", req, false, responseType);
    }
    /**
     * Performs an HTTP PUT request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    put(req, responseType) {
        return this.requestInternal("PUT", req, false, responseType);
    }
    /**
     * Performs an HTTP DELETE request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    delete(req, responseType) {
        return this.requestInternal("DELETE", req, false, responseType);
    }
    /**
     * Performs an HTTP PATCH request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    patch(req, responseType) {
        return this.requestInternal("PATCH", req, false, responseType);
    }
    /**
     * Performs an HTTP HEAD request.
     * @param req The request object containing URL and headers
     * @returns A promise that resolves when the request completes
     */
    head(req) {
        return this.requestInternal("HEAD", req, false).then(() => undefined);
    }
    /**
     * Clears the request cache.
     */
    clearCache() {
        this.cache.clear();
        this.log("info", "Cache cleared");
    }
    /**
     * Retrieves performance metrics for a specific request.
     * @param url The request URL
     * @param method The HTTP method
     * @returns The request metrics if available, undefined otherwise
     */
    getMetrics(url, method) {
        const keyPrefix = `${method}:${url}`;
        for (const [k, v] of this.requestMetrics.entries()) {
            if (k.startsWith(keyPrefix))
                return v;
        }
        return undefined;
    }
    /**
     * Returns current statistics about the HTTP client's state.
     * @returns An object containing cache size, request counts, and rate limit information
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