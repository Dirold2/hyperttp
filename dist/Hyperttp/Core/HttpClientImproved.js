"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const undici_1 = require("http-cookie-agent/undici");
const CacheManager_js_1 = require("./CacheManager.js");
const QueueManager_js_1 = require("./QueueManager.js");
const RateLimiter_js_1 = require("./RateLimiter.js");
const MetricsManager_js_1 = require("./MetricsManager.js");
const RequestBuilder_js_1 = require("./RequestBuilder.js");
const InterceptorManager_js_1 = require("./InterceptorManager.js");
const RequestExecutor_js_1 = require("./RequestExecutor.js");
const ResponseConverter_js_1 = require("./ResponseConverter.js");
const errors_js_1 = require("../../Types/errors.js");
const isProd = process.env.NODE_ENV === "production";
/**
 * @class HttpClientImproved
 * @en High-performance HTTP client with built-in caching, queuing, rate limiting, and metrics.
 * @ru Высокопроизводительный HTTP-клиент со встроенным кэшированием, очередями, лимитами и метриками.
 */
class HttpClientImproved {
    agent;
    config;
    cache;
    queue;
    limiter;
    metricsManager;
    interceptors;
    executor;
    converter;
    inflight = new Map();
    defaultHeaders = {};
    cacheEnabled;
    queueEnabled;
    limiterEnabled;
    metricsEnabled;
    verboseEnabled;
    constructor(config) {
        this.config = this.applyDefaulthcoptions(config);
        this.cacheEnabled = !!this.config.cache?.enabled;
        this.queueEnabled = !!this.config.queue?.enabled;
        this.limiterEnabled = !!this.config.rateLimit?.enabled;
        this.metricsEnabled = this.config.metrics?.enabled ?? true;
        this.verboseEnabled = !!this.config.verbose && !isProd;
        this.metricsManager = new MetricsManager_js_1.MetricsManager({
            maxHistory: this.config.metrics?.maxHistory,
        });
        this.converter = new ResponseConverter_js_1.ResponseConverter({
            maxBodySize: this.config.responseConverter?.maxBodySize,
            parseHTML: this.config.responseConverter?.parseHTML,
            htmlMode: this.config.responseConverter?.htmlMode,
            charset: this.config.responseConverter?.charset,
        });
        this.interceptors = new InterceptorManager_js_1.InterceptorManager();
        if (this.cacheEnabled) {
            this.cache = new CacheManager_js_1.CacheManager({
                cacheTTL: this.config.cache?.ttl,
                cacheMaxSize: this.config.cache?.maxSize,
            });
        }
        const concurrency = this.config.network?.maxConcurrent === 0
            ? Infinity
            : (this.config.network?.maxConcurrent ?? 500);
        if (this.queueEnabled) {
            this.queue = new QueueManager_js_1.QueueManager(concurrency);
        }
        if (this.config.rateLimit?.enabled) {
            this.limiter = new RateLimiter_js_1.RateLimiter(this.config.rateLimit);
        }
        this.agent = new undici_1.CookieAgent({
            connections: concurrency,
            pipelining: this.config.network?.pipelining ?? 10,
            keepAliveTimeout: this.config.network?.keepAliveTimeout ?? 30000,
            keepAliveMaxTimeout: this.config.network?.keepAliveTimeout ?? 30000,
            connect: {
                ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384",
                rejectUnauthorized: this.config.network?.rejectUnauthorized,
            },
            allowH2: this.config.network?.allowHttp2 ?? true,
        });
        this.executor = new RequestExecutor_js_1.RequestExecutor(this.agent, this.interceptors, {
            timeout: this.config.network?.timeout ?? 30000,
            maxRetries: this.config.retry?.maxRetries ?? 3,
            followRedirects: this.config.network?.followRedirects ?? true,
            maxRedirects: this.config.network?.maxRedirects ?? 5,
            retryOptions: {
                maxRetries: this.config.retry?.maxRetries ?? 3,
                baseDelay: this.config.retry?.baseDelay ?? 1000,
                maxDelay: this.config.retry?.maxDelay ?? 10000,
                retryStatusCodes: this.config.retry?.retryStatusCodes ?? [
                    408, 429, 500, 502, 503, 504,
                ],
                jitter: this.config.retry?.jitter ?? true,
            },
            verbose: this.verboseEnabled,
            logger: this.config.logger,
        });
        const useragent = this.config.network?.userAgent
            ? this.config.network?.userAgent
            : "Hyperttp/2.0";
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": useragent,
        };
    }
    /**
     * @en Performs an HTTP GET request.
     * @ru Выполняет HTTP GET запрос.
     * @param req Request URL or Request object
     * @param responseType Expected response format
     */
    get(req, responseType = "auto") {
        const requestObj = this.normalizeRequest(req);
        return this.requestInternal("GET", requestObj, true, responseType);
    }
    /**
     * @en Performs an HTTP POST request.
     * @ru Выполняет HTTP POST запрос.
     * @param req Request URL or Request object
     * @param body Request body data
     * @param responseType Expected response format
     */
    post(req, body, responseType = "auto") {
        return this.requestInternal("POST", this.normalizeRequest(req, body), false, responseType);
    }
    /**
     * @en Performs an HTTP PUT request.
     * @ru Выполняет HTTP PUT запрос.
     */
    put(req, body, responseType = "auto") {
        return this.requestInternal("PUT", this.normalizeRequest(req, body), false, responseType);
    }
    /**
     * @en Performs an HTTP DELETE request.
     * @ru Выполняет HTTP DELETE запрос.
     */
    delete(req, responseType = "auto") {
        return this.requestInternal("DELETE", this.normalizeRequest(req), false, responseType);
    }
    /**
     * @en Performs an HTTP PATCH request.
     * @ru Выполняет HTTP PATCH запрос.
     */
    patch(req, body, responseType = "auto") {
        return this.requestInternal("PATCH", this.normalizeRequest(req, body), false, responseType);
    }
    /**
     * @en Performs an HTTP OPTIONS request.
     * @ru Выполняет HTTP OPTIONS запрос.
     */
    options(req, body, responseType = "auto") {
        return this.requestInternal("OPTIONS", this.normalizeRequest(req, body), false, responseType);
    }
    /**
     * @en Performs an HTTP HEAD request.
     * @ru Выполняет HTTP HEAD запрос.
     */
    async head(req) {
        return this.requestInternal("HEAD", this.normalizeRequest(req), false);
    }
    /**
     * @en Creates a new HttpClient instance with merged configuration.
     * @ru Создаёт новый экземпляр HttpClient с объединённой конфигурацией.
     *
     * @param options Partial configuration to override current settings
     * @returns New HttpClientImproved instance
     */
    extend(options) {
        return new HttpClientImproved(this.mergeOptions(this.config, options));
    }
    /**
     * @en Alias for extend(). Creates a new configured client instance.
     * @ru Алиас для extend(). Создаёт новый настроенный экземпляр клиента.
     *
     * @param options Partial configuration overrides
     * @returns New HttpClientImproved instance
     */
    create(options) {
        return this.extend(options);
    }
    /**
     * @en Executes a request and returns an AsyncIterable stream.
     * @ru Выполняет запрос и возвращает итерируемый поток данных.
     */
    async stream(req) {
        const requestObj = this.normalizeRequest(req);
        const url = requestObj.getURL();
        const { body, headers } = this.prepareRequestData("GET", requestObj);
        const controller = new AbortController();
        const userSignal = requestObj.getSignal?.();
        const signal = userSignal
            ? AbortSignal.any([userSignal, controller.signal])
            : controller.signal;
        const rawResponse = await this.executor.execute("GET", url, headers, body, undefined, signal);
        const cleanup = () => {
            this.inflight.delete(url);
        };
        rawResponse.body.once("close", cleanup);
        rawResponse.body.once("error", cleanup);
        rawResponse.body.once("end", cleanup);
        this.inflight.set(url, {
            promise: Promise.resolve(undefined),
            controller,
        });
        return {
            status: rawResponse.status,
            headers: rawResponse.headers,
            body: rawResponse.body,
            url: rawResponse.url,
        };
    }
    /**
     * @en Creates a RequestBuilder for a fluent API approach.
     * @ru Создает RequestBuilder для использования Fluent API.
     * @example client.request('url').get().send();
     */
    request(url) {
        return new RequestBuilder_js_1.RequestBuilder(url, this);
    }
    async destroy() {
        this.queue?.clear();
        this.limiter?.reset();
        for (const { controller } of this.inflight.values()) {
            controller.abort();
        }
        this.inflight.clear();
        try {
            if (typeof this.agent.destroy === "function") {
                await this.agent.destroy();
            }
            else if (typeof this.agent.close === "function") {
                await this.agent.close();
            }
        }
        catch {
            /* ignore */
        }
        this.cache?.clear();
    }
    clearCache() {
        this.cache?.clear();
    }
    /**
     * @en Clears all collected performance metrics.
     * @ru Очищает все собранные метрики производительности.
     */
    clearMetrics() {
        this.metricsManager.clear();
    }
    /**
     * @en Retrieves metrics for a specific URL.
     * @ru Получает метрики для конкретного URL.
     */
    getMetrics(key) {
        return this.metricsManager.get(key);
    }
    /**
     * @en Retrieves all stored request metrics.
     * @ru Получает список всех сохраненных метрик.
     */
    getAllMetrics() {
        return Array.from(this.metricsManager.getAll());
    }
    /**
     * @en Returns real-time statistics about the client's internal state.
     * @ru Возвращает статистику состояния клиента в реальном времени.
     * @returns Cache size, active requests, queue state, etc.
     */
    getStats() {
        return {
            cacheSize: this.cache?.size ?? 0,
            inflightRequests: this.inflight.size,
            queuedRequests: this.queueEnabled && this.queue
                ? (this.queue.queuedCount ?? 0)
                : 0,
            activeRequests: this.queueEnabled && this.queue
                ? (this.queue.activeCount ?? 0)
                : 0,
            currentRateLimit: this.limiterEnabled && this.limiter
                ? (this.limiter.currentCount ?? 0)
                : 0,
        };
    }
    async warmup(urls, count = 10) {
        const tasks = [];
        for (let i = 0; i < count; i++) {
            const url = urls[i % urls.length];
            tasks.push(this.get(url, "text").catch(() => undefined));
        }
        await Promise.all(tasks);
    }
    mergeOptions(base, patch) {
        return {
            ...base,
            ...patch,
            network: { ...base.network, ...patch.network },
            retry: { ...base.retry, ...patch.retry },
            cache: { ...base.cache, ...patch.cache },
            rateLimit: { ...base.rateLimit, ...patch.rateLimit },
            metrics: { ...base.metrics, ...patch.metrics },
            queue: { ...base.queue, ...patch.queue },
            responseConverter: {
                ...base.responseConverter,
                ...patch.responseConverter,
            },
        };
    }
    normalizeRequest(req, body) {
        if (typeof req === "string") {
            return {
                getURL: () => req,
                getBodyData: () => body,
                getHeaders: () => ({}),
            };
        }
        return req;
    }
    applyDefaulthcoptions(opt) {
        const defaults = {
            network: {
                timeout: 30000,
                maxRedirects: 5,
                followRedirects: true,
                maxResponseBytes: 10 * 1024 * 1024,
                userAgent: "Hyperttp/2.0",
                allowHttp2: true,
                pipelining: 10,
                keepAliveTimeout: 30000,
                maxConcurrent: 0,
                rejectUnauthorized: false,
            },
            cache: {
                enabled: true,
                ttl: 1000 * 60 * 5,
                maxSize: 500,
                methods: [],
            },
            retry: {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                retryStatusCodes: [408, 429, 500, 502, 503, 504],
                jitter: true,
            },
            rateLimit: {
                enabled: false,
                maxRequests: 100,
                windowMs: 60000,
            },
            metrics: {
                enabled: true,
                maxHistory: 1000,
            },
            queue: {
                enabled: true,
            },
            responseConverter: {
                maxBodySize: 0,
                parseHTML: false,
                htmlMode: "simple",
                charset: "utf-8",
            },
        };
        return {
            ...defaults,
            ...opt,
            network: { ...defaults.network, ...opt?.network },
            cache: { ...defaults.cache, ...opt?.cache },
            retry: { ...defaults.retry, ...opt?.retry },
            rateLimit: { ...defaults.rateLimit, ...opt?.rateLimit },
            metrics: { ...defaults.metrics, ...opt?.metrics },
            queue: { ...defaults.queue, ...opt?.queue },
            responseConverter: {
                ...defaults.responseConverter,
                ...opt?.responseConverter,
            },
        };
    }
    /**
     * @en Core internal method for handling all HTTP requests.
     * @ru Основной внутренний метод для обработки всех HTTP-запросов.
     * @param method HTTP method (GET, POST, etc.)
     * @param req Request object
     * @param useCache Whether to use caching for this request
     * @param responseType Expected response format
     */
    async requestInternal(method, req, useCache = true, responseType = "auto") {
        const url = req.getURL();
        const userSignal = req.getSignal?.();
        if (userSignal?.aborted) {
            throw new errors_js_1.HttpClientError("Request aborted by user", "ABORTED", 0, undefined, url, method);
        }
        if (this.metricsManager.isCircuitOpen(url)) {
            throw new errors_js_1.HttpClientError("Circuit Breaker is OPEN", "CIRCUIT_OPEN", 503, undefined, url, method);
        }
        if (this.limiter) {
            await this.limiter.wait();
        }
        const { body, headers } = this.prepareRequestData(method, req);
        const key = method === "GET"
            ? `GET:${url}`
            : body !== undefined && body !== null
                ? `${method}:${url}:${typeof body === "string" ? body : JSON.stringify(body)}`
                : `${method}:${url}`;
        if (this.cache && method === "GET" && useCache) {
            const cached = await this.cache.get(key);
            if (cached !== undefined) {
                return cached;
            }
        }
        const existing = this.inflight.get(key);
        if (existing) {
            return existing.promise;
        }
        const internalController = new AbortController();
        const abortHandler = () => internalController.abort();
        if (userSignal) {
            userSignal.addEventListener("abort", abortHandler, { once: true });
        }
        const run = () => (async () => {
            let metrics;
            const needMetrics = this.metricsEnabled;
            if (needMetrics) {
                metrics = this.createInitialMetrics(url, method);
            }
            try {
                if (method === "HEAD") {
                    const rawResponse = await this.executor.execute(method, url, headers, body, metrics, internalController.signal);
                    if (needMetrics && metrics) {
                        this.recordSuccess(metrics, rawResponse.status);
                    }
                    return {
                        status: rawResponse.status,
                        headers: rawResponse.headers,
                    };
                }
                const rawResponse = await this.executor.execute(method, url, headers, body, metrics, internalController.signal);
                const bufferBody = await this.converter.readBody(rawResponse.body);
                const parsed = await this.converter.convert(bufferBody, responseType, {
                    contentType: rawResponse.headers["content-type"],
                    contentEncoding: rawResponse.headers["content-encoding"],
                    url: rawResponse.url,
                });
                if (this.cache &&
                    method === "GET" &&
                    useCache &&
                    parsed !== undefined) {
                    this.cache.set(key, parsed);
                }
                if (needMetrics && metrics) {
                    this.recordSuccess(metrics, rawResponse.status);
                }
                return parsed;
            }
            catch (error) {
                if (needMetrics && metrics) {
                    this.recordError(metrics, error);
                }
                throw error;
            }
            finally {
                if (userSignal) {
                    userSignal.removeEventListener("abort", abortHandler);
                }
                this.inflight.delete(key);
            }
        })();
        const promise = this.queueEnabled && this.queue ? this.queue.enqueue(run) : run();
        this.inflight.set(key, { promise, controller: internalController });
        return promise;
    }
    prepareRequestData(method, req) {
        const headers = { ...this.defaultHeaders, ...req.getHeaders() };
        let rawBody = req.getBodyData();
        if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            return { body: undefined, headers };
        }
        if (rawBody &&
            typeof rawBody === "object" &&
            !(rawBody instanceof Buffer)) {
            const contentType = (headers["content-type"] ||
                headers["Content-Type"] ||
                "").toLowerCase();
            if (contentType.includes("application/x-www-form-urlencoded")) {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(rawBody)) {
                    params.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
                }
                rawBody = params.toString();
            }
            else {
                rawBody = JSON.stringify(rawBody);
                if (!headers["content-type"]) {
                    headers["content-type"] = "application/json; charset=utf-8";
                }
            }
        }
        return {
            body: rawBody === null || rawBody === undefined ? undefined : rawBody,
            headers,
        };
    }
    createInitialMetrics(url, method) {
        return {
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
    }
    recordSuccess(metrics, status) {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.statusCode = status;
        this.metricsManager.record(metrics);
        if (this.verboseEnabled) {
            this.config.logger?.("info", `Request successful: ${metrics.method} ${metrics.url}`, {
                duration: metrics.duration,
                status: metrics.statusCode,
            });
        }
    }
    recordError(metrics, error) {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.statusCode = error?.statusCode || 0;
        this.metricsManager.record(metrics);
        if (this.verboseEnabled) {
            this.config.logger?.("error", `Request failed: ${metrics.method} ${metrics.url}`, {
                error: error?.message,
                code: error?.code,
            });
        }
    }
}
exports.default = HttpClientImproved;
//# sourceMappingURL=HttpClientImproved.js.map