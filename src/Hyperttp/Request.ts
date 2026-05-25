import type {
  RequestBodyData,
  RequestConfig,
  RequestHeaders,
  RequestInterface,
  RequestQuery,
} from "@hyperttp/core";

/**
 * Represents an HTTP request with configurable scheme, host, port, path, headers, query, and body data.
 * Provides methods to build and manipulate the request.
 */
export default class Request implements RequestInterface {
  private scheme: string;
  private host: string;
  private port: number;
  private path: string;
  private _headers: RequestHeaders;
  private _bodyData: RequestBodyData;
  private _signal?: AbortSignal;
  private method: string = "GET";
  private bodyType: "json" | "form" = "json";
  private _meta: any = {};
  public query: RequestQuery;

  constructor(config: RequestConfig & { meta?: any }) {
    this.scheme = config.scheme;
    this.host = config.host;
    this.port = config.port ?? (config.scheme === "https" ? 443 : 80);
    this.path = config.path ?? "";
    this._headers = config.headers ?? {};
    this.query = config.query ?? {};
    this._bodyData = config.bodyData ?? {};
    this._signal = undefined;
    this._meta = config.meta ?? {};
  }

  get url(): string {
    return this.buildURL().toString();
  }

  get headers(): RequestHeaders {
    return this._headers;
  }

  get body(): RequestBodyData {
    return this._bodyData;
  }

  get signal(): AbortSignal | undefined {
    return this._signal;
  }

  get meta(): any {
    return this._meta;
  }

  private buildURL(): URL {
    const url = new URL(`${this.scheme}://${this.host}`);

    url.port = this.port.toString();
    url.pathname = this.path || "";

    for (const [key, value] of Object.entries(this.query)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
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

  setHeaders(headers: RequestHeaders): this {
    this._headers = { ...headers };
    return this;
  }

  addHeaders(headers: RequestHeaders): this {
    this._headers = { ...this._headers, ...headers };
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

  getBodyDataString(): string {
    if (this._bodyData == null) return "";

    if (typeof this._bodyData === "string") {
      return this._bodyData;
    }

    if (this.bodyType === "form") {
      return new URLSearchParams(this._bodyData as any).toString();
    }

    return JSON.stringify(this._bodyData);
  }

  toFetchInit(): RequestInit {
    const body = this.getBodyDataString();

    return {
      method: this.method,
      headers: this._headers as Record<string, string>,
      body: body || undefined,
      signal: this._signal,
    };
  }

  setBodyData(bodyData: RequestBodyData): this {
    this._bodyData = { ...bodyData };
    return this;
  }

  addBodyData(bodyData: RequestBodyData): this {
    this._bodyData = { ...this._bodyData, ...bodyData };
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

  setSignal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  getURL(): string {
    return this.url;
  }
  getHeaders(): RequestHeaders {
    return this.headers;
  }
  getBodyData(): RequestBodyData {
    return this.body;
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
      headers: { ...this._headers },
      query: { ...this.query },
      bodyData: { ...this._bodyData },
      meta: { ...this._meta },
    })
      .setMethod(this.method)
      .setBodyType(this.bodyType);

    if (this._signal) req.setSignal(this._signal);

    return req;
  }

  withQuery(query: RequestQuery): Request {
    const req = new Request({
      scheme: this.scheme,
      host: this.host,
      port: this.port,
      path: this.path,
      headers: { ...this._headers },
      query: { ...this.query, ...query },
      bodyData: this._bodyData,
      meta: { ...this._meta },
    })
      .setMethod(this.method)
      .setBodyType(this.bodyType);

    if (this._signal) req.setSignal(this._signal);

    return req;
  }
}

/**
 * PreparedRequest исправно наследует измененное свойство.
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
