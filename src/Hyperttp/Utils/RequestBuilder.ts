import { Method, RequestInterface, ResponseType } from "@hyperttp/core";
import { HyperClient } from "../Client/HyperClient.js";

export class RequestBuilder {
  private _url: string;
  private _method: Method = "GET";
  private _headers: Record<string, string> = {};
  private _body?: unknown;
  private _responseType: ResponseType = "json";
  private _client: HyperClient;
  private _signal?: AbortSignal;

  constructor(url: string, client: HyperClient) {
    this._url = url;
    this._client = client;
  }

  headers(headers: Record<string, string>): this {
    Object.assign(this._headers, headers);
    return this;
  }

  body(bodyData: unknown): this {
    this._body = bodyData;
    return this;
  }

  jsonBody<B>(body: B): this {
    this._body = body;
    this._headers["Content-Type"] = "application/json; charset=utf-8";
    return this;
  }

  query(params: Record<string, string | number | boolean>): this {
    const urlObj = new URL(this._url);
    for (const [k, v] of Object.entries(params)) {
      urlObj.searchParams.set(k, String(v));
    }
    this._url = urlObj.toString();
    return this;
  }

  get(): this {
    this._method = "GET";
    return this;
  }
  post(): this {
    this._method = "POST";
    return this;
  }
  put(): this {
    this._method = "PUT";
    return this;
  }
  patch(): this {
    this._method = "PATCH";
    return this;
  }
  delete(): this {
    this._method = "DELETE";
    return this;
  }
  head(): this {
    this._method = "HEAD";
    return this;
  }
  options(): this {
    this._method = "OPTIONS";
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
    this._responseType = "xml" as ResponseType;
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

  signal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  timeout(ms: number): this {
    this._signal = AbortSignal.timeout(ms);
    return this;
  }

  /**
   * @private
   * Генерирует чистый POJO-объект запроса без аллокации замыканий
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

  async send(): Promise<any> {
    const req = this.toRequest();

    if (this._responseType === "stream") {
      return this._client.stream(req, this._signal);
    }

    switch (this._method) {
      case "GET":
        return this._client.get(req, this._responseType, this._signal);
      case "POST":
        return this._client.post(
          req,
          this._body,
          this._responseType,
          this._signal,
        );
      case "PUT":
        return this._client.put(
          req,
          this._body,
          this._responseType,
          this._signal,
        );
      case "PATCH":
        return this._client.patch(
          req,
          this._body,
          this._responseType,
          this._signal,
        );
      case "DELETE":
        return this._client.delete(req, this._responseType, this._signal);
      case "OPTIONS":
        return this._client.options(
          req,
          this._body,
          this._responseType,
          this._signal,
        );
      case "HEAD":
        return this._client.head(req, this._responseType, this._signal);
      default:
        return this._client.get(req, this._responseType, this._signal);
    }
  }
}
