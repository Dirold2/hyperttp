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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tough_cookie_1 = require("tough-cookie");
const undici_1 = require("undici");
const undici_2 = require("http-cookie-agent/undici");
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const fast_xml_parser_1 = require("fast-xml-parser");
const fast_xml_builder_1 = __importDefault(require("fast-xml-builder"));
const CacheManager_1 = require("./CacheManager");
const QueueManager_1 = require("./QueueManager");
const RateLimiter_1 = require("./RateLimiter");
const Types_1 = require("../../Types");
const RequestBuilder_1 = require("./RequestBuilder");
const MetricsManager_1 = require("./MetricsManager");
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
    metricsManager;
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
        this.metricsManager = new MetricsManager_1.MetricsManager({
            maxHistory: this.options.maxMetricsSize,
        });
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
        this.agent = new undici_2.CookieAgent({
            connections: 1000,
            pipelining: 10,
            keepAliveTimeout: 60000,
            keepAliveMaxTimeout: 600000,
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
    /**
     * @ru Закрывает агент и освобождает ресурсы (keep-alive соединения).
     * @en Closes the HTTP agent and terminates keep-alive connections.
     */
    close() {
        if (this.agent && typeof this.agent.destroy === "function") {
            this.agent.destroy();
        }
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
        const limit = this.options.maxResponseBytes;
        const chunks = [];
        let receivedBytes = 0;
        for await (const chunk of body) {
            receivedBytes += chunk.length;
            if (typeof limit === "number" && limit > 0 && receivedBytes > limit) {
                if (typeof body.destroy === "function")
                    body.destroy();
                throw new Types_1.HttpClientError(`Response too large`, "HTTP_ERROR", 0);
            }
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    async sendWithRetry(method, url, headers, body, metrics, signal, redirects = 0) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            const timeoutController = new AbortController();
            const timeout = this.options.timeout ?? 15000;
            const timer = setTimeout(() => timeoutController.abort(), timeout);
            const abortHandler = () => timeoutController.abort();
            if (signal) {
                if (signal.aborted) {
                    clearTimeout(timer);
                    throw new Types_1.HttpClientError("Request aborted by user", "ABORTED", 0, undefined, url, method);
                }
                signal.addEventListener("abort", abortHandler);
            }
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
                try {
                    const res = await (0, undici_1.request)(finalConfig.url, {
                        method: finalConfig.method,
                        headers: finalConfig.headers,
                        body: finalConfig.body,
                        dispatcher: this.agent,
                        signal: timeoutController.signal,
                    });
                    clearTimeout(timer);
                    const buf = await this.readBodyWithLimit(res.body);
                    let response = await this.applyResponseInterceptors({
                        status: res.statusCode,
                        headers: res.headers,
                        body: buf,
                        url: finalConfig.url,
                    });
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
                            this.log("debug", `Redirecting to ${nextUrl}`);
                            return this.sendWithRetry(redirectMethod, nextUrl, nextHeaders, nextBody, metrics, signal, redirects + 1);
                        }
                    }
                    if (this.retryOptions.retryStatusCodes.includes(response.status)) {
                        metrics && (metrics.retries += 1);
                        if (response.status === 429) {
                            const ra = this.parseRetryAfterMs(response.headers["retry-after"]);
                            if (ra !== undefined) {
                                if (attempt < this.retryOptions.maxRetries) {
                                    await this.sleep(ra);
                                    continue;
                                }
                                throw new Types_1.RateLimitError(finalConfig.url, ra);
                            }
                        }
                        if (attempt < this.retryOptions.maxRetries) {
                            await this.sleep(this.calcDelay(attempt));
                            continue;
                        }
                    }
                    return response;
                }
                catch (innerErr) {
                    clearTimeout(timer);
                    if (innerErr.name === "AbortError") {
                        if (signal?.aborted) {
                            throw new Types_1.HttpClientError("Request aborted by user", "ABORTED", 0, innerErr, url, method);
                        }
                        else {
                            throw new Types_1.TimeoutError(url, timeout);
                        }
                    }
                    throw innerErr;
                }
            }
            catch (err) {
                lastError = err;
                if (err.code === 'ECONNREFUSED') {
                    this.log("error", `Соединение отклонено: проверьте, запущен ли сервер на ${url}`);
                    throw new Types_1.HttpClientError(`Request failed: ${err.message}`, 'REQUEST_FAILED', undefined, err, url, method);
                }
                if (err.code === "ABORTED" || err instanceof Types_1.TimeoutError) {
                    throw err;
                }
                this.log("error", `Request error ${method} ${url}: ${err?.message}`);
                metrics && (metrics.retries += 1);
                if (attempt < this.retryOptions.maxRetries) {
                    await this.sleep(this.calcDelay(attempt));
                    continue;
                }
            }
            finally {
                clearTimeout(timer);
                if (signal) {
                    signal.removeEventListener("abort", abortHandler);
                }
            }
        }
        if (lastError instanceof Types_1.HttpClientError)
            throw lastError;
        throw new Types_1.HttpClientError(`Request failed after ${this.retryOptions.maxRetries + 1} attempts`, "REQUEST_FAILED", undefined, lastError instanceof Error ? lastError : undefined, url, method);
    }
    xmlParser = new fast_xml_parser_1.XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
    });
    async parseResponse(res, responseType = "auto") {
        try {
            const text = await this.decompress(res.body, res.headers["content-encoding"]);
            const trimmed = text.trim();
            switch (responseType) {
                case "json": {
                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                        return JSON.parse(trimmed);
                    }
                    if (trimmed.startsWith("<")) {
                        return this.xmlParser.parse(trimmed);
                    }
                    return { data: trimmed };
                }
                case "xml": {
                    if (trimmed.startsWith("<"))
                        return trimmed;
                    try {
                        const obj = JSON.parse(trimmed);
                        const builder = new fast_xml_builder_1.default({
                            format: true,
                            indentBy: "  ",
                            ignoreAttributes: false,
                        });
                        return builder.build(obj);
                    }
                    catch {
                        return text;
                    }
                }
                case "text":
                    return text;
                case "buffer":
                    return res.body;
                case "auto":
                default: {
                    const contentType = (res.headers["content-type"] || "").toLowerCase();
                    if (contentType.includes("json") ||
                        trimmed.startsWith("{") ||
                        trimmed.startsWith("[")) {
                        try {
                            return JSON.parse(trimmed);
                        }
                        catch {
                            return text;
                        }
                    }
                    return text;
                }
            }
        }
        catch (err) {
            throw new Types_1.HttpClientError(`Parsing failed: ${err?.message ?? String(err)}`, "PARSING_ERROR", res.status);
        }
    }
    async requestInternal(method, req, useCache = true, responseType) {
        const url = req.getURL();
        if (this.metricsManager.isCircuitOpen(url)) {
            throw new Types_1.HttpClientError(`Circuit Breaker is OPEN for host: ${new URL(url).host}`, "CIRCUIT_OPEN", 503, undefined, url, method);
        }
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
                if (!contentType)
                    headers["Content-Type"] = "application/json; charset=utf-8";
            }
        }
        const key = `${method}:${url}:${body ?? ""}`;
        if (method === "GET" && useCache && this.cache) {
            const cached = await this.cache.get(key);
            if (cached) {
                this.log("debug", `Memory cache hit for ${url}`);
                return cached;
            }
        }
        if (this.inflight.has(key)) {
            this.log("debug", `Deduplicating request for ${url}`);
            return this.inflight.get(key);
        }
        const signal = req.getSignal?.();
        if (signal?.aborted) {
            throw new Types_1.HttpClientError("Aborted before execution", "ABORTED", 0, undefined, url, method);
        }
        const executeRequest = async () => {
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
                const res = await this.sendWithRetry(method, url, headers, body, metrics, signal);
                if (method === "HEAD") {
                    metrics.endTime = Date.now();
                    metrics.duration = metrics.endTime - metrics.startTime;
                    this.metricsManager.record(metrics);
                    return { status: res.status, headers: res.headers };
                }
                const parsed = await this.parseResponse(res, responseType);
                if (method === "GET" && useCache && this.cache) {
                    this.cache.set(key, parsed);
                }
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                metrics.statusCode = res.status;
                this.metricsManager.record(metrics);
                return parsed;
            }
            catch (error) {
                metrics.endTime = Date.now();
                metrics.duration = metrics.endTime - metrics.startTime;
                this.metricsManager.record(metrics);
                throw error;
            }
            finally {
                this.inflight.delete(key);
            }
        };
        const promise = this.options.enableQueue
            ? this.queue.enqueue(() => executeRequest())
            : executeRequest();
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
    get(req, responseType = "auto") {
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
    post(req, body, responseType = "auto") {
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
    put(req, body, responseType = "auto") {
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
    delete(req, responseType = "auto") {
        if (typeof req === "string") {
            const simpleReq = {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
            };
            return this.requestInternal("DELETE", simpleReq, false, responseType);
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
    patch(req, body, responseType = "auto") {
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
    async stream(req) {
        const requestObj = typeof req === "string"
            ? {
                getURL: () => req,
                getBodyData: () => undefined,
                getHeaders: () => ({}),
                getSignal: () => undefined,
            }
            : req;
        const url = requestObj.getURL();
        const signal = requestObj.getSignal?.();
        if (signal?.aborted) {
            throw new Types_1.HttpClientError("Request aborted before execution", "ABORTED", 0, undefined, url, "GET");
        }
        const executeStream = async () => {
            const headers = {
                ...this.defaultHeaders,
                ...requestObj.getHeaders(),
            };
            try {
                const response = await (0, undici_1.request)(url, {
                    method: "GET",
                    headers,
                    dispatcher: this.agent,
                    signal,
                    bodyTimeout: this.options.timeout,
                    headersTimeout: this.options.timeout,
                });
                return {
                    status: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                    url,
                };
            }
            catch (err) {
                if (err.name === "AbortError") {
                    throw new Types_1.HttpClientError("Stream aborted by user", "ABORTED", 0, err, url, "GET");
                }
                throw err;
            }
        };
        if (this.queue && this.options.enableQueue) {
            return this.queue.enqueue(() => executeStream());
        }
        return executeStream();
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
        this.metricsManager.clear();
        this.log("info", "Metrics cleared");
    }
    /**
     * Retrieves metrics for a specific request by its URL.
     * @param key - The URL or cache key to retrieve metrics for
     * @returns Metrics object if found, undefined otherwise
     */
    getMetrics(key) {
        return this.metricsManager.get(key);
    }
    /**
     * Retrieves all collected request metrics.
     * @returns Array of all metrics objects
     */
    getAllMetrics() {
        return Array.from(this.metricsManager.getAll());
    }
    /**
     * Creates a fluent request builder for making HTTP requests.
     * Provides a chainable API for building and sending requests.
     * @param url - The target URL for the request
     * @returns RequestBuilder instance for chaining
     */
    request(url) {
        return new RequestBuilder_1.RequestBuilder(url, this);
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