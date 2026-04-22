import { StreamResponse } from "../../Types";
import HttpClientImproved from "./HttpClientImproved";
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
export declare class RequestBuilder<T = any> {
    private _url;
    private _method;
    private _headers;
    private _body?;
    private _responseType;
    private _client?;
    private _signal?;
    /**
     * Creates a new request builder for the specified URL.
     * @param url - The target URL for the request
     */
    constructor(url: string, client?: HttpClientImproved);
    /**
     * Sets HTTP headers for the request.
     * @param headers - Object containing header key-value pairs
     * @returns The builder instance for chaining
     */
    headers(headers: Record<string, string>): this;
    /**
     * Sets the request body data.
     * @param bodyData - The body data to send with the request
     * @returns The builder instance for chaining
     */
    body(bodyData: any): this;
    /**
     * Sets the response type to JSON.
     * @returns The builder instance for chaining
     */
    json(): this;
    /**
     * Sets the response type to plain text.
     * @returns The builder instance for chaining
     */
    text(): this;
    /**
     * Sets the response type to XML.
     * @returns The builder instance for chaining
     */
    xml(): this;
    /**
     * Sets the HTTP method to POST.
     * @returns The builder instance for chaining
     */
    post(): this;
    /**
     * @ru Выполняет запрос в режиме потока.
     * @en Executes the request in streaming mode.
     */
    stream(): Promise<StreamResponse>;
    /**
     * Sets the HTTP method to PUT.
     * @returns The builder instance for chaining
     */
    put(): this;
    /**
     * Sets the HTTP method to PATCH.
     * @returns The builder instance for chaining
     */
    patch(): this;
    /**
     * Sets the HTTP method to DELETE.
     * @returns The builder instance for chaining
     */
    delete(): this;
    /**
     * Adds query parameters to the URL.
     * @param params - Object containing query parameter key-value pairs
     * @returns The builder instance for chaining
     */
    query(params: Record<string, string | number | boolean>): this;
    /**
     * Sets a JSON body for the request.
     * Automatically sets the Content-Type header to application/json.
     * @param body - The JSON body data
     * @returns The builder instance for chaining
     */
    jsonBody<T>(body: T): this;
    /**
     * @ru Устанавливает AbortSignal для отмены запроса.
     */
    signal(signal: AbortSignal): this;
    /**
     * @ru Устанавливает специфичный таймаут для этого запроса.
     */
    timeout(ms: number): this;
    /**
     * Sends the HTTP request and returns the response.
     * @returns Promise resolving to the response data
     */
    send(): Promise<T>;
    private ensureClient;
}
//# sourceMappingURL=RequestBuilder.d.ts.map