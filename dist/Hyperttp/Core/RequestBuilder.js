"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestBuilder = void 0;
/**
 * @class RequestBuilder
 * @en Fluent request builder for creating HTTP requests with a chainable API.
 * @ru Fluent request builder для создания HTTP-запросов. Позволяет собирать параметры запроса в цепочку.
 * * @example
 * ```ts
 * const user = await client.request('[https://api.example.com/users](https://api.example.com/users)')
 * .post()
 * .jsonBody({ name: 'John' })
 * .headers({ 'X-Custom-Header': 'value' })
 * .send();
 * ```
 */
class RequestBuilder {
    _url;
    _method = "GET";
    _headers = {};
    _body;
    _responseType = "auto";
    _client;
    _signal;
    constructor(url, client) {
        this._url = url;
        this._client = client;
    }
    /**
     * @en Appends multiple headers to the request.
     * @ru Добавляет несколько заголовков к запросу.
     */
    headers(headers) {
        Object.assign(this._headers, headers);
        return this;
    }
    /**
     * @en Sets the request body.
     * @ru Устанавливает тело запроса.
     */
    body(bodyData) {
        this._body = bodyData;
        return this;
    }
    /**
     * @en Sets the body and ensures Content-Type is application/json.
     * @ru Устанавливает тело запроса и заголовок Content-Type: application/json.
     */
    jsonBody(body) {
        this._body = body;
        this._headers["Content-Type"] = "application/json; charset=utf-8";
        return this;
    }
    /**
     * @en Adds URL query parameters.
     * @ru Добавляет параметры запроса в URL (search params).
     */
    query(params) {
        const urlObj = new URL(this._url);
        Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, String(v)));
        this._url = urlObj.toString();
        return this;
    }
    /** @en Set method to POST */
    post() {
        this._method = "POST";
        return this;
    }
    /** @en Set method to PUT */
    put() {
        this._method = "PUT";
        return this;
    }
    /** @en Set method to PATCH */
    patch() {
        this._method = "PATCH";
        return this;
    }
    /** @en Set method to DELETE */
    delete() {
        this._method = "DELETE";
        return this;
    }
    /** @en Set method to HEAD */
    head() {
        this._method = "HEAD";
        return this;
    }
    /** @en Set response type to JSON */
    json() {
        this._responseType = "json";
        return this;
    }
    /** @en Set response type to Plain Text */
    text() {
        this._responseType = "text";
        return this;
    }
    /** @en Set response type to XML */
    xml() {
        this._responseType = "xml";
        return this;
    }
    /** @en Set response type to Buffer */
    buffer() {
        this._responseType = "buffer";
        return this;
    }
    /** @en Set response type to Stream (AsyncIterable) */
    stream() {
        this._responseType = "stream";
        return this;
    }
    /**
     * @en Attaches an external AbortSignal for manual cancellation.
     * @ru Привязывает внешний AbortSignal для ручной отмены запроса.
     */
    signal(signal) {
        this._signal = signal;
        return this;
    }
    /**
     * @en Creates a timeout signal for this specific request.
     * @ru Устанавливает таймаут для конкретно этого запроса.
     */
    timeout(ms) {
        this._signal = AbortSignal.timeout(ms);
        return this;
    }
    /**
     * @en Finalizes and sends the request.
     * @ru Финализирует и отправляет запрос.
     * @returns Promise resolving to the expected type T or StreamResponse.
     */
    async send() {
        const req = {
            getURL: () => this._url,
            getBodyData: () => this._body,
            getHeaders: () => this._headers,
            getSignal: () => this._signal,
        };
        if (this._responseType === "stream") {
            return (await this._client.stream(req));
        }
        switch (this._method) {
            case "POST":
                return this._client.post(req, this._body, this._responseType);
            case "PUT":
                return this._client.put(req, this._body, this._responseType);
            case "PATCH":
                return this._client.patch(req, this._body, this._responseType);
            case "DELETE":
                return this._client.delete(req, this._responseType);
            case "HEAD":
                return (await this._client.head(req));
            default:
                return this._client.get(req, this._responseType);
        }
    }
}
exports.RequestBuilder = RequestBuilder;
//# sourceMappingURL=RequestBuilder.js.map