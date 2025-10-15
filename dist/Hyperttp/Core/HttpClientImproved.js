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
const undici_1 = require("http-cookie-agent/undici");
const undici_2 = require("undici");
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
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved({
 *   timeout: 10000,
 *   maxConcurrent: 10,
 *   rateLimit: { maxRequests: 100, windowMs: 60000 },
 *   logger: (level, msg, meta) => console.log(`[${level}] ${msg}`, meta)
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
    /**
     * Creates a new HttpClient instance
     * @param options - Configuration options for the HTTP client
     */
    constructor(options) {
        this.options = options ?? {};
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
            retryStatusCodes: this.options.retryOptions?.retryStatusCodes ?? [408, 429, 500, 502, 503, 504],
            jitter: this.options.retryOptions?.jitter ?? true,
        };
        // Set default headers
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": this.options.userAgent ?? "Hyperttp/0.1.0 Node.js",
        };
        // Initialize HTTP agent with cookie support
        this.agent = new undici_1.CookieAgent({
            cookies: { jar: this.cookieJar },
            connections: 100,
            pipelining: 10,
        });
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
    async decompress(buf, enc) {
        if (!enc)
            return buf.toString("utf-8");
        try {
            switch (enc.toLowerCase()) {
                case "gzip":
                    return (await gunzip(buf)).toString("utf-8");
                case "deflate":
                    return (await inflate(buf)).toString("utf-8");
                case "br":
                    return (await brotliDecompress(buf)).toString("utf-8");
                default:
                    return buf.toString("utf-8");
            }
        }
        catch (error) {
            this.log("error", `Decompression failed for encoding ${enc}`, error);
            return buf.toString("utf-8");
        }
    }
    /**
     * Calculates retry delay with exponential backoff and optional jitter
     * @private
     */
    calcDelay(attempt) {
        const base = Math.min(this.retryOptions.baseDelay * 2 ** attempt, this.retryOptions.maxDelay);
        return this.retryOptions.jitter ? base * (0.75 + Math.random() * 0.5) : base;
    }
    /**
     * Utility method for sleeping
     * @private
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Sends an HTTP request with automatic retry logic
     * @private
     */
    async sendWithRetry(method, url, headers, body) {
        let lastError;
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                // Apply rate limiting
                await this.limiter.wait();
                // Set up request timeout
                const controller = new AbortController();
                const timeout = this.options.timeout ?? 15000;
                const timer = setTimeout(() => controller.abort(), timeout);
                // Make the request
                const res = await (0, undici_2.request)(url, {
                    method,
                    headers,
                    body,
                    dispatcher: this.agent,
                    signal: controller.signal,
                });
                clearTimeout(timer);
                // Read response body
                const buf = Buffer.from(await res.body.arrayBuffer());
                // Check if we should retry based on status code
                if (this.retryOptions.retryStatusCodes.includes(res.statusCode)) {
                    this.log("warn", `Retrying ${method} ${url} due to status ${res.statusCode}`, {
                        attempt: attempt + 1,
                        maxRetries: this.retryOptions.maxRetries,
                    });
                    if (attempt < this.retryOptions.maxRetries) {
                        await this.sleep(this.calcDelay(attempt));
                        continue;
                    }
                }
                return { status: res.statusCode, headers: res.headers, body: buf };
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
        throw lastError;
    }
    /**
     * Parses response body based on content type or responseType
     * @private
     * @param res Response object
     * @param responseType Optional type of response: 'json' | 'text' | 'buffer' | 'xml'
     * @returns Parsed response
     *
     * @example
     * ```ts
     * const res = await client.get(req, 'json');   // JSON
     * const text = await client.get(req, 'text');  // Plain text
     * const buf = await client.get(req, 'buffer'); // Buffer
     * const xml = await client.get(req, 'xml');    // XML parsed as object
     * ```
     */
    async parseResponse(res, responseType) {
        try {
            const text = await this.decompress(res.body, res.headers["content-encoding"]);
            const contentType = res.headers["content-type"];
            const type = responseType ?? "json";
            switch (type) {
                case "json":
                    if (contentType?.includes("json"))
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
            this.log("error", "Failed to parse response", { error, status: res.status });
            throw new Error(`Response parsing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Internal request method with caching and deduplication
     * @private
     * @param method HTTP method
     * @param req Request object
     * @param useCache Whether to use cache (GET requests)
     * @param responseType Type of response: 'json' | 'text' | 'buffer' | 'xml'
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
            try {
                this.log("debug", `Starting request: ${method} ${url}`);
                const result = await this.queue.enqueue(async () => {
                    const res = await this.sendWithRetry(method, url, headers, body);
                    const parsed = await this.parseResponse(res, responseType);
                    // Cache GET requests
                    if (method === "GET" && useCache) {
                        this.cache.set(key, parsed);
                    }
                    return parsed;
                });
                return result;
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
     *
     * @example
     * ```ts
     * const data = await client.get(req); // Default JSON
     * const text = await client.get(req, 'text'); // Plain text
     * const buf = await client.get(req, 'buffer'); // Buffer
     * const xml = await client.get(req, 'xml'); // Parsed XML
     * ```
     */
    get(req, responseType) {
        return this.request("GET", req, true, responseType);
    }
    /**
     * Performs a POST request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.post(req); // Default JSON
     * const text = await client.post(req, 'text'); // Plain text
     * const buf = await client.post(req, 'buffer'); // Buffer
     * const xml = await client.post(req, 'xml'); // Parsed XML
     * ```
     */
    post(req, responseType) {
        return this.request("POST", req, false, responseType);
    }
    /**
     * Performs a PUT request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.put(req); // Default JSON
     * const text = await client.put(req, 'text'); // Plain text
     * const buf = await client.put(req, 'buffer'); // Buffer
     * const xml = await client.put(req, 'xml'); // Parsed XML
     * ```
     */
    put(req, responseType) {
        return this.request("PUT", req, false, responseType);
    }
    /**
     * Performs a DELETE request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and optional body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.delete(req); // Default JSON
     * const text = await client.delete(req, 'text'); // Plain text
     * const buf = await client.delete(req, 'buffer'); // Buffer
     * const xml = await client.delete(req, 'xml'); // Parsed XML
     * ```
     */
    delete(req, responseType) {
        return this.request("DELETE", req, false, responseType);
    }
    /**
     * Performs a PATCH request
     * @template T - Expected response type
     * @param req Request object containing URL, headers, and body
     * @param responseType Optional type of response to parse: "json" | "text" | "buffer" | "xml"
     * @returns Promise resolving to the parsed response of the specified type
     *
     * @example
     * ```ts
     * const data = await client.patch(req); // Default JSON
     * const text = await client.patch(req, 'text'); // Plain text
     * const buf = await client.patch(req, 'buffer'); // Buffer
     * const xml = await client.patch(req, 'xml'); // Parsed XML
     * ```
     */
    patch(req, responseType) {
        return this.request("PATCH", req, false, responseType);
    }
    /**
     * Clears all cached responses
     */
    clearCache() {
        this.cache.clear();
        this.log("info", "Cache cleared");
    }
    /**
     * Gets statistics about the HTTP client state
     * @returns Object containing current state information
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