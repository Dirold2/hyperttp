import type { HttpMethod, RestRequestOptions } from "@hyperttp/core/rest";
import { HyperClient } from "../Client/HyperClient.js";
import { appendQueryToUrl, type RequestQuery } from "./query.js";

export type ResponseType = "json" | "text" | "xml" | "html" | "buffer" | "stream";

/**
 * @ru Строитель запросов для удобного создания и настройки HTTP запросов.
 * @en Request builder for convenient creation and configuration of HTTP requests.
 */
export class RequestBuilder {
  private _url: string;
  private _method: HttpMethod = "GET";
  private _headers: Record<string, string> = {};
  private _body?: unknown;
  private _client: HyperClient;
  private _signal?: AbortSignal;
  private _queryParams: RequestQuery = {};
  private _timeout?: number;
  private _responseType?: ResponseType;

  /**
   * @ru Создаёт экземпляр построителя запросов.
   * @en Creates a request builder instance.
   * @param url - Base URL for the request.
   * @param client - HyperClient instance used to execute the request.
   */
  constructor(url: string, client: HyperClient) {
    this._url = url;
    this._client = client;
  }

  /**
   * @ru Устанавливает HTTP метод.
   * @en Sets the HTTP method.
   * @param method - HTTP method (GET, POST, etc.).
   * @returns This builder instance for chaining.
   */
  method(method: HttpMethod): this {
    this._method = method;
    return this;
  }

  /**
   * @ru Добавляет заголовки к запросу (мержит с существующими).
   * @en Adds headers to the request (merges with existing ones).
   * @param headers - Headers object to merge.
   * @returns This builder instance for chaining.
   */
  headers(headers: Record<string, string>): this {
    Object.assign(this._headers, headers);
    return this;
  }

  /**
   * @ru Устанавливает тело запроса (произвольные данные).
   * @en Sets the request body (arbitrary data).
   * @param bodyData - Request body data.
   * @returns This builder instance for chaining.
   */
  body(bodyData: unknown): this {
    this._body = bodyData;
    return this;
  }

  /**
   * @ru Устанавливает тело запроса в формате JSON и автоматически добавляет заголовок Content-Type: application/json.
   * @en Sets the request body as JSON and automatically adds Content-Type: application/json header.
   * @param body - JSON-serializable body.
   * @returns This builder instance for chaining.
   */
  jsonBody(body: unknown): this {
    this._body = body;
    this._headers["Content-Type"] = "application/json; charset=utf-8";
    return this;
  }

  /**
   * @ru Добавляет параметры запроса (query string). Мержит с существующими.
   * @en Adds query parameters to the URL (query string). Merges with existing ones.
   * @param params - Object with query parameters (keys and values).
   * @returns This builder instance for chaining.
   */
  query(params: RequestQuery): this {
    Object.assign(this._queryParams, params);
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в GET.
   * @en Sets HTTP method to GET.
   * @returns This builder instance for chaining.
   */
  get(): this {
    this._method = "GET";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в POST.
   * @en Sets HTTP method to POST.
   * @returns This builder instance for chaining.
   */
  post(): this {
    this._method = "POST";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в PUT.
   * @en Sets HTTP method to PUT.
   * @returns This builder instance for chaining.
   */
  put(): this {
    this._method = "PUT";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в PATCH.
   * @en Sets HTTP method to PATCH.
   * @returns This builder instance for chaining.
   */
  patch(): this {
    this._method = "PATCH";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в DELETE.
   * @en Sets HTTP method to DELETE.
   * @returns This builder instance for chaining.
   */
  delete(): this {
    this._method = "DELETE";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в HEAD.
   * @en Sets HTTP method to HEAD.
   * @returns This builder instance for chaining.
   */
  head(): this {
    this._method = "HEAD";
    return this;
  }

  /**
   * @ru Устанавливает метод HTTP в OPTIONS.
   * @en Sets HTTP method to OPTIONS.
   * @returns This builder instance for chaining.
   */
  options(): this {
    this._method = "OPTIONS";
    return this;
  }

  /**
   * @ru Устанавливает сигнал для отмены запроса (AbortSignal).
   * @en Sets an abort signal for the request.
   * @param signal - AbortSignal instance.
   * @returns This builder instance for chaining.
   */
  signal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  /**
   * @ru Устанавливает таймаут запроса в миллисекундах. Создаёт AbortSignal.timeout.
   * @en Sets a request timeout in milliseconds. Creates an AbortSignal.timeout.
   * @param ms - Timeout in milliseconds.
   * @returns This builder instance for chaining.
   */
  timeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  json(): this {
    this._responseType = "json";
    return this;
  }

  text(): this {
    this._responseType = "text";
    return this;
  }

  xml(): this {
    this._responseType = "xml";
    return this;
  }

  html(): this {
    this._responseType = "html";
    return this;
  }

  buffer(): this {
    this._responseType = "buffer";
    return this;
  }

  stream(): this {
    this._responseType = "stream";
    return this;
  }

  /**
   * @ru Создаёт копию текущего builder'а.
   * @en Creates a clone of the current builder.
   * @returns New RequestBuilder instance with the same configuration.
   */
  clone(): RequestBuilder {
    const cloned = new RequestBuilder(this._url, this._client);
    cloned._method = this._method;
    cloned._headers = { ...this._headers };
    cloned._body = this._body;
    cloned._signal = this._signal;
    cloned._queryParams = { ...this._queryParams };
    cloned._timeout = this._timeout;
    cloned._responseType = this._responseType;
    return cloned;
  }

  /**
   * @ru Формирует URL с учётом параметров запроса.
   * @en Builds the URL with query parameters applied.
   * @returns The final URL string.
   */
  private buildUrl(): string {
    if (Object.keys(this._queryParams).length > 0) {
      return appendQueryToUrl(this._url, this._queryParams);
    }
    return this._url;
  }

  /**
   * @ru Формирует опции запроса из текущих настроек.
   * @en Builds request options from current settings.
   * @returns RestRequestOptions ready for dispatching.
   */
  private toOptions(): RestRequestOptions {
    const opts: RestRequestOptions = {};
    if (Object.keys(this._headers).length > 0) opts.headers = this._headers;
    if (this._body !== undefined) opts.body = this._body;
    if (this._timeout !== undefined) opts.timeout = this._timeout;
    return opts;
  }

  /**
   * @ru Выполняет запрос с текущими настройками и возвращает Promise с результатом.
   * @en Executes the request with current settings and returns a Promise with the result.
   * @template T - Expected response type.
   * @returns Promise resolving to the response (type depends on responseType).
   */
  send<T = unknown>(): Promise<T> {
    const url = this.buildUrl();
    const opts = this.toOptions();

    if (this._method === "HEAD") {
      return this._client.head(url, opts, this._signal) as unknown as Promise<T>;
    }

    const m = this._method;
    const hasBody = m === "POST" || m === "PUT" || m === "PATCH" || m === "OPTIONS";

    return this._client._execute<T>(
      this._method,
      url,
      hasBody ? { ...opts, body: this._body } : opts,
      this._signal,
      this._responseType ? { responseType: this._responseType } : undefined,
    );
  }
}
