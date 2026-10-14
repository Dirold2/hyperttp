import type { HyperPlugin, HyperTransport, HyperClientOptions, HyperProtocols, UniversalResponse } from "@hyperttp/types";
import { RequestBuilder, type ResponseType } from "../Utils/RequestBuilder.js";
import type { HttpMethod, RestRequestOptions } from "@hyperttp/core/rest";
export type ShortcutRequestOptions = RestRequestOptions & {
    responseType?: ResponseType;
};
declare module "@hyperttp/types" {
    interface HyperClientOptions {
        /** Base URL used to resolve relative URLs passed to high-level client methods. */
        baseURL?: string;
        /** Disable automatic registration of built-in HyperClient plugins. */
        builtInPlugins?: boolean;
    }
}
/**
 * @ru Высокоуровневый HTTP-клиент с автоматической регистрацией плагинов
 * (сериализация, парсинг, очередь, rate limit, inflight, кэш, перехватчики, метрики).
 * Делегирует выполнение запросов ядру HyperCore и извлекает тело ответа.
 * @en High-level HTTP client with automatic plugin registration
 * (serialization, parsing, queue, rate limit, inflight, cache, interceptors, metrics).
 * Delegates request execution to the HyperCore core and extracts the response body.
 */
export interface HyperClient extends HyperProtocols {
}
export declare class HyperClient {
    private readonly _engine;
    private readonly _config;
    private readonly _transport?;
    private normalizeShortcutOptions;
    private isAbortSignal;
    private normalizeNoBodyShortcutOptions;
    private normalizeBodyShortcutOptions;
    private combineSignals;
    /**
     * @ru Создаёт экземпляр HyperClient и регистрирует REST-протокол.
     * Плагины передаются через config.plugins или регистрируются вручную через use().
     * @en Creates a HyperClient instance and registers the REST protocol.
     * Plugins are passed via config.plugins or registered manually via use().
     * @param config - Client configuration options.
     */
    constructor(config?: HyperClientOptions, transport?: HyperTransport);
    /**
     * @ru Подключает стандартный набор плагинов клиента.
     * @en Registers the client's built-in plugin set.
     */
    private useDefaultPlugins;
    /**
     * @ru Делегирует пространства имён протоколов ядра клиенту.
     * Внешние пакеты расширяют HyperProtocols через module augmentation, поэтому
     * после установки @hyperttp/protocol-grpc доступен client.grpc.call(...).
     * @en Delegates core protocol namespaces to the client. External protocol
     * packages augment HyperProtocols, making client.grpc.call(...) available.
     */
    private exposeProtocolNamespaces;
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
    private resolveUrl;
    /**
     * @ru Выполняет HTTP-запрос через ядро и возвращает распарсенное тело ответа.
     * @en Executes an HTTP request through the core and returns the parsed response body.
     * @template T - Expected response body type.
     * @param method - HTTP method.
     * @param url - Request URL.
     * @param options - Optional request options (headers, query, body, timeout).
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     * @internal Used by RequestBuilder to bypass the public API double-pass
     */
    _execute<T>(method: HttpMethod, url: string, options?: RestRequestOptions, signal?: AbortSignal, metadata?: Record<string, unknown>): Promise<T>;
    private executeShortcut;
    /**
     * @ru Выполняет GET-запрос и возвращает распарсенный ответ.
     * @en Performs a GET request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param responseType - Optional response format override.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    get<T = unknown>(url: string, signal?: AbortSignal): Promise<T>;
    get<T = unknown>(url: string, responseType: ResponseType, signal?: AbortSignal): Promise<T>;
    get<T = unknown>(url: string, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет POST-запрос и возвращает распарсенный ответ.
     * @en Performs a POST request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param body - Request body data.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    post<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T>;
    post<T = unknown>(url: string, body?: unknown, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    post<T = unknown>(url: string, body?: unknown, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет PUT-запрос и возвращает распарсенный ответ.
     * @en Performs a PUT request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param body - Request body data.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    put<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T>;
    put<T = unknown>(url: string, body?: unknown, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    put<T = unknown>(url: string, body?: unknown, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет PATCH-запрос и возвращает распарсенный ответ.
     * @en Performs a PATCH request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param body - Request body data.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    patch<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T>;
    patch<T = unknown>(url: string, body?: unknown, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    patch<T = unknown>(url: string, body?: unknown, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет DELETE-запрос и возвращает распарсенный ответ.
     * @en Performs a DELETE request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    delete<T = unknown>(url: string, signal?: AbortSignal): Promise<T>;
    delete<T = unknown>(url: string, responseType: ResponseType, signal?: AbortSignal): Promise<T>;
    delete<T = unknown>(url: string, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет OPTIONS-запрос и возвращает распарсенный ответ.
     * @en Performs an OPTIONS request and returns the parsed response.
     * @template T - Expected response body type.
     * @param url - Request URL.
     * @param body - Optional request body data.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the parsed response body.
     */
    options<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T>;
    options<T = unknown>(url: string, body?: unknown, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    options<T = unknown>(url: string, body?: unknown, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
    /**
     * @ru Выполняет HEAD-запрос и возвращает статус и заголовки (без тела).
     * @en Performs a HEAD request and returns status and headers (no body).
     * @param url - Request URL.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to an object with status and headers.
     */
    head(url: string, options?: RestRequestOptions, signal?: AbortSignal): Promise<{
        status: number;
        headers: Record<string, string | string[]>;
    }>;
    /**
     * @ru Выполняет потоковый GET-запрос. Тело ответа возвращается как асинхронно итерируемый поток.
     * @en Performs a streaming GET request. Response data is returned as an async-iterable stream.
     * @param url - Request URL.
     * @param options - Optional request options.
     * @param signal - Optional abort signal.
     * @returns Promise resolving to the stream response.
     */
    stream(url: string, options?: RestRequestOptions, signal?: AbortSignal): Promise<UniversalResponse<AsyncIterable<Uint8Array>>>;
    query<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T>;
    query<T = unknown>(url: string, body?: unknown, responseType?: ResponseType, signal?: AbortSignal): Promise<T>;
    query<T = unknown>(url: string, body?: unknown, options?: ShortcutRequestOptions, signal?: AbortSignal): Promise<T>;
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
    extend(options: Partial<HyperClientOptions>): HyperClient;
    /**
     * @ru Алиас для extend(). Создаёт новый экземпляр клиента.
     * @en Alias for extend(). Creates a new client instance.
     * @param options - Partial configuration options.
     * @returns A new HyperClient instance.
     */
    create(options: Partial<HyperClientOptions>): HyperClient;
    /**
     * @ru Завершает работу клиента и освобождает ресурсы (соединения, пулы, плагины).
     * @en Shuts down the client and releases resources (connections, pools, plugins).
     * @param graceful - If true, waits for active requests to complete before closing.
     * @returns Promise that resolves when shutdown is complete.
     */
    destroy(graceful?: boolean): Promise<void>;
}
//# sourceMappingURL=HyperClient.d.ts.map