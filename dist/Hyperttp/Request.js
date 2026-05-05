"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreparedRequest = void 0;
/**
 * Represents an HTTP request with configurable scheme, host, port, path, headers, query, and body data.
 * Provides methods to build and manipulate the request.
 *
 * @example
 * ```ts
 * const req = new Request({
 *   scheme: "https",
 *   host: "api.example.com",
 *   port: 443,
 * });
 *
 * req.setPath("/v1/users")
 *    .addQuery({ page: "1" })
 *    .addHeaders({ Authorization: "Bearer token" });
 *
 * console.log(req.getURL()); // "https://api.example.com:443/v1/users?page=1"
 * ```
 */
class Request {
    scheme;
    host;
    port;
    path;
    headers;
    query;
    bodyData;
    signal;
    method = "GET";
    bodyType = "json";
    buildURL() {
        const url = new URL(`${this.scheme}://${this.host}`);
        url.port = this.port.toString();
        url.pathname = this.path || "";
        for (const [key, value] of Object.entries(this.query)) {
            if (value == null)
                continue;
            if (Array.isArray(value)) {
                value.forEach((v) => url.searchParams.append(key, String(v)));
            }
            else {
                url.searchParams.set(key, String(value));
            }
        }
        return url;
    }
    constructor(config) {
        this.scheme = config.scheme;
        this.host = config.host;
        this.port = config.port ?? (config.scheme === "https" ? 443 : 80);
        this.path = config.path ?? "";
        this.headers = config.headers ?? {};
        this.query = config.query ?? {};
        this.bodyData = config.bodyData ?? {};
        this.signal = undefined;
    }
    normalizePath(path) {
        if (!path)
            return "";
        if (path === "/")
            return "";
        return path.startsWith("/") ? path : `/${path}`;
    }
    setPath(path) {
        this.path = this.normalizePath(path);
        return this;
    }
    setHost(host) {
        this.host = host;
        return this;
    }
    getHeaders() {
        return this.headers;
    }
    setHeaders(headers) {
        this.headers = { ...headers };
        return this;
    }
    addHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
        return this;
    }
    getQuery() {
        return this.query;
    }
    setQuery(query) {
        this.query = { ...query };
        return this;
    }
    addQuery(query) {
        this.query = { ...this.query, ...query };
        return this;
    }
    getQueryAsString() {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(this.query)) {
            if (value === undefined || value === null)
                continue;
            params.set(key, String(value));
        }
        const qs = params.toString();
        return qs ? `?${qs}` : "";
    }
    getBodyData() {
        return this.bodyData;
    }
    getBodyDataString() {
        if (this.bodyData == null)
            return "";
        if (typeof this.bodyData === "string") {
            return this.bodyData;
        }
        if (this.bodyType === "form") {
            return new URLSearchParams(this.bodyData).toString();
        }
        return JSON.stringify(this.bodyData);
    }
    toFetchInit() {
        const body = this.getBodyDataString();
        return {
            method: this.method,
            headers: this.headers,
            body: body || undefined,
            signal: this.signal,
        };
    }
    setBodyData(bodyData) {
        this.bodyData = { ...bodyData };
        return this;
    }
    addBodyData(bodyData) {
        this.bodyData = { ...this.bodyData, ...bodyData };
        return this;
    }
    setBodyType(type) {
        this.bodyType = type;
        return this;
    }
    setMethod(method) {
        this.method = method;
        return this;
    }
    getURL() {
        return this.buildURL().toString();
    }
    setSignal(signal) {
        this.signal = signal;
        return this;
    }
    getSignal() {
        return this.signal;
    }
    clone() {
        const req = new Request({
            scheme: this.scheme,
            host: this.host,
            port: this.port,
            path: this.path || "",
            headers: { ...this.headers },
            query: { ...this.query },
            bodyData: { ...this.bodyData },
        })
            .setMethod(this.method)
            .setBodyType(this.bodyType);
        if (this.signal)
            req.setSignal(this.signal);
        return req;
    }
    withQuery(query) {
        const req = new Request({
            scheme: this.scheme,
            host: this.host,
            port: this.port,
            path: this.path,
            headers: { ...this.headers },
            query: { ...this.query, ...query },
            bodyData: this.bodyData,
        })
            .setMethod(this.method)
            .setBodyType(this.bodyType);
        if (this.signal)
            req.setSignal(this.signal);
        return req;
    }
}
exports.default = Request;
/**
 * PreparedRequest is a wrapper around Request that parses a base URL and provides the same RequestInterface methods.
 * Useful for quickly creating requests from a full URL.
 *
 * @example
 * ```ts
 * const prepReq = new PreparedRequest("https://api.example.com:443");
 * prepReq.setPath("/v1/users")
 *        .addQuery({ page: "2" });
 * console.log(prepReq.getURL()); // "https://api.example.com:443/v1/users?page=2"
 * ```
 */
class PreparedRequest extends Request {
    constructor(baseUrl) {
        const url = new URL(baseUrl);
        super({
            scheme: url.protocol.replace(":", ""),
            host: url.hostname,
            port: resolvePort(url),
            path: url.pathname === "/" ? "" : url.pathname,
            query: Object.fromEntries(url.searchParams.entries()),
        });
    }
}
exports.PreparedRequest = PreparedRequest;
function resolvePort(url) {
    if (url.port !== "") {
        const n = Number(url.port);
        if (!Number.isNaN(n))
            return n;
    }
    return url.protocol === "https:" ? 443 : 80;
}
//# sourceMappingURL=Request.js.map