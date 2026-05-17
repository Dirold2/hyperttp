"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestExecutor = void 0;
const undici_1 = require("undici");
const errors_1 = require("../../Types/errors");
class RequestExecutor {
    agent;
    interceptors;
    options;
    redirectStatusCodes = new Set([301, 302, 303, 307, 308]);
    constructor(agent, interceptors, options) {
        this.agent = agent;
        this.interceptors = interceptors;
        this.options = options;
    }
    calcDelay(attempt) {
        const { baseDelay, maxDelay, jitter } = this.options.retryOptions;
        const base = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        return jitter ? base * (0.75 + Math.random() * 0.5) : base;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async drainBody(body) {
        if (!body)
            return;
        try {
            if (typeof body.dump === "function") {
                await body.dump();
                return;
            }
            if (typeof body.resume === "function") {
                body.resume();
                return;
            }
            if (typeof body.destroy === "function") {
                body.destroy();
            }
        }
        catch {
            /* ignore */
        }
    }
    async executeCore(method, url, headers, body, metrics, signal, parser) {
        let currentUrl = url;
        let currentMethod = method;
        let currentHeaders = headers;
        let currentBody = body;
        let redirects = 0;
        let attempt = 0;
        const timeoutController = new AbortController();
        const timer = setTimeout(() => timeoutController.abort(), this.options.timeout);
        const abortHandler = () => timeoutController.abort();
        if (signal) {
            if (signal.aborted) {
                clearTimeout(timer);
                throw new errors_1.HttpClientError("Request aborted by user", "ABORTED", 0, undefined, url, method);
            }
            signal.addEventListener("abort", abortHandler, { once: true });
        }
        try {
            while (true) {
                try {
                    const config = await this.interceptors.applyRequest({
                        url: currentUrl,
                        method: currentMethod,
                        headers: currentHeaders,
                        body: currentBody,
                    });
                    const res = await (0, undici_1.request)(config.url, {
                        method: config.method,
                        headers: config.headers,
                        body: config.body,
                        dispatcher: this.agent,
                        signal: timeoutController.signal,
                    });
                    const status = res.statusCode;
                    const resHeaders = res.headers;
                    if (this.options.followRedirects &&
                        this.redirectStatusCodes.has(status)) {
                        if (redirects >= this.options.maxRedirects) {
                            await this.drainBody(res.body);
                            throw new errors_1.HttpClientError("Too many redirects", "TOO_MANY_REDIRECTS", status);
                        }
                        const location = resHeaders.location;
                        if (location) {
                            await this.drainBody(res.body);
                            const nextUrl = new URL(location, config.url).toString();
                            const nextMethod = status === 303 ? "GET" : currentMethod;
                            currentUrl = nextUrl;
                            currentMethod = nextMethod;
                            currentBody = nextMethod === "GET" ? undefined : currentBody;
                            if (nextMethod === "GET") {
                                if (currentHeaders["content-type"] ||
                                    currentHeaders["Content-Type"] ||
                                    currentHeaders["content-length"] ||
                                    currentHeaders["Content-Length"]) {
                                    const nextHeaders = { ...currentHeaders };
                                    delete nextHeaders["content-type"];
                                    delete nextHeaders["Content-Type"];
                                    delete nextHeaders["content-length"];
                                    delete nextHeaders["Content-Length"];
                                    currentHeaders = nextHeaders;
                                }
                            }
                            redirects++;
                            continue;
                        }
                    }
                    if (status >= 500) {
                        if (attempt < this.options.maxRetries) {
                            if (metrics)
                                metrics.retries += 1;
                            await this.drainBody(res.body);
                            const delay = this.calcDelay(attempt);
                            if (delay > 0)
                                await this.sleep(delay);
                            attempt++;
                            continue;
                        }
                        throw new errors_1.HttpClientError(`HTTP ${status}`, "HTTP_ERROR", status, undefined, config.url, currentMethod);
                    }
                    const transformed = await this.interceptors.applyResponse({
                        status,
                        headers: resHeaders,
                        body: res.body,
                        url: config.url,
                    });
                    const parsed = await parser(transformed);
                    return {
                        status: transformed.status,
                        headers: transformed.headers,
                        body: parsed,
                        url: transformed.url,
                    };
                }
                catch (err) {
                    if (err?.name === "AbortError") {
                        if (signal?.aborted) {
                            throw new errors_1.HttpClientError("Request aborted by user", "ABORTED", 0, err, url, method);
                        }
                        throw new errors_1.TimeoutError(url, this.options.timeout);
                    }
                    if (attempt < this.options.maxRetries &&
                        (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT")) {
                        if (metrics)
                            metrics.retries += 1;
                        await this.sleep(this.calcDelay(attempt));
                        attempt++;
                        continue;
                    }
                    throw err;
                }
            }
        }
        finally {
            clearTimeout(timer);
            if (signal)
                signal.removeEventListener("abort", abortHandler);
        }
    }
    async execute(method, url, headers, body, metrics, signal) {
        return this.executeCore(method, url, headers, body, metrics, signal, async (res) => res.body);
    }
}
exports.RequestExecutor = RequestExecutor;
//# sourceMappingURL=RequestExecutor.js.map