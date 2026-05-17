import { RequestBuilder } from "./RequestBuilder.js";
import { HttpClientInterface } from "../../Types/http-client.js";
import { HttpClientOptions } from "../../Types/options.js";
import { ResponseType } from "../../Types/http.js";
import { RequestInterface } from "../../Types/request.js";
import { RequestMetrics } from "../../Types/metrics.js";
import { StreamResponse } from "../../Types/stream.js";
import { Readable } from "node:stream";
/**
 * @class HttpClientImproved
 * @en High-performance HTTP client with built-in caching, queuing, rate limiting, and metrics.
 * @ru Высокопроизводительный HTTP-клиент со встроенным кэшированием, очередями, лимитами и метриками.
 */
export default class HttpClientImproved implements HttpClientInterface {
    private agent;
    readonly config: HttpClientOptions;
    private cache?;
    private queue?;
    private limiter?;
    private metricsManager;
    private interceptors;
    private executor;
    private converter;
    private inflight;
    private defaultHeaders;
    private readonly cacheEnabled;
    private readonly queueEnabled;
    private readonly limiterEnabled;
    private readonly metricsEnabled;
    private readonly verboseEnabled;
    constructor(config?: HttpClientOptions);
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
     * @en Performs an HTTP OPTIONS request.
     * @ru Выполняет HTTP OPTIONS запрос.
     */
    options<T = any>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    /**
     * @en Performs an HTTP HEAD request.
     * @ru Выполняет HTTP HEAD запрос.
     */
    head(req: RequestInterface | string): Promise<{
        status: number;
        headers: Record<string, any>;
    }>;
    /**
     * @en Creates a new HttpClient instance with merged configuration.
     * @ru Создаёт новый экземпляр HttpClient с объединённой конфигурацией.
     *
     * @param options Partial configuration to override current settings
     * @returns New HttpClientImproved instance
     */
    extend(options: Partial<HttpClientOptions>): HttpClientImproved;
    /**
     * @en Alias for extend(). Creates a new configured client instance.
     * @ru Алиас для extend(). Создаёт новый настроенный экземпляр клиента.
     *
     * @param options Partial configuration overrides
     * @returns New HttpClientImproved instance
     */
    create(options: Partial<HttpClientOptions>): HttpClientImproved;
    /**
     * @en Executes a request and returns an AsyncIterable stream.
     * @ru Выполняет запрос и возвращает итерируемый поток данных.
     */
    stream(req: RequestInterface | string): Promise<StreamResponse<Readable>>;
    /**
     * @en Creates a RequestBuilder for a fluent API approach.
     * @ru Создает RequestBuilder для использования Fluent API.
     * @example client.request('url').get().send();
     */
    request(url: string): RequestBuilder;
    destroy(): Promise<void>;
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
        queuedRequests: any;
        activeRequests: any;
        currentRateLimit: any;
    };
    warmup(urls: string[], count?: number): Promise<void>;
    private mergeOptions;
    private normalizeRequest;
    private applyDefaulthcoptions;
    /**
     * @en Core internal method for handling all HTTP requests.
     * @ru Основной внутренний метод для обработки всех HTTP-запросов.
     * @param method HTTP method (GET, POST, etc.)
     * @param req Request object
     * @param useCache Whether to use caching for this request
     * @param responseType Expected response format
     */
    private requestInternal;
    private prepareRequestData;
    private createInitialMetrics;
    private recordSuccess;
    private recordError;
}
//# sourceMappingURL=HttpClientImproved.d.ts.map