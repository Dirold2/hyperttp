import type { RequestHeaders, RequestQuery, RequestBodyData, RequestConfig, RequestInterface } from "../Types/request";
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
export default class Request implements RequestInterface {
    private scheme;
    private host;
    private port;
    private path;
    private headers;
    private query;
    private bodyData;
    constructor(config: RequestConfig);
    setPath(path: string): RequestInterface;
    setHost(host: string): RequestInterface;
    getHeaders(): RequestHeaders;
    setHeaders(headers: RequestHeaders): RequestInterface;
    addHeaders(headers: RequestHeaders): RequestInterface;
    getQuery(): RequestQuery;
    setQuery(query: RequestQuery): RequestInterface;
    addQuery(query: RequestQuery): RequestInterface;
    getQueryAsString(): string;
    getBodyData(): RequestBodyData;
    getBodyDataString(): string;
    setBodyData(bodyData: RequestBodyData): RequestInterface;
    addBodyData(bodyData: RequestBodyData): RequestInterface;
    getURI(): string;
    getURL(): string;
}
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
export declare class PreparedRequest implements RequestInterface {
    private request;
    constructor(baseUrl: string);
    setPath(path: string): RequestInterface;
    setHost(host: string): RequestInterface;
    getHeaders(): RequestHeaders;
    setHeaders(headers: RequestHeaders): RequestInterface;
    addHeaders(headers: RequestHeaders): RequestInterface;
    getQuery(): RequestQuery;
    setQuery(query: RequestQuery): RequestInterface;
    addQuery(query: RequestQuery): RequestInterface;
    getQueryAsString(): string;
    getBodyData(): RequestBodyData;
    getBodyDataString(): string;
    setBodyData(bodyData: RequestBodyData): RequestInterface;
    addBodyData(bodyData: RequestBodyData): RequestInterface;
    getURI(): string;
    getURL(): string;
}
//# sourceMappingURL=Request.d.ts.map