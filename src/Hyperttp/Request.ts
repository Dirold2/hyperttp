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
  private signal?: AbortSignal;
  private method: string = "GET";
  private bodyType: "json" | "form" = "json";

  private buildURL(): URL {
    const url = new URL(`${this.scheme}://${this.host}`);

    url.port = this.port.toString();
    url.pathname = this.path || "";

    for (const [key, value] of Object.entries(this.query)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
  }

  constructor(config: RequestConfig) {
    this.scheme = config.scheme;
    this.host = config.host;
    this.port = config.port ?? (config.scheme === "https" ? 443 : 80);
    this.path = config.path ?? "";
    this.headers = config.headers ?? {};
    this.query = config.query ?? {};
    this.bodyData = config.bodyData ?? {};
    this.signal = undefined;
  }

  private normalizePath(path: string): string {
    if (!path) return "";
    if (path === "/") return "";
    return path.startsWith("/") ? path : `/${path}`;
  }

  setPath(path: string): this {
    this.path = this.normalizePath(path);
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
      params.set(key, String(value));
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  getBodyData(): RequestBodyData {
    return this.bodyData;
  }

  getBodyDataString(): string {
    if (this.bodyData == null) return "";

    if (typeof this.bodyData === "string") {
      return this.bodyData;
    }

    if (this.bodyType === "form") {
      return new URLSearchParams(this.bodyData as any).toString();
    }

    return JSON.stringify(this.bodyData);
  }

  toFetchInit(): RequestInit {
    const body = this.getBodyDataString();

    return {
      method: this.method,
      headers: this.headers,
      body: body || undefined,
      signal: this.signal,
    };
  }

  setBodyData(bodyData: RequestBodyData): this {
    this.bodyData = { ...bodyData };
    return this;
  }

  addBodyData(bodyData: RequestBodyData): this {
    this.bodyData = { ...this.bodyData, ...bodyData };
    return this;
  }

  setBodyType(type: "json" | "form"): this {
    this.bodyType = type;
    return this;
  }

  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  getURL(): string {
    return this.buildURL().toString();
  }

  setSignal(signal: AbortSignal): this {
    this.signal = signal;
    return this;
  }

  getSignal(): AbortSignal | undefined {
    return this.signal;
  }

  clone(): Request {
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

    if (this.signal) req.setSignal(this.signal);

    return req;
  }

  withQuery(query: RequestQuery): Request {
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

    if (this.signal) req.setSignal(this.signal);

    return req;
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
export class PreparedRequest extends Request {
  constructor(baseUrl: string) {
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

function resolvePort(url: URL): number {
  if (url.port !== "") {
    const n = Number(url.port);
    if (!Number.isNaN(n)) return n;
  }

  return url.protocol === "https:" ? 443 : 80;
}