import { RequestInterface, ResponseType } from "../../Types";
import HttpClientImproved from "./HttpClientImproved";

let defaultClient: HttpClientImproved | null = null;

/**
 * Fluent request builder for making HTTP requests with a chainable API.
 * Provides a convenient way to build and send HTTP requests with various options.
 *
 * @example
 * ```ts
 * const client = new HttpClientImproved();
 * const response = await client.request('https://api.example.com/data')
 *   .headers({ 'Authorization': 'Bearer token' })
 *   .query({ limit: 10, offset: 0 })
 *   .json()
 *   .send();
 * ```
 */
export class RequestBuilder<T = any> {
  private _url: string;
  private _method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET";
  private _headers: Record<string, string> = {};
  private _body?: any;
  private _responseType: ResponseType = "json";

  /**
   * Creates a new request builder for the specified URL.
   * @param url - The target URL for the request
   */
  constructor(url: string) {
    this._url = url;
  }

  /**
   * Sets HTTP headers for the request.
   * @param headers - Object containing header key-value pairs
   * @returns The builder instance for chaining
   */
  headers(headers: Record<string, string>): this {
    this._headers = headers;
    return this;
  }

  /**
   * Sets the request body data.
   * @param bodyData - The body data to send with the request
   * @returns The builder instance for chaining
   */
  body(bodyData: any): this {
    this._body = bodyData;
    return this;
  }

  /**
   * Sets the response type to JSON.
   * @returns The builder instance for chaining
   */
  json(): this {
    this._responseType = "json";
    return this;
  }

  /**
   * Sets the response type to plain text.
   * @returns The builder instance for chaining
   */
  text(): this {
    this._responseType = "text";
    return this;
  }

  /**
   * Sets the response type to XML.
   * @returns The builder instance for chaining
   */
  xml(): this {
    this._responseType = "xml";
    return this;
  }

  /**
   * Sets the HTTP method to POST.
   * @returns The builder instance for chaining
   */
  post(): this {
    this._method = "POST";
    return this;
  }

  /**
   * @ru Устанавливает потоковый режим ответа.
   * @en Sets streaming response mode.
   */
  stream(): this {
    this._responseType = "stream";
    return this;
  }

  /**
   * Sets the HTTP method to PUT.
   * @returns The builder instance for chaining
   */
  put(): this {
    this._method = "PUT";
    return this;
  }

  /**
   * Sets the HTTP method to PATCH.
   * @returns The builder instance for chaining
   */
  patch(): this {
    this._method = "PATCH";
    return this;
  }

  /**
   * Sets the HTTP method to DELETE.
   * @returns The builder instance for chaining
   */
  delete(): this {
    this._method = "DELETE";
    return this;
  }

  /**
   * Adds query parameters to the URL.
   * @param params - Object containing query parameter key-value pairs
   * @returns The builder instance for chaining
   */
  query(params: Record<string, string | number | boolean>): this {
    const urlObj = new URL(this._url);
    Object.entries(params).forEach(([k, v]) =>
      urlObj.searchParams.set(k, String(v)),
    );
    this._url = urlObj.toString();
    return this;
  }

  /**
   * Sets a JSON body for the request.
   * Automatically sets the Content-Type header to application/json.
   * @param body - The JSON body data
   * @returns The builder instance for chaining
   */
  jsonBody<T>(body: T): this {
    this._body = body;
    this._headers["Content-Type"] = "application/json; charset=utf-8";
    return this;
  }

  /**
   * Sends the HTTP request and returns the response.
   * @returns Promise resolving to the response data
   */
  async send(): Promise<T> {
    const client = defaultClient ?? (defaultClient = new HttpClientImproved());
    const req: RequestInterface = {
      getURL: () => this._url,
      getBodyData: () => this._body,
      getHeaders: () => this._headers,
    };

    switch (this._method) {
      case "GET":
        if (this._responseType === "stream") {
          return client.stream(req) as any;
        }
        return client.get(req, this._responseType);
      case "POST":
        return client.post(req, this._body, this._responseType);
      case "PUT":
        return client.put(req, this._body, this._responseType);
      case "DELETE":
        return client.delete(req, this._responseType);
      case "PATCH":
        return client.patch(req, this._body, this._responseType);
      default:
        if (this._responseType === "stream") {
          return client.stream(req) as any;
        }
        return client.get(req, this._responseType);
    }
  }
}
