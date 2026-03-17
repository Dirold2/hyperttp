"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tough_cookie_1 = require("tough-cookie");
const undici_1 = require("undici");
const undici_2 = require("http-cookie-agent/undici");
const fast_xml_parser_1 = require("fast-xml-parser");
const url_1 = require("url");
const crypto_1 = require("crypto");
const CacheManager_1 = require("./CacheManager");
const QueueManager_1 = require("./QueueManager");
const RateLimiter_1 = require("./RateLimiter");
const Types_1 = require("../../Types");
let defaultClient = null;
/**
 * @ru
 * Улучшенный HTTP-клиент с кэшированием, ограничением скорости, логикой повторных попыток и расширенными функциями.
 * Предоставляет надежный интерфейс для выполнения HTTP-запросов с автоматической обработкой
 * распространенных паттернов, таких как повторные попытки, кэширование и перехват запросов/ответов.
 * @en
 * Enhanced HTTP client with caching, rate limiting, retry logic, and advanced features.
 * Provides a robust interface for making HTTP requests with automatic handling of
 * common patterns like retries, caching, and request/response interception.
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxRetries: 3,
 *   cacheTTL: 300000,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 }
 * });
 *
 * const response = await client.get('https://api.example.com/data');
 * ```
 *
 * @example
 * ```ts
 * // Using the fluent request builder
 * const client = new HttpClientImproved();
 * const response = await client.request('https://api.example.com/data')
 *   .headers({ 'Authorization': 'Bearer token' })
 *   .json()
 *   .send();
 * ```
 *
 * @example
 * ```ts
 * // Using RequestInterface for complex requests
 * import { RequestInterface } from './src';
 *
 * class ApiRequest implements RequestInterface {
 *   constructor(
 *     private url: string,
 *     private headers: Record<string, string> = {},
 *     private body?: any
 *   ) {}
 *
 *   getURL(): string { return this.url; }
 *   getHeaders(): Record<string, string> { return this.headers; }
 *   getBodyData(): any { return this.body; }
 * }
 *
 * const client = new HttpClientImproved();
 * const request = new ApiRequest('https://api.example.com/data');
 * const response = await client.get(request);
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
            enableQueue: options?.enableQueue ?? true,
            enableRateLimit: options?.enableRateLimit ?? true,
            enableCache: options?.enableCache ?? true,
        };
        // Lazy initialization - only create components when needed
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
            maxRetries: this.options.maxRetries,
            baseDelay: this.options.retryOptions?.baseDelay ?? 1000,
            maxDelay: this.options.retryOptions?.maxDelay ?? 30000,
            retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [
                408, 429, 500, 502, 503, 504,
            ],
            jitter: this.options.retryOptions?.jitter ?? true,
        };
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
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
    log(level, msg, meta) {
        if (!this.options.logger)
            return;
        const minLevel = process.env.NODE_ENV === "production" ? "warn" : "info";
        const levels = ["debug", "info", "warn", "error"];
        const currentLevelIndex = levels.indexOf(level);
        const minLevelIndex = levels.indexOf(minLevel);
        if (currentLevelIndex < minLevelIndex)
            return;
        if (this.options.verbose || level !== "info") {
            this.options.logger(level, msg, meta);
        }
    }
    /**
     * Creates a hash of the request body for cache key generation.
     * @param body - Request body (string or Buffer)
     * @returns SHA1 hash of the body, truncated to 8 characters
     */
    hashBody(body) {
        if (!body)
            return "";
        if (typeof body === "string")
            body = Buffer.from(body, "utf-8");
        return (0, crypto_1.createHash)("sha1").update(body).digest("hex").slice(0, 8);
    }
    /**
     * Calculates the delay for retry attempts using exponential backoff.
     * @param attempt - Current retry attempt number (0-based)
     * @returns Delay in milliseconds
     */
    calcDelay(attempt) {
        const base = Math.min(this.retryOptions.baseDelay * 2 ** attempt, this.retryOptions.maxDelay);
        return this.retryOptions.jitter
            ? base * (0.75 + Math.random() * 0.5)
            : base;
    }
    /**
     * Creates a promise that resolves after the specified delay.
     * @param ms - Delay in milliseconds
     * @returns Promise that resolves after the delay
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Applies all registered request interceptors to modify the request configuration.
     * Interceptors are executed in sequence, with each one receiving the output of the previous.
     * @param config - Original request configuration
     * @returns Modified request configuration
     */
    async applyRequestInterceptors(config) {
        if (!this.requestInterceptors.length)
            return config;
        let result = config;
        for (const interceptor of this.requestInterceptors) {
            try {
                result = await interceptor(result);
            }
            catch (error) {
                this.log("error", "Request interceptor failed", { error });
                throw error;
            }
        }
        return result;
    }
    /**
     * Applies all registered response interceptors to modify the response data.
     * Interceptors are executed in sequence, with each one receiving the output of the previous.
     * @param response - Original response data
     * @returns Modified response data
     */
    async applyResponseInterceptors(response) {
        let result = response;
        for (const interceptor of this.responseInterceptors) {
            try {
                result = await interceptor(result);
            }
            catch (error) {
                this.log("error", "Response interceptor failed", { error });
                throw error;
            }
        }
        return result;
    }
    /**
     * Resolves a redirect location relative to the base URL.
     * Handles both absolute and relative redirect URLs.
     * @param location - The redirect location from the response
     * @param baseUrl - The original request URL
     * @returns The resolved absolute URL
     */
    resolveRedirect(location, baseUrl) {
        try {
            return new URL(location, baseUrl).toString();
        }
        catch {
            return location;
        }
    }
    /**
     * Parses the Retry-After header to determine when to retry a request.
     * Supports both seconds and HTTP date formats.
     * @param retryAfterHeader - The Retry-After header value
     * @returns Delay in milliseconds, or undefined if not parseable
     */
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
    /**
     * Reads response body with size limit enforcement.
     * Collects chunks until the response is complete or the limit is exceeded.
     * @param body - Async iterable of response chunks
     * @returns Complete response body as a Buffer
     */
    async readBodyWithLimit(body, maxBytes = this.options.maxResponseBytes) {
        if (!body)
            return Buffer.alloc(0);
        if (body[Symbol.asyncIterator]) {
            const chunks = [];
            let total = 0;
            for await (const chunk of body) {
                chunks.push(Buffer.from(chunk));
                total += chunk.length;
                if (total > maxBytes)
                    break;
            }
            return Buffer.concat(chunks);
        }
        if (body?.arrayBuffer) {
            const arrayBuffer = await body.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        if (Buffer.isBuffer(body))
            return body.subarray(0, maxBytes);
        if (typeof body === "string")
            return Buffer.from(body);
        throw new TypeError(`Unsupported body type: ${typeof body}`);
    }
    /**
     * Removes old metrics entries to prevent memory leaks.
     * Keeps only metrics from the last 24 hours.
     */
    trimMetrics() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [key, metrics] of this.requestMetrics) {
            if (metrics.endTime && metrics.endTime < cutoff) {
                this.requestMetrics.delete(key);
            }
        }
        for (const key of this.inflight.keys()) {
            if (this.inflight.size > 1000) {
                this.inflight.delete(key);
            }
        }
    }
    /**
     * Sends an HTTP request with retry logic and rate limiting.
     * Handles timeouts, redirects, and various retry scenarios.
     * @param method - HTTP method (GET, POST, etc.)
     * @param url - Target URL
     * @param headers - HTTP headers
     * @param body - Request body (optional)
     * @param metrics - Optional metrics object to track request details
     * @param redirects - Number of redirects followed so far
     * @returns Promise resolving to the response data
     */
    async sendWithRetry(method, url, headers, body, metrics, redirects = 0) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                if (this.limiter) {
                    await this.limiter.wait();
                }
                const finalConfig = await this.applyRequestInterceptors({
                    url,
                    method,
                    headers,
                    body,
                });
                const controller = new AbortController();
                const timeout = this.options.timeout;
                const timer = setTimeout(() => controller.abort(), timeout);
                try {
                    const res = await (0, undici_1.request)(finalConfig.url, {
                        method: finalConfig.method,
                        headers: finalConfig.headers,
                        body: finalConfig.body,
                        dispatcher: this.agent,
                        signal: controller.signal,
                    });
                    if (method === "HEAD") {
                        clearTimeout(timer);
                        return {
                            status: res.statusCode,
                            headers: res.headers,
                            body: Buffer.alloc(0),
                            url: finalConfig.url,
                        };
                    }
                    clearTimeout(timer);
                    const buf = await this.readBodyWithLimit(res.body);
                    let response = await this.applyResponseInterceptors({
                        status: res.statusCode,
                        headers: res.headers,
                        body: buf,
                        url: finalConfig.url,
                    });
                    if (!this.options.validateStatus(response.status)) {
                        throw new Types_1.HttpClientError(`Request failed with status ${response.status}`, response.status, undefined, finalConfig.url, finalConfig.method);
                    }
                    if (this.options.followRedirects &&
                        [301, 302, 303, 307, 308].includes(response.status) &&
                        redirects < (this.options.maxRedirects ?? 5)) {
                        const location = response.headers.location;
                        if (location) {
                            const nextUrl = this.resolveRedirect(location, finalConfig.url);
                            const redirectMethod = response.status === 303 ? "GET" : method;
                            const nextHeaders = { ...headers };
                            let nextBody = body;
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
    /**
     * Parses the Content-Type header to extract MIME type and character encoding.
     * @param contentType - Content-Type header value
     * @returns Object containing type and charset information
     */
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
        return {
            type,
            charset: allowed.includes(normalized)
                ? normalized
                : "utf-8",
        };
    }
    /**
     * Parses the HTTP response body based on content type and requested response type.
     * Handles JSON, XML, text, and buffer responses with fallback parsing.
     * @param res - HTTP response object
     * @param responseType - Desired response type
     * @returns Parsed response data
     */
    async parseResponse(res, responseType) {
        const { type, charset } = this.parseContentType(res.headers["content-type"]);
        const text = res.body.toString(charset);
        const finalType = responseType ?? (type.includes("application/json") ? "json" : "text");
        try {
            switch (finalType) {
                case "json":
                    return JSON.parse(res.body.toString("utf8"));
                case "xml": {
                    try {
                        const jsonData = JSON.parse(text);
                        return new fast_xml_parser_1.XMLBuilder({ format: true }).build({ root: jsonData });
                    }
                    catch {
                        return text;
                    }
                }
                case "text":
                    return text;
                case "buffer":
                    return res.body;
                case "stream":
                    throw new Error("Stream mode requires raw response. Use stream() method.");
                default:
                    return text;
            }
        }
        catch (err) {
            throw new Types_1.HttpClientError(`Parsing failed: ${err?.message ?? String(err)}`, res.status);
        }
    }
    /**
     * Makes an HTTP request without using the cache.
     * Used for methods that shouldn't be cached or when caching is disabled.
     * @param method - HTTP method
     * @param req - Request configuration
     * @param responseType - Expected response type
     * @returns Promise resolving to the response data
     */
    async requestInternalWithoutCache(method, req, responseType) {
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
                body = new url_1.URLSearchParams(rawBody).toString();
            }
            else {
                body = JSON.stringify(rawBody);
                if (!contentType)
                    headers["Content-Type"] = "application/json; charset=utf-8";
            }
        }
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
        const result = await (this.queue.enqueue(async () => {
            const res = await this.sendWithRetry(method, url, headers, body, metrics);
            metrics.statusCode = res.status;
            metrics.bytesReceived = res.body.length;
            metrics.bytesSent =
                body instanceof Buffer ? body.length : Buffer.byteLength(body || "");
            if (method === "HEAD") {
                return { status: res.status, headers: res.headers };
            }
            const parsed = await this.parseResponse(res, responseType);
            return parsed;
        }) ?? Promise.resolve(undefined));
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        this.requestMetrics.set(url, metrics);
        this.trimMetrics();
        return result;
    }
    /**
     * Makes an HTTP request with caching support.
     * Handles cache lookups, request deduplication, and automatic cache storage.
     * @param method - HTTP method
     * @param req - Request configuration
     * @param useCache - Whether to use caching (default: true)
     * @param responseType - Expected response type
     * @returns Promise resolving to the response data
     */
    async requestInternal(method, req, useCache = true, responseType) {
        if (this.options.cacheTTL === 0) {
            return this.requestInternalWithoutCache(method, req, responseType);
        }
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
                body = new url_1.URLSearchParams(rawBody).toString();
            }
            else {
                body = JSON.stringify(rawBody);
                if (!contentType)
                    headers["Content-Type"] = "application/json; charset=utf-8";
            }
        }
        const bodyHash = this.hashBody(body);
        const cacheKey = (0, crypto_1.createHash)("sha1")
            .update(method + url + bodyHash + responseType)
            .digest("hex");
        if (this.options.cacheMethods.includes(method) && useCache && this.cache) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.log("debug", `Cache hit for ${url}`);
                return cached;
            }
        }
        if (this.inflight.has(cacheKey)) {
            this.log("debug", `Deduplicating request for ${url}`);
            return this.inflight.get(cacheKey);
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
                bodyHash,
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
                    if (method === "HEAD") {
                        return { status: res.status, headers: res.headers };
                    }
                    const parsed = await this.parseResponse(res, responseType);
                    if (this.options.cacheMethods.includes(method) &&
                        useCache &&
                        this.cache) {
                        this.cache.set(cacheKey, parsed);
                        metrics.cached = true;
                    }
                    return parsed;
                });
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                this.requestMetrics.set(cacheKey, metrics);
                this.trimMetrics();
                this.log("info", `${method} ${url} completed in ${metrics.duration}ms`, metrics);
                return result;
            }
            catch (error) {
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                this.requestMetrics.set(cacheKey, metrics);
                this.trimMetrics();
                throw error;
            }
            finally {
                this.inflight.delete(cacheKey);
            }
        })();
        this.inflight.set(cacheKey, promise);
        return promise;
    }
    /**
     * Makes an HTTP GET request.
     * Supports both RequestInterface objects and direct URL strings.
     * GET requests are cached by default unless caching is disabled.
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
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
     * Makes an HTTP POST request.
     * Supports both RequestInterface objects and direct URL strings with body data.
     * POST requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param body - Request body data (optional)
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
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
     * Makes an HTTP PUT request.
     * Supports both RequestInterface objects and direct URL strings with body data.
     * PUT requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param body - Request body data (optional)
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
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
        return this.queue.enqueue(async function () {
            const url = req.getURL();
            const headers = { ...this.defaultHeaders, ...req.getHeaders() };
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
        }.bind(this));
    }
    /**
     * Makes an HTTP DELETE request.
     * Supports both RequestInterface objects and direct URL strings.
     * DELETE requests are not cached by default due to their side effects.
     * @param req - Request configuration or URL string
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    delete(req, responseType = "json") {
        if (typeof req === "string") {
            const client = defaultClient ?? (defaultClient = new HttpClientImproved());
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
     * Makes an HTTP PATCH request.
     * PATCH requests are not cached by default due to their side effects.
     * @param req - Request configuration
     * @param responseType - Expected response type (default: "json")
     * @returns Promise resolving to the response data
     */
    patch(req, responseType = "json") {
        return this.requestInternal("PATCH", req, false, responseType);
    }
    /**
     * Makes an HTTP HEAD request.
     * Returns only the status code and headers without the response body.
     * HEAD requests are not cached by default.
     * @param req - Request configuration or URL string
     * @returns Promise resolving to status and headers
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
     * Clears the internal cache of the HTTP client.
     * Removes all cached responses and resets the cache state.
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
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
        return new RequestBuilder(url);
    }
    /**
     * Returns current statistics about the HTTP client's state.
     * Useful for monitoring and debugging performance.
     * @returns Object containing various client statistics
     */
    getStats() {
        return {
            cacheSize: this.cache?.size ?? 0,
            inflightRequests: this.inflight.size,
            queuedRequests: this.queue.queuedCount ?? 0,
            activeRequests: this.queue.activeCount ?? 0,
            currentRateLimit: this.limiter?.currentCount ?? 0,
            metricsSize: this.requestMetrics.size,
        };
    }
}
exports.default = HttpClientImproved;
/**
 * Fluent request builder for making HTTP requests with a chainable API.
 * Provides a convenient way to build and send HTTP requests with various options.
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved();
 * const response = await client.request('https://api.example.com/data')
 *   .headers({ 'Authorization': 'Bearer token' })
 *   .query({ limit: 10, offset: 0 })
 *   .json()
 *   .send();
 * ```
 */
class RequestBuilder {
    _url;
    _method = "GET";
    _headers = {};
    _body;
    _responseType = "json";
    /**
     * Creates a new request builder for the specified URL.
     * @param url - The target URL for the request
     */
    constructor(url) {
        this._url = url;
    }
    /**
     * Sets HTTP headers for the request.
     * @param headers - Object containing header key-value pairs
     * @returns The builder instance for chaining
     */
    headers(headers) {
        this._headers = headers;
        return this;
    }
    /**
     * Sets the request body data.
     * @param bodyData - The body data to send with the request
     * @returns The builder instance for chaining
     */
    body(bodyData) {
        this._body = bodyData;
        return this;
    }
    /**
     * Sets the response type to JSON.
     * @returns The builder instance for chaining
     */
    json() {
        this._responseType = "json";
        return this;
    }
    /**
     * Sets the response type to plain text.
     * @returns The builder instance for chaining
     */
    text() {
        this._responseType = "text";
        return this;
    }
    /**
     * Sets the response type to XML.
     * @returns The builder instance for chaining
     */
    xml() {
        this._responseType = "xml";
        return this;
    }
    /**
     * Sets the HTTP method to POST.
     * @returns The builder instance for chaining
     */
    post() {
        this._method = "POST";
        return this;
    }
    /**
     * @ru Устанавливает потоковый режим ответа.
     * @en Sets streaming response mode.
     */
    stream() {
        this._responseType = "stream";
        return this;
    }
    /**
     * Sets the HTTP method to PUT.
     * @returns The builder instance for chaining
     */
    put() {
        this._method = "PUT";
        return this;
    }
    /**
     * Sets the HTTP method to PATCH.
     * @returns The builder instance for chaining
     */
    patch() {
        this._method = "PATCH";
        return this;
    }
    /**
     * Sets the HTTP method to DELETE.
     * @returns The builder instance for chaining
     */
    delete() {
        this._method = "DELETE";
        return this;
    }
    /**
     * Adds query parameters to the URL.
     * @param params - Object containing query parameter key-value pairs
     * @returns The builder instance for chaining
     */
    query(params) {
        const urlObj = new URL(this._url);
        Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, String(v)));
        this._url = urlObj.toString();
        return this;
    }
    /**
     * Sets a JSON body for the request.
     * Automatically sets the Content-Type header to application/json.
     * @param body - The JSON body data
     * @returns The builder instance for chaining
     */
    jsonBody(body) {
        this._body = body;
        this._headers["Content-Type"] = "application/json; charset=utf-8";
        return this;
    }
    /**
     * Sends the HTTP request and returns the response.
     * @returns Promise resolving to the response data
     */
    async send() {
        const client = defaultClient ?? (defaultClient = new HttpClientImproved());
        const req = {
            getURL: () => this._url,
            getBodyData: () => this._body,
            getHeaders: () => this._headers,
        };
        switch (this._method) {
            case "GET":
                if (this._responseType === "stream") {
                    return client.stream(req);
                }
                return client.get(req, this._responseType);
            case "POST":
                return client.post(req, undefined, this._responseType);
            case "PUT":
                return client.put(req, this._responseType);
            case "DELETE":
                return client.delete(req, this._responseType);
            case "PATCH":
                return client.patch(req, this._responseType);
            default:
                if (this._responseType === "stream") {
                    return client.stream(req);
                }
                return client.get(req, this._responseType);
        }
    }
}
//# sourceMappingURL=HttpClientImproved.js.map