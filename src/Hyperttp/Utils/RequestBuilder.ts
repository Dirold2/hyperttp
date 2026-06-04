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

  /**
   * @ru Создаёт экземпляр строителя запросов.
   * @en Creates a request builder instance.
   *
   * @param url - Base URL.
   * @param client - HyperClient instance.
   */
  constructor(url: string, client: HyperClient) {
    this._url = url;
    this._client = client;
  }

  /**
   * @ru Добавляет заголовки к запросу.
   * @en Adds headers to the request.
   *
   * @param headers - Headers object.
   * @returns Current builder instance for chaining.
   */
  headers(headers: Record<string, string>): this {
    Object.assign(this._headers, headers);
    return this;
  }

  /**
   * @ru Устанавливает тело запроса.
   * @en Sets request body.
   *
   * @param bodyData - Request body data.
   * @returns Current builder instance for chaining.
   */
  body(bodyData: unknown): this {
    this._body = bodyData;
    return this;
  }

  /**
   * @ru Устанавливает JSON тело и автоматически добавляет Content-Type заголовок.
   * @en Sets JSON body and automatically adds Content-Type header.
   *
   * @typeParam B - Body type.
   * @param body - JSON body data.
   * @returns Current builder instance for chaining.
   */
  jsonBody<B>(body: B): this {
    this._body = body;
    this._headers["Content-Type"] = "application/json; charset=utf-8";
    return this;
  }

  /**
   * @ru Добавляет query параметры к URL.
   * @en Adds query parameters to the URL.
   *
   * @param params - Query parameters object.
   * @returns Current builder instance for chaining.
   */
  query(params: Record<string, string | number | boolean>): this {
    const urlObj = new URL(this._url);
    for (const [k, v] of Object.entries(params)) {
      urlObj.searchParams.set(k, String(v));
    }
    this._url = urlObj.toString();
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на GET.
   * @en Sets request method to GET.
   *
   * @returns Current builder instance for chaining.
   */
  get(): this {
    this._method = "GET";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на POST.
   * @en Sets request method to POST.
   *
   * @returns Current builder instance for chaining.
   */
  post(): this {
    this._method = "POST";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на PUT.
   * @en Sets request method to PUT.
   *
   * @returns Current builder instance for chaining.
   */
  put(): this {
    this._method = "PUT";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на PATCH.
   * @en Sets request method to PATCH.
   *
   * @returns Current builder instance for chaining.
   */
  patch(): this {
    this._method = "PATCH";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на DELETE.
   * @en Sets request method to DELETE.
   *
   * @returns Current builder instance for chaining.
   */
  delete(): this {
    this._method = "DELETE";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на HEAD.
   * @en Sets request method to HEAD.
   *
   * @returns Current builder instance for chaining.
   */
  head(): this {
    this._method = "HEAD";
    return this;
  }

  /**
   * @ru Устанавливает метод запроса на OPTIONS.
   * @en Sets request method to OPTIONS.
   *
   * @returns Current builder instance for chaining.
   */
  options(): this {
    this._method = "OPTIONS";
    return this;
  }

  /**
   * @ru Устанавливает тип ответа на JSON.
   * @en Sets response type to JSON.
   *
   * @returns Current builder instance for chaining.
   */
  json(): this {
    this._responseType = "json";
    return this;
  }

  /**
   * @ru Устанавливает тип ответа на текст.
   * @en Sets response type to text.
   *
   * @returns Current builder instance for chaining.
   */
  text(): this {
    this._responseType = "text";
    return this;
  }

  /**
   * @ru Устанавливает тип ответа на XML.
   * @en Sets response type to XML.
   *
   * @returns Current builder instance for chaining.
   */
  xml(): this {
    this._responseType = "xml" as ResponseType;
    return this;
  }

  /**
   * @ru Устанавливает тип ответа на буфер.
   * @en Sets response type to buffer.
   *
   * @returns Current builder instance for chaining.
   */
  buffer(): this {
    this._responseType = "buffer";
    return this;
  }

  /**
   * @ru Устанавливает тип ответа на поток.
   * @en Sets response type to stream.
   *
   * @returns Current builder instance for chaining.
   */
  stream(): this {
    this._responseType = "stream";
    return this;
  }

  /**
   * @ru Устанавливает AbortSignal для отмены запроса.
   * @en Sets AbortSignal for request cancellation.
   *
   * @param signal - AbortSignal instance.
   * @returns Current builder instance for chaining.
   */
  signal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  /**
   * @ru Устанавливает таймаут для запроса.
   * @en Sets timeout for the request.
   *
   * @param ms - Timeout in milliseconds.
   * @returns Current builder instance for chaining.
   */
  timeout(ms: number): this {
    this._signal = AbortSignal.timeout(ms);
    return this;
  }

  /**
   * @ru Преобразует текущее состояние строителя в объект запроса.
   * @en Converts current builder state to request object.
   *
   * @private
   * @returns Request interface object.
   */
  private toRequest(): RequestInterface {
    return {
      url: this._url,
      headers: this._headers,
      body: this._body,
      signal: this._signal,
      meta: { responseType: this._responseType },
    };
  }

  /**
   * @ru Отправляет сконфигурированный запрос.
   * @en Sends the configured request.
   *
   * @typeParam T - Return data type.
   * @returns Promise with response data or stream response.
   */
  async send<T = any>(): Promise<T> {
    const req = this.toRequest();

    if (this._responseType === "stream") {
      return this._client.stream(req, this._signal) as Promise<T>;
    }

    switch (this._method) {
      case "GET":
        return this._client.get(
          req,
          this._responseType,
          this._signal,
        ) as Promise<T>;
      case "POST":
        return this._client.post(
          req,
          this._responseType,
          this._body,
          this._signal,
        ) as Promise<T>;
      case "PUT":
        return this._client.put(
          req,
          this._responseType,
          this._body,
          this._signal,
        ) as Promise<T>;
      case "PATCH":
        return this._client.patch(
          req,
          this._responseType,
          this._body,
          this._signal,
        ) as Promise<T>;
      case "DELETE":
        return this._client.delete(
          req,
          this._responseType,
          this._signal,
        ) as Promise<T>;
      case "OPTIONS":
        return this._client.options(
          req,
          this._responseType,
          this._body,
          this._signal,
        ) as Promise<T>;
      case "HEAD":
        return this._client.head(
          req,
          this._responseType,
          this._signal,
        ) as Promise<T>;
      default:
        return this._client.get(
          req,
          this._responseType,
          this._signal,
        ) as Promise<T>;
    }
  }
}
