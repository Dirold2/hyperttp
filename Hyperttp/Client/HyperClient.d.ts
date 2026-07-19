import type { ResponseType, HttpClientOptions, RequestBodyData, RequestInterface, HyperPlugin, Method, RequestMetrics, HyperTransport } from "@hyperttp/types";
import { RequestBuilder } from "../Utils/RequestBuilder.js";
/**
 * @ru Высокоуровневый HTTP-клиент с автоматической регистрацией плагинов
 * (сериализация, парсинг, очередь, rate limit, inflight, кэш, перехватчики, метрики).
 * Делегирует выполнение запросов ядру HyperCore и извлекает тело ответа.
 * @en High-level HTTP client with automatic plugin registration
 * (serialization, parsing, queue, rate limit, inflight, cache, interceptors, metrics).
 * Delegates request execution to the HyperCore core and extracts the response body.
 */
export declare class HyperClient {
    private readonly _engine;
    private readonly _config;
    /**
     * @ru Создаёт экземпляр HyperClient и регистрирует все стандартные плагины.
     * @en Creates a HyperClient instance and registers all standard plugins.
     * @param config - Client configuration options.
     */
    constructor(config?: HttpClientOptions, transport?: HyperTransport);
    /**
     * @ru Регистрирует дополнительный плагин в клиенте.
     * @en Registers an additional plugin in the client.
     * @param plugin - Plugin instance to register.
     * @returns The current instance for chaining.
     */
    use(plugin: HyperPlugin): this;
    /**
     * @ru Возвращает имя класса активного транспорта.
     * @en Returns the class name of the active transport.
     * @returns Promise resolving to the transport class name.
     */
    getTransportName(): Promise<string>;
    /**
     * @ru Строит RequestInterface, правильно извлекая данные из геттеров старого класса Request.
     * @en Builds RequestInterface, correctly extracting data from getters of the old Request class.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Optional request body.
     * @param signal - Optional abort signal.
     * @returns Normalized RequestInterface ready for dispatching.
     */
    private _buildRequest;
    /**
     * @ru Выполняет HTTP-запрос через ядро и возвращает распарсенное тело ответа.
     * Плагин withParser автоматически парсит тело на основе meta.responseType.
     * @en Executes an HTTP request through the core and returns the parsed response body.
     * The withParser plugin automatically parses the body based on meta.responseType.
     * @template T - Expected response body type.
     * @param method - HTTP method (GET, POST, etc.).
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Optional request body.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     * @internal Used by RequestBuilder to bypass the public API double-pass
     */
    _execute<T>(method: Method, req: RequestInterface | string, responseType?: ResponseType, body?: RequestBodyData, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет GET-запрос и возвращает распарсенный ответ.
     * @en Performs a GET request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy ('auto', 'json', 'text', 'stream', 'buffer', 'blob', 'xml', 'html').
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    get<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет POST-запрос и возвращает распарсенный ответ.
     * @en Performs a POST request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Request body data.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    post<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, body?: RequestBodyData, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет PUT-запрос и возвращает распарсенный ответ.
     * @en Performs a PUT request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Request body data.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    put<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, body?: RequestBodyData, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет PATCH-запрос и возвращает распарсенный ответ.
     * @en Performs a PATCH request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Request body data.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    patch<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, body?: RequestBodyData, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет DELETE-запрос и возвращает распарсенный ответ.
     * @en Performs a DELETE request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    delete<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет OPTIONS-запрос и возвращает распарсенный ответ.
     * @en Performs an OPTIONS request and returns the parsed response.
     * @template T - Expected response body type.
     * @param req - Request URL or configuration object.
     * @param responseType - Response parsing strategy.
     * @param body - Optional request body data.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    options<T = unknown>(req: RequestInterface | string, responseType?: ResponseType, body?: RequestBodyData, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет HEAD-запрос и возвращает статус и заголовки (без тела).
     * @en Performs a HEAD request and returns status and headers (no body).
     * @param req - Request URL or configuration object.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to an object with status and headers.
     */
    head(req: RequestInterface | string, signal?: AbortSignal): Promise<{
        status: number;
        headers: Record<string, string | string[]>;
    }>;
    /**
     * @ru Выполняет потоковый GET-запрос. Тело ответа возвращается как ReadableStream.
     * @en Performs a streaming GET request. Response body is returned as a ReadableStream.
     * @param req - Request URL or configuration object.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the stream response.
     */
    stream(req: RequestInterface | string, signal?: AbortSignal): Promise<import("@hyperttp/types").StreamResponse<unknown>>;
    /**
     * @ru Возвращает построитель запросов для цепочечного формирования HTTP-запроса.
     * @en Returns a request builder for chainable HTTP request composition.
     * @param url - Target URL for the request.
     * @returns A RequestBuilder instance bound to this client.
     */
    request(url: string): RequestBuilder;
    /**
     * @ru Создаёт новый экземпляр клиента, объединяя текущую конфигурацию с переданными опциями.
     * @en Creates a new client instance by merging the current configuration with provided options.
     * @param options - Partial configuration options to extend.
     * @returns A new HyperClient instance.
     */
    extend(options: Partial<HttpClientOptions>): HyperClient;
    /**
     * @ru Алиас для extend(). Создаёт новый экземпляр клиента.
     * @en Alias for extend(). Creates a new client instance.
     * @param options - Partial configuration options.
     * @returns A new HyperClient instance.
     */
    create(options: Partial<HttpClientOptions>): HyperClient;
    /**
     * @ru Завершает работу клиента и освобождает ресурсы (соединения, пулы, плагины).
     * @en Shuts down the client and releases resources (connections, pools, plugins).
     * @returns Promise that resolves when shutdown is complete.
     */
    destroy(): Promise<void>;
    /**
     * @ru Возвращает статистику работы клиента (активные соединения, очередь, кэш).
     * Требует наличия плагина метрик или очереди.
     * @en Returns client statistics (active connections, queue, cache).
     * Requires metrics or queue plugin to be registered.
     * @returns Statistics object, or undefined if no plugin provides it.
     */
    getStats(): unknown;
    /**
     * @ru Возвращает все агрегированные метрики (latency, RPS, cache hits и т.д.).
     * Требует наличия плагина `withMetrics`.
     * @en Returns all aggregated metrics (latency, RPS, cache hits, etc.).
     * Requires the `withMetrics` plugin to be registered.
     * @returns Array of metrics, or undefined if the plugin is not registered.
     */
    getAllMetrics(): RequestMetrics[] | undefined;
    /**
     * @ru Возвращает конкретную метрику по ключу.
     * Требует наличия плагина `withMetrics`.
     * @en Returns a specific metric by key.
     * Requires the `withMetrics` plugin to be registered.
     * @param key - Metric key (e.g., 'rps', 'avgLatency', 'cacheHits').
     * @returns Metric value, or undefined if not found.
     */
    getMetrics(key: string): RequestMetrics | RequestMetrics[] | undefined;
    /**
     * @ru Очищает кэш ответов. Требует наличия плагина `withCache`.
     * @en Clears the response cache. Requires the `withCache` plugin.
     * @returns Void or Promise if async clearing is required.
     */
    clearCache(): void | Promise<void> | undefined;
    /**
     * @ru Возвращает агрегированную сводку метрик (success rate, avg duration, bottlenecks).
     * Требует наличия плагина `withMetrics`.
     * @en Returns aggregated metrics summary (success rate, avg duration, bottlenecks).
     * Requires the `withMetrics` plugin to be registered.
     * @returns Summary object, or null if no metrics collected.
     */
    getMetricsSummary(): unknown;
    /**
     * @ru Сбрасывает все накопленные метрики.
     * Требует наличия плагина `withMetrics`.
     * @en Resets all accumulated metrics.
     * Requires the `withMetrics` plugin to be registered.
     */
    resetMetrics(): void;
}
//# sourceMappingURL=HyperClient.d.ts.map