/**
 * Represents HTTP request headers
 */
export type RequestHeaders = Record<string, string>;
/**
 * Represents URL query parameters
 */
export type RequestQuery = Record<string, string | number | boolean | undefined | null>;
/**
 * Исправлено: Body теперь может быть любым объектом, строкой или Buffer.
 */
export type RequestBodyData = any | null | undefined;
/**
 * Конфигурация для создания запроса
 */
export type RequestConfig = {
    scheme: string;
    host: string;
    port: number;
    path?: string;
    headers?: RequestHeaders;
    query?: RequestQuery;
    bodyData?: RequestBodyData;
};
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
/**
 * Основной интерфейс запроса.
 * Сеттеры помечены как необязательные (?), чтобы простые объекты-заглушки
 * в HttpClient соответствовали этому интерфейсу.
 */
export interface RequestInterface {
    getURL(): string;
    getHeaders(): RequestHeaders;
    getBodyData(): RequestBodyData;
    setPath?(path: string): RequestInterface;
    setHost?(host: string): RequestInterface;
    setHeaders?(headers: RequestHeaders): RequestInterface;
    addHeaders?(headers: RequestHeaders): RequestInterface;
    getQuery?(): RequestQuery;
    setQuery?(query: RequestQuery): RequestInterface;
    addQuery?(query: RequestQuery): RequestInterface;
    getQueryAsString?(): string;
    getBodyDataString?(): string;
    setBodyData?(bodyData: RequestBodyData): RequestInterface;
    addBodyData?(bodyData: RequestBodyData): RequestInterface;
    getURI?(): string;
    setSignal?(signal: AbortSignal): RequestInterface;
    getSignal?(): AbortSignal | undefined;
}
export type ResponseType = "json" | "text" | "buffer" | "xml" | "stream" | "auto";
//# sourceMappingURL=request.d.ts.map