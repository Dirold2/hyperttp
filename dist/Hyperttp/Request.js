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
exports.PreparedRequest = void 0;
const querystring = __importStar(require("querystring"));
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
    constructor(config) {
        this.scheme = config.scheme;
        this.host = config.host;
        this.port = config.port;
        this.path = config.path || "";
        this.headers = config.headers || {};
        this.query = config.query || {};
        this.bodyData = config.bodyData || {};
    }
    setPath(path) {
        this.path = path;
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
        this.headers = headers;
        return this;
    }
    addHeaders(headers) {
        for (const key in headers) {
            this.headers[key] = headers[key];
        }
        return this;
    }
    getQuery() {
        return this.query;
    }
    setQuery(query) {
        this.query = query;
        return this;
    }
    addQuery(query) {
        for (const key in query) {
            this.query[key] = query[key];
        }
        return this;
    }
    getQueryAsString() {
        if (!Object.keys(this.query).length)
            return "";
        return "?" + Object.entries(this.query)
            .map(([key, val]) => `${key}=${val}`)
            .join("&");
    }
    getBodyData() {
        return this.bodyData;
    }
    getBodyDataString() {
        return querystring.stringify(this.bodyData);
    }
    setBodyData(bodyData) {
        this.bodyData = bodyData;
        return this;
    }
    addBodyData(bodyData) {
        for (const key in bodyData) {
            this.bodyData[key] = bodyData[key];
        }
        return this;
    }
    getURI() {
        let uri = `${this.scheme}://${this.host}`;
        if (this.port)
            uri += `:${this.port}`;
        if (this.path)
            uri += this.path;
        return uri;
    }
    getURL() {
        return this.getURI() + this.getQueryAsString();
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
class PreparedRequest {
    request;
    constructor(baseUrl) {
        const url = new URL(baseUrl);
        const config = {
            scheme: url.protocol.replace(":", ""),
            host: url.hostname,
            port: url.port ? parseInt(url.port) : url.protocol === "https:" ? 443 : 80,
            path: "",
        };
        this.request = new Request(config);
    }
    setPath(path) { this.request.setPath(path); return this; }
    setHost(host) { this.request.setHost(host); return this; }
    getHeaders() { return this.request.getHeaders(); }
    setHeaders(headers) { this.request.setHeaders(headers); return this; }
    addHeaders(headers) { this.request.addHeaders(headers); return this; }
    getQuery() { return this.request.getQuery(); }
    setQuery(query) { this.request.setQuery(query); return this; }
    addQuery(query) { this.request.addQuery(query); return this; }
    getQueryAsString() { return this.request.getQueryAsString(); }
    getBodyData() { return this.request.getBodyData(); }
    getBodyDataString() { return this.request.getBodyDataString(); }
    setBodyData(bodyData) { this.request.setBodyData(bodyData); return this; }
    addBodyData(bodyData) { this.request.addBodyData(bodyData); return this; }
    getURI() { return this.request.getURI(); }
    getURL() { return this.request.getURL(); }
}
exports.PreparedRequest = PreparedRequest;
//# sourceMappingURL=Request.js.map