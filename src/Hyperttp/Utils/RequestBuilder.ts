import type { Method, RequestInterface, ResponseType } from "@hyperttp/types";
import { HyperClient } from "../Client/HyperClient.js";

/**
 * @ru Строитель запросов для удобного создания и настройки HTTP запросов.
 * @en Request builder for convenient creation and configuration of HTTP requests.
 */
export class RequestBuilder {
  private _url: string;
  private _method: Method = "GET";
  private _headers: Record<string, string> = {};
  private _body?: unknown;
  private _responseType: ResponseType = "json";
  private _client: HyperClient;
  private _signal?: AbortSignal;
  private _queryParams?: Record<string, string | number | boolean>;

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
  jsonBody<B>(body: B): this {
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
  query(params: Record<string, string | number | boolean>): this {
    if (!this._queryParams) {
      this._queryParams = {};
    }

    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        this._queryParams[key] = params[key]!;
      }
    }
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
   * @ru Устанавливает ожидаемый тип ответа в JSON (по умолчанию).
   * @en Sets expected response type to JSON (default).
   * @returns This builder instance for chaining.
   */
  json(): this {
    this._responseType = "json";
    return this;
  }

  /**
   * @ru Устанавливает ожидаемый тип ответа в текст (string).
   * @en Sets expected response type to text (string).
   * @returns This builder instance for chaining.
   */
  text(): this {
    this._responseType = "text";
    return this;
  }

  /**
   * @ru Устанавливает ожидаемый тип ответа в XML (как текст).
   * @en Sets expected response type to XML (as text).
   * @returns This builder instance for chaining.
   */
  xml(): this {
    this._responseType = "xml" as ResponseType;
    return this;
  }

  /**
   * @ru Устанавливает ожидаемый тип ответа в буфер (Buffer / Uint8Array).
   * @en Sets expected response type to buffer (Buffer / Uint8Array).
   * @returns This builder instance for chaining.
   */
  buffer(): this {
    this._responseType = "buffer";
    return this;
  }

  /**
   * @ru Устанавливает ожидаемый тип ответа в поток (ReadableStream).
   * @en Sets expected response type to stream (ReadableStream).
   * @returns This builder instance for chaining.
   */
  stream(): this {
    this._responseType = "stream";
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
    this._signal = AbortSignal.timeout(ms);
    return this;
  }

  /**
   * @ru Формирует объект запроса RequestInterface из текущих настроек.
   * @en Builds a RequestInterface object from current settings.
   * @returns RequestInterface ready for dispatching.
   */
  private toRequest(): RequestInterface {
    let finalUrl = this._url;

    if (this._queryParams) {
      const urlObj = new URL(this._url);
      const qp = this._queryParams;

      for (const k in qp) {
        if (Object.prototype.hasOwnProperty.call(qp, k)) {
          urlObj.searchParams.set(k, String(qp[k]));
        }
      }
      finalUrl = urlObj.toString();
    }

    return {
      url: finalUrl,
      headers: this._headers,
      body: this._body,
      signal: this._signal,
      meta: { responseType: this._responseType },
    };
  }

  /**
   * @ru Выполняет запрос с текущими настройками и возвращает Promise с результатом.
   * @en Executes the request with current settings and returns a Promise with the result.
   * @returns Promise resolving to the response (type depends on responseType).
   */
  send<T = any>(): Promise<T> {
    const req = this.toRequest();
    const responseType = this._responseType;
    const signal = this._signal;

    if (responseType === "stream") {
      return this._client.stream(req, signal) as Promise<T>;
    }

    switch (this._method) {
      case "GET":
        return this._client.get<T>(req, responseType, signal);
      case "POST":
        return this._client.post<T>(req, responseType, this._body, signal);
      case "PUT":
        return this._client.put<T>(req, responseType, this._body, signal);
      case "PATCH":
        return this._client.patch<T>(req, responseType, this._body, signal);
      case "DELETE":
        return this._client.delete<T>(req, responseType, signal);
      case "OPTIONS":
        return this._client.options<T>(req, responseType, this._body, signal);
      case "HEAD":
        return this._client.head(
          req,
          responseType,
          signal,
        ) as unknown as Promise<T>;
      default:
        return this._client.get<T>(req, responseType, signal);
    }
  }
}
