import type { Method, RequestBodyData, RequestConfig, RequestHeaders, RequestInterface, RequestQuery } from "@hyperttp/types";
/**
 * @ru Представляет HTTP-запрос с настраиваемой схемой, хостом, портом, путём, заголовками, параметрами запроса и телом. Предоставляет методы для построения и манипуляции запросом.
 * @en Represents an HTTP request with configurable scheme, host, port, path, headers, query, and body data. Provides methods to build and manipulate the request.
 */
export default class Request implements RequestInterface {
    private scheme;
    private host;
    private port;
    private path;
    private _headers;
    private _bodyData;
    private _signal?;
    method: Method;
    private bodyType;
    private _meta;
    query: RequestQuery;
    /**
     * @ru Создаёт экземпляр Request.
     * @en Creates a Request instance.
     * @param config - Configuration object with scheme, host, port, path, headers, query, bodyData, meta.
     */
    constructor(config: RequestConfig & {
        meta?: Record<string, unknown>;
    });
    /**
     * @ru Полный URL запроса, построенный на основе схемы, хоста, порта, пути и параметров запроса.
     * @en Full request URL built from scheme, host, port, path, and query parameters.
     */
    get url(): string;
    /**
     * @ru Заголовки запроса.
     * @en Request headers.
     */
    get headers(): RequestHeaders;
    /**
     * @ru Тело запроса.
     * @en Request body.
     */
    get body(): RequestBodyData;
    /**
     * @ru Сигнал для отмены запроса (опционально).
     * @en Abort signal for request cancellation (optional).
     */
    get signal(): AbortSignal | undefined;
    /**
     * @ru Мета-данные запроса (произвольные данные).
     * @en Request metadata (arbitrary data).
     */
    get meta(): Record<string, unknown>;
    /**
     * @ru Строит объект URL из текущих параметров.
     * @en Builds a URL object from current parameters.
     * @returns URL instance.
     */
    private buildURL;
    /**
     * @ru Нормализует путь, добавляя ведущий слеш при необходимости.
     * @en Normalizes the path by adding a leading slash if needed.
     * @param path - Raw path string.
     * @returns Normalized path.
     */
    private normalizePath;
    /**
     * @ru Проверяет, является ли значение простым объектом (не массив, не дата, не буфер и т.д.).
     * @en Checks whether a value is a plain object (not array, date, buffer, etc.).
     * @param value - Value to check.
     * @returns True if the value is a plain object.
     */
    private isPlainObject;
    /**
     * @ru Устанавливает путь запроса.
     * @en Sets the request path.
     * @param path - New path (normalized).
     * @returns This request instance for chaining.
     */
    setPath(path: string): this;
    /**
     * @ru Устанавливает хост запроса.
     * @en Sets the request host.
     * @param host - Hostname.
     * @returns This request instance for chaining.
     */
    setHost(host: string): this;
    /**
     * @ru Заменяет все заголовки запроса.
     * @en Replaces all request headers.
     * @param headers - New headers object.
     * @returns This request instance for chaining.
     */
    setHeaders(headers: RequestHeaders): this;
    /**
     * @ru Добавляет заголовки к существующим (мерж).
     * @en Adds headers to existing ones (merge).
     * @param headers - Headers to add.
     * @returns This request instance for chaining.
     */
    addHeaders(headers: RequestHeaders): this;
    /**
     * @ru Возвращает текущие параметры запроса.
     * @en Returns current query parameters.
     * @returns Query object.
     */
    getQuery(): RequestQuery;
    /**
     * @ru Заменяет все параметры запроса.
     * @en Replaces all query parameters.
     * @param query - New query object.
     * @returns This request instance for chaining.
     */
    setQuery(query: RequestQuery): this;
    /**
     * @ru Добавляет параметры запроса (мерж).
     * @en Adds query parameters (merge).
     * @param query - Query parameters to add.
     * @returns This request instance for chaining.
     */
    addQuery(query: RequestQuery): this;
    /**
     * @ru Возвращает параметры запроса в виде строки с префиксом '?' (если они не пусты).
     * @en Returns query parameters as a string with leading '?' (if non-empty).
     * @returns Query string or empty string.
     */
    getQueryAsString(): string;
    /**
     * @ru Возвращает тело запроса в виде строки (JSON или URL-кодированное, в зависимости от bodyType).
     * @en Returns request body as a string (JSON or URL-encoded, depending on bodyType).
     * @returns String representation of the body.
     */
    getBodyDataString(): string;
    /**
     * @ru Преобразует запрос в объект RequestInit для использования с fetch.
     * @en Converts the request to a RequestInit object for use with fetch.
     * @returns Fetch-compatible request init object.
     */
    toFetchInit(): RequestInit;
    /**
     * @ru Устанавливает тело запроса.
     * @en Sets the request body.
     * @param bodyData - Body data.
     * @returns This request instance for chaining.
     */
    setBodyData(bodyData: RequestBodyData): this;
    /**
     * @ru Добавляет данные к телу запроса (мерж для объектов, иначе заменяет).
     * @en Adds data to the request body (merges for objects, otherwise replaces).
     * @param bodyData - Body data to add.
     * @returns This request instance for chaining.
     */
    addBodyData(bodyData: RequestBodyData): this;
    /**
     * @ru Устанавливает тип тела запроса ('json' или 'form').
     * @en Sets the request body type ('json' or 'form').
     * @param type - Body type.
     * @returns This request instance for chaining.
     */
    setBodyType(type: "json" | "form"): this;
    /**
     * @ru Устанавливает метод HTTP.
     * @en Sets the HTTP method.
     * @param method - HTTP method (e.g., 'GET', 'POST').
     * @returns This request instance for chaining.
     */
    setMethod(method: Method): this;
    /**
     * @ru Устанавливает сигнал отмены запроса.
     * @en Sets the abort signal for the request.
     * @param signal - AbortSignal instance.
     * @returns This request instance for chaining.
     */
    setSignal(signal: AbortSignal): this;
    /**
     * @ru Возвращает полный URL (алиас для геттера url).
     * @en Returns the full URL (alias for url getter).
     * @returns URL string.
     */
    getURL(): string;
    /**
     * @ru Возвращает заголовки запроса.
     * @en Returns request headers.
     * @returns Headers object.
     */
    getHeaders(): RequestHeaders;
    /**
     * @ru Возвращает тело запроса.
     * @en Returns request body.
     * @returns Body data.
     */
    getBodyData(): RequestBodyData;
    /**
     * @ru Возвращает сигнал отмены.
     * @en Returns the abort signal.
     * @returns AbortSignal or undefined.
     */
    getSignal(): AbortSignal | undefined;
    /**
     * @ru Создаёт глубокую копию текущего запроса.
     * @en Creates a deep copy of the current request.
     * @returns Cloned request.
     */
    clone(): Request;
    /**
     * @ru Создаёт новый запрос на основе текущего, добавляя указанные параметры запроса.
     * @en Creates a new request based on the current one, adding specified query parameters.
     * @param query - Additional query parameters.
     * @returns New request instance.
     */
    withQuery(query: RequestQuery): Request;
}
/**
 * @ru PreparedRequest исправно наследует измененное свойство. Создаёт запрос из базового URL.
 * @en PreparedRequest correctly inherits changed properties. Creates a request from a base URL.
 */
export declare class PreparedRequest extends Request {
    /**
     * @ru Создаёт экземпляр PreparedRequest на основе базового URL.
     * @en Creates a PreparedRequest instance from a base URL.
     * @param baseUrl - Base URL string.
     */
    constructor(baseUrl: string);
}
//# sourceMappingURL=Request.d.ts.map