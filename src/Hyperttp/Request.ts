import type {
  RequestBodyData,
  RequestConfig,
  RequestHeaders,
  RequestInterface,
  RequestQuery,
} from "@hyperttp/types";

/**
 * @ru Представляет HTTP-запрос с настраиваемой схемой, хостом, портом, путём, заголовками, параметрами запроса и телом. Предоставляет методы для построения и манипуляции запросом.
 * @en Represents an HTTP request with configurable scheme, host, port, path, headers, query, and body data. Provides methods to build and manipulate the request.
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

  /**
   * @ru Создаёт экземпляр Request.
   * @en Creates a Request instance.
   * @param config - Configuration object with scheme, host, port, path, headers, query, bodyData, meta.
   */
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

  /**
   * @ru Полный URL запроса, построенный на основе схемы, хоста, порта, пути и параметров запроса.
   * @en Full request URL built from scheme, host, port, path, and query parameters.
   */
  get url(): string {
    return this.buildURL().toString();
  }

  /**
   * @ru Заголовки запроса.
   * @en Request headers.
   */
  get headers(): RequestHeaders {
    return this._headers;
  }

  /**
   * @ru Тело запроса.
   * @en Request body.
   */
  get body(): RequestBodyData {
    return this._bodyData;
  }

  /**
   * @ru Сигнал для отмены запроса (опционально).
   * @en Abort signal for request cancellation (optional).
   */
  get signal(): AbortSignal | undefined {
    return this._signal;
  }

  /**
   * @ru Мета-данные запроса (произвольные данные).
   * @en Request metadata (arbitrary data).
   */
  get meta(): any {
    return this._meta;
  }

  private buildURL(): URL {
    let targetHost = this.host;
    let prefixPath = "";

    if (targetHost.includes("://")) {
      targetHost = targetHost.split("://")[1]!;
    }

    if (targetHost.includes("/")) {
      const parts = targetHost.split("/");
      targetHost = parts[0]!;
      prefixPath = "/" + parts.slice(1).join("/");
    }

    const url = new URL(`${this.scheme}://${targetHost}`);
    url.port = this.port.toString();

    const finalPath =
      prefixPath + (this.path.startsWith("/") ? this.path : `/${this.path}`);
    url.pathname = finalPath.replace(/\/+/g, "/");

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

  private isPlainObject(value: unknown): value is Record<string, any> {
    if (typeof value !== "object" || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * @ru Устанавливает путь запроса.
   * @en Sets the request path.
   * @param path - New path (normalized).
   * @returns This request instance for chaining.
   */
  setPath(path: string): this {
    this.path = this.normalizePath(path);
    return this;
  }

  /**
   * @ru Устанавливает хост запроса.
   * @en Sets the request host.
   * @param host - Hostname.
   * @returns This request instance for chaining.
   */
  setHost(host: string): this {
    this.host = host;
    return this;
  }

  /**
   * @ru Заменяет все заголовки запроса.
   * @en Replaces all request headers.
   * @param headers - New headers object.
   * @returns This request instance for chaining.
   */
  setHeaders(headers: RequestHeaders): this {
    this._headers = { ...headers };
    return this;
  }

  /**
   * @ru Добавляет заголовки к существующим (мерж).
   * @en Adds headers to existing ones (merge).
   * @param headers - Headers to add.
   * @returns This request instance for chaining.
   */
  addHeaders(headers: RequestHeaders): this {
    this._headers = { ...this._headers, ...headers };
    return this;
  }

  /**
   * @ru Возвращает текущие параметры запроса.
   * @en Returns current query parameters.
   * @returns Query object.
   */
  getQuery(): RequestQuery {
    return this.query;
  }

  /**
   * @ru Заменяет все параметры запроса.
   * @en Replaces all query parameters.
   * @param query - New query object.
   * @returns This request instance for chaining.
   */
  setQuery(query: RequestQuery): this {
    this.query = { ...query };
    return this;
  }

  /**
   * @ru Добавляет параметры запроса (мерж).
   * @en Adds query parameters (merge).
   * @param query - Query parameters to add.
   * @returns This request instance for chaining.
   */
  addQuery(query: RequestQuery): this {
    this.query = { ...this.query, ...query };
    return this;
  }

  /**
   * @ru Возвращает параметры запроса в виде строки с префиксом '?' (если они не пусты).
   * @en Returns query parameters as a string with leading '?' (if non-empty).
   * @returns Query string or empty string.
   */
  getQueryAsString(): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(this.query)) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  /**
   * @ru Возвращает тело запроса в виде строки (JSON или URL-кодированное, в зависимости от bodyType).
   * @en Returns request body as a string (JSON or URL-encoded, depending on bodyType).
   * @returns String representation of the body.
   */
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

  /**
   * @ru Преобразует запрос в объект RequestInit для использования с fetch.
   * @en Converts the request to a RequestInit object for use with fetch.
   * @returns Fetch-compatible request init object.
   */
  toFetchInit(): RequestInit {
    const body = this.getBodyDataString();

    return {
      method: this.method,
      headers: this._headers as Record<string, string>,
      body: body || undefined,
      signal: this._signal,
    };
  }

  /**
   * @ru Устанавливает тело запроса.
   * @en Sets the request body.
   * @param bodyData - Body data.
   * @returns This request instance for chaining.
   */
  setBodyData(bodyData: RequestBodyData): this {
    this._bodyData = this.isPlainObject(bodyData) ? { ...bodyData } : bodyData;
    return this;
  }

  /**
   * @ru Добавляет данные к телу запроса (мерж для объектов, иначе заменяет).
   * @en Adds data to the request body (merges for objects, otherwise replaces).
   * @param bodyData - Body data to add.
   * @returns This request instance for chaining.
   */
  addBodyData(bodyData: RequestBodyData): this {
    if (this.isPlainObject(this._bodyData) && this.isPlainObject(bodyData)) {
      this._bodyData = { ...this._bodyData, ...bodyData };
    } else {
      // Fallback if either is a primitive, stream, or buffer
      this._bodyData = bodyData;
    }
    return this;
  }

  /**
   * @ru Устанавливает тип тела запроса ('json' или 'form').
   * @en Sets the request body type ('json' or 'form').
   * @param type - Body type.
   * @returns This request instance for chaining.
   */
  setBodyType(type: "json" | "form"): this {
    this.bodyType = type;
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP.
   * @en Sets the HTTP method.
   * @param method - HTTP method (e.g., 'GET', 'POST').
   * @returns This request instance for chaining.
   */
  setMethod(method: string): this {
    this.method = method;
    return this;
  }

  /**
   * @ru Устанавливает сигнал отмены запроса.
   * @en Sets the abort signal for the request.
   * @param signal - AbortSignal instance.
   * @returns This request instance for chaining.
   */
  setSignal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  /**
   * @ru Возвращает полный URL (алиас для геттера url).
   * @en Returns the full URL (alias for url getter).
   * @returns URL string.
   */
  getURL(): string {
    return this.url;
  }

  /**
   * @ru Возвращает заголовки запроса.
   * @en Returns request headers.
   * @returns Headers object.
   */
  getHeaders(): RequestHeaders {
    return this.headers;
  }

  /**
   * @ru Возвращает тело запроса.
   * @en Returns request body.
   * @returns Body data.
   */
  getBodyData(): RequestBodyData {
    return this.body;
  }

  /**
   * @ru Возвращает сигнал отмены.
   * @en Returns the abort signal.
   * @returns AbortSignal or undefined.
   */
  getSignal(): AbortSignal | undefined {
    return this.signal;
  }

  /**
   * @ru Создаёт глубокую копию текущего запроса.
   * @en Creates a deep copy of the current request.
   * @returns Cloned request.
   */
  clone(): Request {
    const req = new Request({
      scheme: this.scheme,
      host: this.host,
      port: this.port,
      path: this.path || "",
      headers: { ...this._headers },
      query: { ...this.query },
      bodyData: this.isPlainObject(this._bodyData)
        ? { ...this._bodyData }
        : this._bodyData,
      meta: { ...this._meta },
    })
      .setMethod(this.method)
      .setBodyType(this.bodyType);

    if (this._signal) req.setSignal(this._signal);

    return req;
  }

  /**
   * @ru Создаёт новый запрос на основе текущего, добавляя указанные параметры запроса.
   * @en Creates a new request based on the current one, adding specified query parameters.
   * @param query - Additional query parameters.
   * @returns New request instance.
   */
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
 * @ru PreparedRequest исправно наследует измененное свойство. Создаёт запрос из базового URL.
 * @en PreparedRequest correctly inherits changed properties. Creates a request from a base URL.
 */
export class PreparedRequest extends Request {
  /**
   * @ru Создаёт экземпляр PreparedRequest на основе базового URL.
   * @en Creates a PreparedRequest instance from a base URL.
   * @param baseUrl - Base URL string.
   */
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
