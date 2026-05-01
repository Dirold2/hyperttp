import HttpClientImproved from "./HttpClientImproved";
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
export declare class RequestBuilder<T = any> {
    private _url;
    private _method;
    private _headers;
    private _body?;
    private _responseType;
    private _client;
    private _signal?;
    constructor(url: string, client: HttpClientImproved);
    /**
     * @en Appends multiple headers to the request.
     * @ru Добавляет несколько заголовков к запросу.
     */
    headers(headers: Record<string, string>): this;
    /**
     * @en Sets the request body.
     * @ru Устанавливает тело запроса.
     */
    body(bodyData: any): this;
    /**
     * @en Sets the body and ensures Content-Type is application/json.
     * @ru Устанавливает тело запроса и заголовок Content-Type: application/json.
     */
    jsonBody<B>(body: B): this;
    /**
     * @en Adds URL query parameters.
     * @ru Добавляет параметры запроса в URL (search params).
     */
    query(params: Record<string, string | number | boolean>): this;
    /** @en Set method to POST */
    post(): this;
    /** @en Set method to PUT */
    put(): this;
    /** @en Set method to PATCH */
    patch(): this;
    /** @en Set method to DELETE */
    delete(): this;
    /** @en Set method to HEAD */
    head(): this;
    /** @en Set response type to JSON */
    json(): this;
    /** @en Set response type to Plain Text */
    text(): this;
    /** @en Set response type to XML */
    xml(): this;
    /** @en Set response type to Buffer */
    buffer(): this;
    /** @en Set response type to Stream (AsyncIterable) */
    stream(): this;
    /**
     * @en Attaches an external AbortSignal for manual cancellation.
     * @ru Привязывает внешний AbortSignal для ручной отмены запроса.
     */
    signal(signal: AbortSignal): this;
    /**
     * @en Creates a timeout signal for this specific request.
     * @ru Устанавливает таймаут для конкретно этого запроса.
     */
    timeout(ms: number): this;
    /**
     * @en Finalizes and sends the request.
     * @ru Финализирует и отправляет запрос.
     * @returns Promise resolving to the expected type T or StreamResponse.
     */
    send(): Promise<T>;
}
//# sourceMappingURL=RequestBuilder.d.ts.map