import { RequestBuilder } from "./RequestBuilder.js";
import type { HttpClientInterface, HttpClientOptions, RequestInterface, RequestMetrics, ResponseType, StreamResponse } from "../../Types/index.js";
/**
 * @class HttpClientImproved
 * @en High-performance HTTP client with built-in caching, queuing, rate limiting, and metrics.
 * @ru Высокопроизводительный HTTP-клиент со встроенным кэшированием, очередями, лимитами и метриками.
 */
export default class HttpClientImproved implements HttpClientInterface {
    private agent;
    private options;
    private cache?;
    private queue?;
    private limiter?;
    private metricsManager;
    private interceptors;
    private transformer;
    private executor;
    /**
     * @en Internal map to track active requests for deduplication and cancellation.
     * @ru Внутренняя карта для отслеживания активных запросов (дедупликация и отмена).
     */
    private inflight;
    private defaultHeaders;
    constructor(options?: HttpClientOptions);
    /**
     * @en Core internal method for handling all HTTP requests.
     * @ru Основной внутренний метод для обработки всех HTTP-запросов.
     * @param method HTTP method (GET, POST, etc.)
     * @param req Request object
     * @param useCache Whether to use caching for this request
     * @param responseType Expected response format
     */
    private requestInternal;
    /**
     * @en Performs an HTTP GET request.
     * @ru Выполняет HTTP GET запрос.
     * @param req Request URL or Request object
     * @param responseType Expected response format
     */
    get<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * @en Performs an HTTP POST request.
     * @ru Выполняет HTTP POST запрос.
     * @param req Request URL or Request object
     * @param body Request body data
     * @param responseType Expected response format
     */
    post<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * @en Performs an HTTP PUT request.
     * @ru Выполняет HTTP PUT запрос.
     */
    put<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * @en Performs an HTTP DELETE request.
     * @ru Выполняет HTTP DELETE запрос.
     */
    delete<T = any>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    /**
     * @en Performs an HTTP PATCH request.
     * @ru Выполняет HTTP PATCH запрос.
     */
    patch<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * @en Creates a RequestBuilder for a fluent API approach.
     * @ru Создает RequestBuilder для использования Fluent API.
     * @example client.request('url').get().send();
     */
    request<T = any>(url: string): RequestBuilder<T>;
    /**
     * @en Releases all resources, aborts active requests, and closes connections.
     * @ru Освобождает ресурсы клиента, отменяет активные запросы и закрывает соединения.
     */
    destroy(): Promise<void>;
    /**
     * @en Performs an HTTP HEAD request.
     * @ru Выполняет HTTP HEAD запрос.
     */
    head(req: RequestInterface | string): Promise<{
        status: number;
        headers: Record<string, any>;
    }>;
    /**
     * @en Executes a request and returns an AsyncIterable stream.
     * @ru Выполняет запрос и возвращает итерируемый поток данных.
     */
    stream(req: RequestInterface | string): Promise<StreamResponse>;
    /**
     * @en Clears the internal cache.
     * @ru Полностью очищает внутренний кэш клиента.
     */
    clearCache(): void;
    /**
     * @en Clears all collected performance metrics.
     * @ru Очищает все собранные метрики производительности.
     */
    clearMetrics(): void;
    /**
     * @en Retrieves metrics for a specific URL.
     * @ru Получает метрики для конкретного URL.
     */
    getMetrics(key: string): RequestMetrics | undefined;
    /**
     * @en Retrieves all stored request metrics.
     * @ru Получает список всех сохраненных метрик.
     */
    getAllMetrics(): RequestMetrics[];
    /**
     * @en Returns real-time statistics about the client's internal state.
     * @ru Возвращает статистику состояния клиента в реальном времени.
     * @returns Cache size, active requests, queue state, etc.
     */
    getStats(): {
        cacheSize: number;
        inflightRequests: number;
        queuedRequests: number;
        activeRequests: number;
        currentRateLimit: number;
    };
    private normalizeRequest;
    private applyDefaultOptions;
    private prepareRequestData;
    private createInitialMetrics;
    private recordSuccess;
    private recordError;
}
//# sourceMappingURL=HttpClientImproved.d.ts.map