import * as querystring from "querystring";
import type {
  RequestHeaders,
  RequestQuery,
  RequestBodyData,
  RequestConfig,
  RequestInterface,
} from "../Types/request";

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
  private scheme: string;
  private host: string;
  private port: number;
  private path: string;
  private headers: RequestHeaders;
  private query: RequestQuery;
  private bodyData: RequestBodyData;

  constructor(config: RequestConfig) {
    this.scheme = config.scheme;
    this.host = config.host;
    this.port = config.port;
    this.path = config.path ?? "";
    this.headers = config.headers ?? {};
    this.query = config.query ?? {};
    this.bodyData = config.bodyData ?? {};
  }

  private normalizePath(path: string): string {
    if (!path) return "";
    return path.startsWith("/") ? path : `/${path}`;
  }

  setPath(path: string): this {
    this.path = path;
    return this;
  }

  setHost(host: string): this {
    this.host = host;
    return this;
  }

  getHeaders(): RequestHeaders {
    return this.headers;
  }

  setHeaders(headers: RequestHeaders): this {
    this.headers = { ...headers };
    return this;
  }

  addHeaders(headers: RequestHeaders): this {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  getQuery(): RequestQuery {
    return this.query;
  }

  setQuery(query: RequestQuery): this {
    this.query = { ...query };
    return this;
  }

  addQuery(query: RequestQuery): this {
    this.query = { ...this.query, ...query };
    return this;
  }

  getQueryAsString(): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(this.query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  getBodyData(): RequestBodyData {
    return this.bodyData;
  }

  getBodyDataString(): string {
    return querystring.stringify(this.bodyData);
  }

  setBodyData(bodyData: RequestBodyData): this {
    this.bodyData = { ...bodyData };
    return this;
  }

  addBodyData(bodyData: RequestBodyData): this {
    this.bodyData = { ...this.bodyData, ...bodyData };
    return this;
  }

  getURI(): string {
    const path = this.normalizePath(this.path);
    const portPart = this.port ? `:${this.port}` : "";
    return `${this.scheme}://${this.host}${portPart}${path}`;
  }

  getURL(): string {
    // Используем URL + searchParams для надёжной сборки
    const base = new URL(this.getURI());
    for (const [key, value] of Object.entries(this.query)) {
      if (value === undefined || value === null) continue;
      base.searchParams.append(key, String(value));
    }
    return base.toString();
  }
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
export class PreparedRequest implements RequestInterface {
  private request: Request;

  constructor(baseUrl: string) {
    const url = new URL(baseUrl);
    const config: RequestConfig = {
      scheme: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port
        ? parseInt(url.port, 10)
        : url.protocol === "https:"
          ? 443
          : 80,
      path: url.pathname === "/" ? "" : url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
    };
    this.request = new Request(config);
  }

  setPath(path: string): this {
    this.request.setPath(path);
    return this;
  }
  setHost(host: string): this {
    this.request.setHost(host);
    return this;
  }
  getHeaders(): RequestHeaders {
    return this.request.getHeaders();
  }
  setHeaders(headers: RequestHeaders): this {
    this.request.setHeaders(headers);
    return this;
  }
  addHeaders(headers: RequestHeaders): this {
    this.request.addHeaders(headers);
    return this;
  }
  getQuery(): RequestQuery {
    return this.request.getQuery();
  }
  setQuery(query: RequestQuery): this {
    this.request.setQuery(query);
    return this;
  }
  addQuery(query: RequestQuery): this {
    this.request.addQuery(query);
    return this;
  }
  getQueryAsString(): string {
    return this.request.getQueryAsString();
  }
  getBodyData(): RequestBodyData {
    return this.request.getBodyData();
  }
  getBodyDataString(): string {
    return this.request.getBodyDataString();
  }
  setBodyData(bodyData: RequestBodyData): this {
    this.request.setBodyData(bodyData);
    return this;
  }
  addBodyData(bodyData: RequestBodyData): this {
    this.request.addBodyData(bodyData);
    return this;
  }
  getURI(): string {
    return this.request.getURI();
  }
  getURL(): string {
    return this.request.getURL();
  }
}
