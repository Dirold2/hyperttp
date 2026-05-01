"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const undici_1 = require("http-cookie-agent/undici");
const CacheManager_js_1 = require("./CacheManager.js");
const QueueManager_js_1 = require("./QueueManager.js");
const RateLimiter_js_1 = require("./RateLimiter.js");
const MetricsManager_js_1 = require("./MetricsManager.js");
const RequestBuilder_js_1 = require("./RequestBuilder.js");
const InterceptorManager_js_1 = require("./InterceptorManager.js");
const ResponseTransformer_js_1 = require("./ResponseTransformer.js");
const RequestExecutor_js_1 = require("./RequestExecutor.js");
const index_js_1 = require("../../Types/index.js");
/**
 * @class HttpClientImproved
 * @en High-performance HTTP client with built-in caching, queuing, rate limiting, and metrics.
 * @ru Высокопроизводительный HTTP-клиент со встроенным кэшированием, очередями, лимитами и метриками.
 */
class HttpClientImproved {
    agent;
    options;
    cache;
    queue;
    limiter;
    metricsManager;
    interceptors;
    transformer;
    executor;
    /**
     * @en Internal map to track active requests for deduplication and cancellation.
     * @ru Внутренняя карта для отслеживания активных запросов (дедупликация и отмена).
     */
    inflight = new Map();
    defaultHeaders = {};
    constructor(options) {
        this.options = this.applyDefaultOptions(options);
        this.metricsManager = new MetricsManager_js_1.MetricsManager({
            maxHistory: this.options.maxMetricsSize,
        });
        this.interceptors = new InterceptorManager_js_1.InterceptorManager();
        this.transformer = new ResponseTransformer_js_1.ResponseTransformer(this.options.maxResponseBytes, this.options.logger);
        if (this.options.enableCache) {
            this.cache = new CacheManager_js_1.CacheManager({
                cacheTTL: this.options.cacheTTL,
                cacheMaxSize: this.options.cacheMaxSize,
            });
        }
        if (this.options.enableQueue) {
            this.queue = new QueueManager_js_1.QueueManager(this.options.maxConcurrent ?? 500);
        }
        if (this.options.enableRateLimit) {
            this.limiter = new RateLimiter_js_1.RateLimiter(this.options.rateLimit);
        }
        this.agent = new undici_1.CookieAgent({
            connections: 1000,
            pipelining: 10,
            keepAliveTimeout: 60000,
        });
        this.executor = new RequestExecutor_js_1.RequestExecutor(this.agent, this.interceptors, {
            timeout: this.options.timeout,
            maxRetries: this.options.maxRetries,
            followRedirects: this.options.followRedirects,
            maxRedirects: this.options.maxRedirects,
            retryOptions: this.options.retryOptions,
            verbose: this.options.verbose,
            logger: this.options.logger,
        });
        this.defaultHeaders = {
            Accept: "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": this.options.userAgent,
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
        if (this.metricsManager.isCircuitOpen(url)) {
            throw new index_js_1.HttpClientError(`Circuit Breaker is OPEN`, "CIRCUIT_OPEN", 503, undefined, url, method);
        }
        if (this.limiter && this.options.enableRateLimit) {
            await this.limiter.wait();
        }
        const { body, headers } = this.prepareRequestData(method, req);
        const key = method === "GET"
            ? `GET:${url}`
            : `${method}:${url}:${body ? JSON.stringify(body) : ""}`;
        if (method === "GET" && useCache && this.cache) {
            const cached = await this.cache.get(key);
            if (cached)
                return cached;
        }
        if (this.inflight.has(key))
            return this.inflight.get(key).promise;
        const internalController = new AbortController();
        const userSignal = req.getSignal?.();
        const abortHandler = () => internalController.abort();
        if (userSignal) {
            userSignal.addEventListener("abort", abortHandler, { once: true });
        }
        const executeAction = async () => {
            const metrics = this.createInitialMetrics(url, method);
            try {
                const rawResponse = await this.executor.execute(method, url, headers, body, metrics, internalController.signal);
                const bufferBody = await this.transformer.readBodyWithLimit(rawResponse.body);
                this.metricsManager.recordBytes(bufferBody.length);
                const parsed = await this.transformer.parseResponse({ ...rawResponse, body: bufferBody }, responseType);
                if (method === "HEAD")
                    return {
                        status: rawResponse.status,
                        headers: rawResponse.headers,
                    };
                if (method === "GET" &&
                    useCache &&
                    this.cache &&
                    parsed !== undefined) {
                    this.cache.set(key, parsed);
                }
                this.recordSuccess(metrics, rawResponse.status);
                return parsed;
            }
            catch (error) {
                this.recordError(metrics, error);
                throw error;
            }
            finally {
                if (userSignal)
                    userSignal.removeEventListener("abort", abortHandler);
                this.inflight.delete(key);
            }
        };
        const promise = this.options.enableQueue && this.queue
            ? this.queue.enqueue(() => executeAction())
            : executeAction();
        this.inflight.set(key, { promise, controller: internalController });
        return promise;
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
        const requestObj = this.normalizeRequest(req, body);
        return this.requestInternal("POST", requestObj, false, responseType);
    }
    /**
     * @en Performs an HTTP PUT request.
     * @ru Выполняет HTTP PUT запрос.
     */
    put(req, body, responseType = "auto") {
        const requestObj = this.normalizeRequest(req, body);
        return this.requestInternal("PUT", requestObj, false, responseType);
    }
    /**
     * @en Performs an HTTP DELETE request.
     * @ru Выполняет HTTP DELETE запрос.
     */
    delete(req, responseType = "auto") {
        const requestObj = this.normalizeRequest(req);
        return this.requestInternal("DELETE", requestObj, false, responseType);
    }
    /**
     * @en Performs an HTTP PATCH request.
     * @ru Выполняет HTTP PATCH запрос.
     */
    patch(req, body, responseType = "auto") {
        const requestObj = this.normalizeRequest(req, body);
        return this.requestInternal("PATCH", requestObj, false, responseType);
    }
    /**
     * @en Creates a RequestBuilder for a fluent API approach.
     * @ru Создает RequestBuilder для использования Fluent API.
     * @example client.request('url').get().send();
     */
    request(url) {
        return new RequestBuilder_js_1.RequestBuilder(url, this);
    }
    /**
     * @en Releases all resources, aborts active requests, and closes connections.
     * @ru Освобождает ресурсы клиента, отменяет активные запросы и закрывает соединения.
     */
    async destroy() {
        if (this.inflight.size > 0) {
            if (this.options.verbose) {
                this.options.logger?.("info", `Aborting ${this.inflight.size} active requests...`);
            }
            for (const { controller } of this.inflight.values()) {
                controller.abort();
            }
            this.inflight.clear();
        }
        if (this.agent) {
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
        }
        if (this.cache)
            this.cache.clear();
    }
    /**
     * @en Performs an HTTP HEAD request.
     * @ru Выполняет HTTP HEAD запрос.
     */
    async head(req) {
        const requestObj = this.normalizeRequest(req);
        return this.requestInternal("HEAD", requestObj, false);
    }
    /**
     * @en Executes a request and returns an AsyncIterable stream.
     * @ru Выполняет запрос и возвращает итерируемый поток данных.
     */
    async stream(req) {
        const requestObj = this.normalizeRequest(req);
        const url = requestObj.getURL();
        const { body, headers } = this.prepareRequestData("GET", requestObj);
        const key = `STREAM:GET:${url}`;
        const internalController = new AbortController();
        const userSignal = requestObj.getSignal?.();
        const abortHandler = () => internalController.abort();
        if (userSignal) {
            userSignal.addEventListener("abort", abortHandler, { once: true });
        }
        try {
            const rawResponse = await this.executor.execute("GET", url, headers, body, undefined, internalController.signal);
            this.inflight.set(key, {
                promise: Promise.resolve(),
                controller: internalController,
            });
            const cleanup = () => {
                if (userSignal)
                    userSignal.removeEventListener("abort", abortHandler);
                this.inflight.delete(key);
            };
            rawResponse.body.on("close", cleanup);
            rawResponse.body.on("error", cleanup);
            return {
                status: rawResponse.status,
                headers: rawResponse.headers,
                body: rawResponse.body,
                url: rawResponse.url,
            };
        }
        catch (error) {
            if (userSignal)
                userSignal.removeEventListener("abort", abortHandler);
            throw error;
        }
    }
    /**
     * @en Clears the internal cache.
     * @ru Полностью очищает внутренний кэш клиента.
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
        }
    }
    /**
     * @en Clears all collected performance metrics.
     * @ru Очищает все собранные метрики производительности.
     */
    clearMetrics() {
        this.metricsManager.clear();
        this.options.logger?.("info", "Metrics cleared");
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
            queuedRequests: this.options.enableQueue && this.queue
                ? (this.queue.queuedCount ?? 0)
                : 0,
            activeRequests: this.options.enableQueue && this.queue
                ? (this.queue.activeCount ?? 0)
                : 0,
            currentRateLimit: this.options.enableRateLimit && this.limiter
                ? (this.limiter.currentCount ?? 0)
                : 0,
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
    applyDefaultOptions(opt) {
        const defaults = {
            timeout: 30000,
            maxRetries: 3,
            followRedirects: true,
            maxRedirects: 5,
            userAgent: "Hyperttp/2.0",
            maxResponseBytes: 10 * 1024 * 1024, // 10MB
            cacheTTL: 1000 * 60 * 5,
            cacheMaxSize: 500,
            enableCache: true,
            enableQueue: true,
            enableRateLimit: true,
            retryOptions: {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                retryStatusCodes: [408, 429, 500, 502, 503, 504],
                jitter: true,
            },
        };
        return { ...defaults, ...opt };
    }
    prepareRequestData(method, req) {
        const headers = { ...this.defaultHeaders, ...req.getHeaders() };
        let rawBody = req.getBodyData();
        const methodsWithBody = ["POST", "PUT", "PATCH", "DELETE"];
        if (!methodsWithBody.includes(method)) {
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
                    const finalValue = typeof value === "object" ? JSON.stringify(value) : String(value);
                    params.append(key, finalValue);
                }
                rawBody = params.toString();
            }
            else {
                try {
                    rawBody = JSON.stringify(rawBody);
                    if (!headers["content-type"]) {
                        headers["content-type"] = "application/json; charset=utf-8";
                    }
                }
                catch {
                    this.options.logger?.("error", `Serialization failed for ${method}`, {
                        url: req.getURL(),
                    });
                    rawBody = String(rawBody);
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
        if (this.options.verbose && this.options.logger) {
            this.options.logger("info", `Request successful: ${metrics.method} ${metrics.url}`, {
                duration: metrics.duration,
                status: metrics.statusCode,
            });
        }
    }
    recordError(metrics, error) {
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.statusCode = error.statusCode || 0;
        this.metricsManager.record(metrics);
        if (this.options.verbose && this.options.logger) {
            this.options.logger("error", `Request failed: ${metrics.method} ${metrics.url}`, {
                error: error.message,
                code: error.code,
            });
        }
    }
}
exports.default = HttpClientImproved;
//# sourceMappingURL=HttpClientImproved.js.map