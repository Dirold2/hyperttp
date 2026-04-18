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
const tough_cookie_1 = require("tough-cookie");
const undici_1 = require("undici");
const undici_2 = require("http-cookie-agent/undici");
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const fast_xml_parser_1 = require("fast-xml-parser");
const CacheManager_1 = require("./CacheManager");
const QueueManager_1 = require("./QueueManager");
const RateLimiter_1 = require("./RateLimiter");
const Types_1 = require("../../Types");
const RequestBuilder_1 = require("./RequestBuilder");
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const inflate = (0, util_1.promisify)(zlib.inflate);
const brotliDecompress = (0, util_1.promisify)(zlib.brotliDecompress);
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
        this.options = {
            timeout: options?.timeout ?? 15000,
            maxConcurrent: options?.maxConcurrent ?? 50,
            maxRetries: options?.maxRetries ?? 3,
            cacheTTL: options?.cacheTTL ?? 300000,
            cacheMaxSize: options?.cacheMaxSize ?? 500,
            followRedirects: options?.followRedirects ?? true,
            maxRedirects: options?.maxRedirects ?? 5,
            validateStatus: options?.validateStatus ??
                ((status) => status >= 200 && status < 300),
            cacheMethods: options?.cacheMethods ?? ["GET", "HEAD"],
            maxMetricsSize: options?.maxMetricsSize ?? 1000,
            rateLimit: options?.rateLimit ?? { maxRequests: 100, windowMs: 60000 },
            userAgent: options?.userAgent ?? "Hyperttp/0.1.0 Node.js",
            logger: options?.logger ??
                ((level, message, meta) => {
                    const methods = {
                        debug: console.debug,
                        info: console.info,
                        warn: console.warn,
                        error: console.error,
                    };
                    (methods[level] || console.log)(`[${level.toUpperCase()}] ${message}`, meta || "");
                }),
            retryOptions: options?.retryOptions ?? {},
            maxResponseBytes: options?.maxResponseBytes ?? 1024 * 1024,
            verbose: false,
            enableQueue: options?.enableQueue ?? false,
            enableRateLimit: options?.enableRateLimit ?? false,
            enableCache: options?.enableCache ?? true,
        };
        if (this.options.enableCache) {
            this.cache = new CacheManager_1.CacheManager({
                cacheTTL: this.options.cacheTTL,
                cacheMaxSize: this.options.cacheMaxSize,
            });
        }
        if (this.options.enableQueue) {
            this.queue = new QueueManager_1.QueueManager(this.options.maxConcurrent ?? 500);
        }
        if (this.options.enableRateLimit) {
            this.limiter = new RateLimiter_1.RateLimiter(this.options.rateLimit);
        }
        this.retryOptions = {
            maxRetries: this.options.maxRetries ?? 5,
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
            connections: 1000,
            pipelining: 10,
            keepAliveTimeout: 60000,
            keepAliveMaxTimeout: 600000,
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
        if (this.options.verbose) {
            if (this.options.logger)
                this.options.logger(level, msg, meta);
        }
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
            throw new Types_1.HttpClientError(`Response too large (${buf.length} bytes), limit is ${limit}`, 0);
        }
        return buf;
    }
    async sendWithRetry(method, url, headers, body, metrics, redirects = 0) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                if (this.limiter && this.options.enableRateLimit) {
                    await this.limiter.wait();
                }
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
                                throw new Types_1.RateLimitError(finalConfig.url, ra);
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
                        throw new Types_1.TimeoutError(url, timeout);
                    throw timeoutErr;
                }
                finally {
                    clearTimeout(timer);
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
        if (lastError instanceof Types_1.HttpClientError)
            throw lastError;
        throw new Types_1.HttpClientError(`Request failed after ${this.retryOptions.maxRetries + 1} attempts`, undefined, lastError instanceof Error ? lastError : undefined, url, method);
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
    xmlParser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
    });
    async parseResponse(res, responseType) {
        try {
            const contentType = res.headers["content-type"] || "";
            const text = await this.decompress(res.body, res.headers["content-encoding"]);
            const finalType = responseType ?? "json";
            switch (finalType) {
                case "json": {
                    if (contentType.includes("json")) {
                        return JSON.parse(text);
                    }
                    if (text.trim().startsWith("<")) {
                        return this.xmlParser.parse(text);
                    }
                    return { text };
                }
                case "xml": {
                    const text = await this.decompress(res.body, res.headers["content-encoding"]);
                    if (text.trim().startsWith("<")) {
                        return text;
                    }
                    try {
                        const json = JSON.parse(text);
                        return new fast_xml_parser_1.XMLBuilder({ format: true }).build({ root: json });
                    }
                    catch {
                        return String(text);
                    }
                }
                case "text":
                    return text;
                case "buffer":
                    return res.body;
                case "stream":
                    return res.body;
                default:
                    return text;
            }
        }
        catch (error) {
            this.log("error", "Failed to parse response", {
                error,
                status: res.status,
                contentType: res.headers["content-type"],
            });
            throw new Types_1.HttpClientError(`Response parsing failed: ${error instanceof Error ? error.message : String(error)}`, res.status);
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
                body = new URLSearchParams(rawBody).toString();
            }
            else {
                body = JSON.stringify(rawBody);
                if (!contentType) {
                    headers["Content-Type"] = "application/json; charset=utf-8";
                }
            }
        }
        const key = `${method}:${url}:${body ?? ""}`;
        if (method === "GET" && useCache && this.cache) {
            const cached = await this.cache.get(key);
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
                let result;
                const res = await this.sendWithRetry(method, url, headers, body, metrics);
                metrics.statusCode = res.status;
                metrics.bytesReceived = res.body.length;
                metrics.bytesSent =
                    body instanceof Buffer ? body.length : Buffer.byteLength(body || "");
                if (method === "HEAD") {
                    metrics.endTime = Date.now();
                    metrics.duration = metrics.endTime - metrics.startTime;
                    this.requestMetrics.set(key, metrics);
                    this.log("info", `${method} ${url} completed in ${metrics.duration}ms`, metrics);
                    return {
                        status: res.status,
                        headers: res.headers,
                    };
                }
                const parsed = await this.parseResponse(res, responseType);
                if (method === "GET" && useCache && this.cache) {
                    this.cache.set(key, parsed);
                    metrics.cached = true;
                }
                result = parsed;
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
    get(req, responseType = "json") {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
            };
            return this.requestInternal("GET", simpleReq, true, responseType);
        }
        else {
            return this.requestInternal("GET", req, true, responseType);
        }
    }
    /**
     * Performs an HTTP POST request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    post(req, body, responseType = "json") {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => body,
                getHeaders: () => ({ "Content-Type": "application/json" }),
            };
            return this.requestInternal("POST", simpleReq, false, responseType);
        }
        else {
            return this.requestInternal("POST", req, false, responseType);
        }
    }
    /**
     * Performs an HTTP PUT request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    put(req, body, responseType = "json") {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => body,
                getHeaders: () => ({ "Content-Type": "application/json" }),
            };
            return this.requestInternal("PUT", simpleReq, false, responseType);
        }
        return this.requestInternal("PUT", req, false, responseType);
    }
    /**
     * Performs an HTTP DELETE request.
     * @param req The request object containing URL and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    delete(req, responseType = "json") {
        if (typeof req === "string") {
            const client = new HttpClientImproved();
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
            };
            return client.delete(simpleReq, responseType);
        }
        return this.requestInternal("DELETE", req, false, responseType);
    }
    /**
     * Performs an HTTP PATCH request.
     * @param req The request object containing URL, body, and headers
     * @param responseType Optional response parsing type
     * @returns A promise that resolves to the parsed response
     * @template T The expected response type
     */
    patch(req, body, responseType = "json") {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => body,
                getHeaders: () => ({ "Content-Type": "application/json" }),
            };
            return this.requestInternal("PATCH", simpleReq, false, responseType);
        }
        return this.requestInternal("PATCH", req, false, responseType);
    }
    /**
     * @ru Получает потоковый ответ (для SSE, больших файлов).
     * @en Gets streaming response (for SSE, large files).
     */
    stream(req) {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
            };
            return this.stream(simpleReq);
        }
        return (this.queue && this.options.enableQueue
            ? this.queue.enqueue(async function () {
                const url = req.getURL();
                const headers = {
                    ...this.defaultHeaders,
                    ...req.getHeaders(),
                };
                const response = await (0, undici_1.request)(url, {
                    method: "GET",
                    headers,
                    dispatcher: this.agent,
                });
                return {
                    status: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                    url,
                };
            }.bind(this))
            : async function () {
                const url = req.getURL();
                const headers = Object.assign({}, this.defaultHeaders, req.getHeaders());
                const response = await (0, undici_1.request)(url, {
                    method: "GET",
                    headers,
                    dispatcher: this.agent,
                });
                return {
                    status: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                    url,
                };
            }.bind(this)());
    }
    /**
     * Performs an HTTP HEAD request.
     * @param req The request object containing URL and headers
     * @returns A promise that resolves when the request completes
     */
    async head(req) {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
            };
            return this.requestInternal("HEAD", simpleReq, false);
        }
        return this.requestInternal("HEAD", req, false);
    }
    /**
     * Clears the request cache.
     */
    async clearCache() {
        if (this.cache) {
            await this.cache.clear();
            this.log("info", "Cache cleared");
        }
    }
    /**
     * Clears all collected request metrics.
     * Removes performance and timing data from memory.
     */
    clearMetrics() {
        this.requestMetrics.clear();
        this.log("info", "Metrics cleared");
    }
    /**
     * Retrieves metrics for a specific request by its URL.
     * @param key - The URL or cache key to retrieve metrics for
     * @returns Metrics object if found, undefined otherwise
     */
    getMetrics(key) {
        return this.requestMetrics.get(key);
    }
    /**
     * Retrieves all collected request metrics.
     * @returns Array of all metrics objects
     */
    getAllMetrics() {
        return Array.from(this.requestMetrics.values());
    }
    /**
     * Creates a fluent request builder for making HTTP requests.
     * Provides a chainable API for building and sending requests.
     * @param url - The target URL for the request
     * @returns RequestBuilder instance for chaining
     */
    request(url) {
        return new RequestBuilder_1.RequestBuilder(url);
    }
    /**
     * Returns current statistics about the HTTP client's state.
     * @returns An object containing cache size, request counts, and rate limit information
     */
    getStats() {
        return {
            cacheSize: this.cache?.size ?? 0,
            inflightRequests: this.inflight.size,
            queuedRequests: this.queue && this.options.enableQueue
                ? (this.queue.queuedCount ?? 0)
                : 0,
            activeRequests: this.queue && this.options.enableQueue
                ? (this.queue.activeCount ?? 0)
                : 0,
            currentRateLimit: this.limiter && this.options.enableRateLimit
                ? (this.limiter.currentCount ?? 0)
                : 0,
        };
    }
}
exports.default = HttpClientImproved;
//# sourceMappingURL=HttpClientImproved.js.map