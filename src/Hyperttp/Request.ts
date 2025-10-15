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
    this.path = config.path || "";
    this.headers = config.headers || {};
    this.query = config.query || {};
    this.bodyData = config.bodyData || {};
  }

  setPath(path: string): RequestInterface {
    this.path = path;
    return this;
  }

  setHost(host: string): RequestInterface {
    this.host = host;
    return this;
  }

  getHeaders(): RequestHeaders {
    return this.headers;
  }

  setHeaders(headers: RequestHeaders): RequestInterface {
    this.headers = headers;
    return this;
  }

  addHeaders(headers: RequestHeaders): RequestInterface {
    for (const key in headers) {
      this.headers[key] = headers[key];
    }
    return this;
  }

  getQuery(): RequestQuery {
    return this.query;
  }

  setQuery(query: RequestQuery): RequestInterface {
    this.query = query;
    return this;
  }

  addQuery(query: RequestQuery): RequestInterface {
    for (const key in query) {
      this.query[key] = query[key];
    }
    return this;
  }

  getQueryAsString(): string {
    if (!Object.keys(this.query).length) return "";
    return "?" + Object.entries(this.query)
      .map(([key, val]) => `${key}=${val}`)
      .join("&");
  }

  getBodyData(): RequestBodyData {
    return this.bodyData;
  }

  getBodyDataString(): string {
    return querystring.stringify(this.bodyData);
  }

  setBodyData(bodyData: RequestBodyData): RequestInterface {
    this.bodyData = bodyData;
    return this;
  }

  addBodyData(bodyData: RequestBodyData): RequestInterface {
    for (const key in bodyData) {
      this.bodyData[key] = bodyData[key];
    }
    return this;
  }

  getURI(): string {
    let uri = `${this.scheme}://${this.host}`;
    if (this.port) uri += `:${this.port}`;
    if (this.path) uri += this.path;
    return uri;
  }

  getURL(): string {
    return this.getURI() + this.getQueryAsString();
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
      port: url.port ? parseInt(url.port) : url.protocol === "https:" ? 443 : 80,
      path: "",
    };
    this.request = new Request(config);
  }

  setPath(path: string): RequestInterface { this.request.setPath(path); return this; }
  setHost(host: string): RequestInterface { this.request.setHost(host); return this; }
  getHeaders(): RequestHeaders { return this.request.getHeaders(); }
  setHeaders(headers: RequestHeaders): RequestInterface { this.request.setHeaders(headers); return this; }
  addHeaders(headers: RequestHeaders): RequestInterface { this.request.addHeaders(headers); return this; }
  getQuery(): RequestQuery { return this.request.getQuery(); }
  setQuery(query: RequestQuery): RequestInterface { this.request.setQuery(query); return this; }
  addQuery(query: RequestQuery): RequestInterface { this.request.addQuery(query); return this; }
  getQueryAsString(): string { return this.request.getQueryAsString(); }
  getBodyData(): RequestBodyData { return this.request.getBodyData(); }
  getBodyDataString(): string { return this.request.getBodyDataString(); }
  setBodyData(bodyData: RequestBodyData): RequestInterface { this.request.setBodyData(bodyData); return this; }
  addBodyData(bodyData: RequestBodyData): RequestInterface { this.request.addBodyData(bodyData); return this; }
  getURI(): string { return this.request.getURI(); }
  getURL(): string { return this.request.getURL(); }
}
