import type { Method, RequestQuery } from "@hyperttp/types";
import { HyperClient } from "../Client/HyperClient.js";
/**
 * @ru Строитель запросов для удобного создания и настройки HTTP запросов.
 * @en Request builder for convenient creation and configuration of HTTP requests.
 */
export declare class RequestBuilder {
    private _url;
    private _method;
    private _headers;
    private _body?;
    private _responseType;
    private _client;
    private _signal?;
    private _queryParams;
    /**
     * @ru Создаёт экземпляр построителя запросов.
     * @en Creates a request builder instance.
     * @param url - Base URL for the request.
     * @param client - HyperClient instance used to execute the request.
     */
    constructor(url: string, client: HyperClient);
    /**
     * @ru Устанавливает HTTP метод.
     * @en Sets the HTTP method.
     * @param method - HTTP method (GET, POST, etc.).
     * @returns This builder instance for chaining.
     */
    method(method: Method): this;
    /**
     * @ru Добавляет заголовки к запросу (мержит с существующими).
     * @en Adds headers to the request (merges with existing ones).
     * @param headers - Headers object to merge.
     * @returns This builder instance for chaining.
     */
    headers(headers: Record<string, string>): this;
    /**
     * @ru Устанавливает тело запроса (произвольные данные).
     * @en Sets the request body (arbitrary data).
     * @param bodyData - Request body data.
     * @returns This builder instance for chaining.
     */
    body(bodyData: unknown): this;
    /**
     * @ru Устанавливает тело запроса в формате JSON и автоматически добавляет заголовок Content-Type: application/json.
     * @en Sets the request body as JSON and automatically adds Content-Type: application/json header.
     * @param body - JSON-serializable body.
     * @returns This builder instance for chaining.
     */
    jsonBody(body: unknown): this;
    /**
     * @ru Добавляет параметры запроса (query string). Мержит с существующими.
     * @en Adds query parameters to the URL (query string). Merges with existing ones.
     * @param params - Object with query parameters (keys and values).
     * @returns This builder instance for chaining.
     */
    query(params: RequestQuery): this;
    /**
     * @ru Устанавливает метод HTTP в GET.
     * @en Sets HTTP method to GET.
     * @returns This builder instance for chaining.
     */
    get(): this;
    /**
     * @ru Устанавливает метод HTTP в POST.
     * @en Sets HTTP method to POST.
     * @returns This builder instance for chaining.
     */
    post(): this;
    /**
     * @ru Устанавливает метод HTTP в PUT.
     * @en Sets HTTP method to PUT.
     * @returns This builder instance for chaining.
     */
    put(): this;
    /**
     * @ru Устанавливает метод HTTP в PATCH.
     * @en Sets HTTP method to PATCH.
     * @returns This builder instance for chaining.
     */
    patch(): this;
    /**
     * @ru Устанавливает метод HTTP в DELETE.
     * @en Sets HTTP method to DELETE.
     * @returns This builder instance for chaining.
     */
    delete(): this;
    /**
     * @ru Устанавливает метод HTTP в HEAD.
     * @en Sets HTTP method to HEAD.
     * @returns This builder instance for chaining.
     */
    head(): this;
    /**
     * @ru Устанавливает метод HTTP в OPTIONS.
     * @en Sets HTTP method to OPTIONS.
     * @returns This builder instance for chaining.
     */
    options(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в JSON (по умолчанию).
     * @en Sets expected response type to JSON (default).
     * @returns This builder instance for chaining.
     */
    json(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в текст (string).
     * @en Sets expected response type to text (string).
     * @returns This builder instance for chaining.
     */
    text(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в XML.
     * @en Sets expected response type to XML.
     * @returns This builder instance for chaining.
     */
    xml(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в HTML.
     * @en Sets expected response type to HTML.
     * @returns This builder instance for chaining.
     */
    html(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в буфер (Buffer / Uint8Array).
     * @en Sets expected response type to buffer (Buffer / Uint8Array).
     * @returns This builder instance for chaining.
     */
    buffer(): this;
    /**
     * @ru Устанавливает ожидаемый тип ответа в поток (ReadableStream).
     * @en Sets expected response type to stream (ReadableStream).
     * @returns This builder instance for chaining.
     */
    stream(): this;
    /**
     * @ru Устанавливает сигнал для отмены запроса (AbortSignal).
     * @en Sets an abort signal for the request.
     * @param signal - AbortSignal instance.
     * @returns This builder instance for chaining.
     */
    signal(signal: AbortSignal): this;
    /**
     * @ru Устанавливает таймаут запроса в миллисекундах. Создаёт AbortSignal.timeout.
     * @en Sets a request timeout in milliseconds. Creates an AbortSignal.timeout.
     * @param ms - Timeout in milliseconds.
     * @returns This builder instance for chaining.
     */
    timeout(ms: number): this;
    /**
     * @ru Создаёт копию текущего builder'а.
     * @en Creates a clone of the current builder.
     * @returns New RequestBuilder instance with the same configuration.
     */
    clone(): RequestBuilder;
    /**
     * @ru Формирует объект запроса RequestInterface из текущих настроек.
     * @en Builds a RequestInterface object from current settings.
     * @returns RequestInterface ready for dispatching.
     */
    private toRequest;
    /**
     * @ru Выполняет запрос с текущими настройками и возвращает Promise с результатом.
     * @en Executes the request with current settings and returns a Promise with the result.
     * @template T - Expected response type.
     * @returns Promise resolving to the response (type depends on responseType).
     */
    send<T = unknown>(): Promise<T>;
}
//# sourceMappingURL=RequestBuilder.d.ts.map