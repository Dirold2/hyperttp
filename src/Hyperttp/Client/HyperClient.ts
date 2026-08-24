import type {
  HyperPlugin,
  HyperTransport,
  HyperClientOptions,
  HyperProtocols,
  UniversalResponse,
} from "@hyperttp/types";
import { HyperCore, KNOWN_PROTOCOLS, RestProtocol } from "@hyperttp/core";
import { withCache } from "@hyperttp/cache";
import { withInflight } from "@hyperttp/inflight";
import { withInterceptors } from "@hyperttp/interceptors";
import { withMetrics } from "@hyperttp/metrics";
import { withParser } from "@hyperttp/parser";
import { withQueue } from "@hyperttp/queue";
import { withRateLimit } from "@hyperttp/ratelimit";
import { withSerializer } from "@hyperttp/serializer";
import { defaultConfig } from "../defaultConfig.js";
import { RequestBuilder, type ResponseType } from "../Utils/RequestBuilder.js";
import type { HttpMethod, RestInput, RestRequestOptions } from "@hyperttp/core/rest";

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
// oxlint-disable-next-line no-unsafe-declaration-merging
export interface HyperClient extends HyperProtocols {}

export class HyperClient {
  private readonly _engine: HyperCore;
  private readonly _config: HyperClientOptions;
  private readonly _transport?: HyperTransport;

  /**
   * @ru Создаёт экземпляр HyperClient и регистрирует REST-протокол.
   * Плагины передаются через config.plugins или регистрируются вручную через use().
   * @en Creates a HyperClient instance and registers the REST protocol.
   * Plugins are passed via config.plugins or registered manually via use().
   * @param config - Client configuration options.
   */
  constructor(config: HyperClientOptions = defaultConfig, transport?: HyperTransport) {
    this._config = {
      ...defaultConfig,
      ...config,
      retry: {
        ...defaultConfig.retry,
        ...config.retry,
      },
    };
    this._transport = transport;

    this._engine = new HyperCore(this._config, transport);

    if (this._config.builtInPlugins !== false) {
      this.useDefaultPlugins();
    }
    this._engine.registerProtocol(RestProtocol);
    this.exposeProtocolNamespaces();
  }

  /**
   * @ru Подключает стандартный набор плагинов клиента.
   * @en Registers the client's built-in plugin set.
   */
  private useDefaultPlugins(): void {
    this.use(withInterceptors(this._config.interceptors));
    this.use(withSerializer(this._config.serializer));
    this.use(withMetrics(this._config.metrics));
    this.use(withInflight(this._config.inflight));
    this.use(withCache(this._config.cache));
    this.use(withRateLimit(this._config.rateLimit));
    this.use(withQueue(this._config.queue));
    if (this._config.responseConverter !== false) {
      this.use(withParser(this._config.responseConverter));
    }
  }

  /**
   * @ru Делегирует пространства имён протоколов ядра клиенту.
   * Внешние пакеты расширяют HyperProtocols через module augmentation, поэтому
   * после установки @hyperttp/protocol-grpc доступен client.grpc.call(...).
   * @en Delegates core protocol namespaces to the client. External protocol
   * packages augment HyperProtocols, making client.grpc.call(...) available.
   */
  private exposeProtocolNamespaces(): void {
    for (const protocol of KNOWN_PROTOCOLS) {
      Object.defineProperty(this, protocol, {
        configurable: false,
        enumerable: true,
        get: () => (this._engine as HyperCore & Record<string, unknown>)[protocol],
      });
    }
  }

  /**
   * @ru Регистрирует дополнительный плагин в клиенте.
   * @en Registers an additional plugin in the client.
   * @param plugin - Plugin instance to register.
   * @returns The current instance for chaining.
   */
  public use(plugin: HyperPlugin): this {
    this._engine.use(plugin);
    return this;
  }

  /**
   * @ru Возвращает имя класса активного транспорта.
   * @en Returns the class name of the active transport.
   * @returns Promise resolving to the transport class name.
   */
  public async getTransportName(): Promise<string> {
    return this._engine.getTransportName();
  }

  private resolveUrl(url: string): string {
    return this._config.baseURL ? new URL(url, this._config.baseURL).toString() : url;
  }

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
  public async _execute<T>(
    method: HttpMethod,
    url: string,
    options?: RestRequestOptions,
    signal?: AbortSignal,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const requestSignal = signal ?? options?.signal;
    const request = {
      protocol: "rest" as const,
      input: {
        ...options,
        method,
        url: this.resolveUrl(url),
        signal: requestSignal,
      },
      signal: requestSignal,
      metadata,
    };
    const response = await this._engine.send<RestInput, T, "rest">(request);
    return response.data;
  }

  private executeShortcut<T>(
    method: HttpMethod,
    url: string,
    options?: ShortcutRequestOptions,
    signal?: AbortSignal,
  ): Promise<T> {
    const { responseType, ...requestOptions } = options ?? {};
    return this._execute<T>(
      method,
      url,
      requestOptions,
      signal,
      responseType ? { responseType } : undefined,
    );
  }

  /**
   * @ru Выполняет GET-запрос и возвращает распарсенный ответ.
   * @en Performs a GET request and returns the parsed response.
   * @template T - Expected response body type.
   * @param url - Request URL.
   * @param responseType - Optional response format override.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the parsed response body.
   */
  public get<T = unknown>(
    url: string,
    responseType: ResponseType,
    signal?: AbortSignal,
  ): Promise<T>;
  public get<T = unknown>(
    url: string,
    options?: ShortcutRequestOptions,
    signal?: AbortSignal,
  ): Promise<T>;
  public get<T = unknown>(
    url: string,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType }
        : optionsOrResponseType;
    return this.executeShortcut<T>("GET", url, options, signal);
  }

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
  public post<T = unknown>(
    url: string,
    body?: unknown,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType, body }
        : { ...optionsOrResponseType, body };
    return this.executeShortcut<T>("POST", url, options, signal);
  }

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
  public put<T = unknown>(
    url: string,
    body?: unknown,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType, body }
        : { ...optionsOrResponseType, body };
    return this.executeShortcut<T>("PUT", url, options, signal);
  }

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
  public patch<T = unknown>(
    url: string,
    body?: unknown,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType, body }
        : { ...optionsOrResponseType, body };
    return this.executeShortcut<T>("PATCH", url, options, signal);
  }

  /**
   * @ru Выполняет DELETE-запрос и возвращает распарсенный ответ.
   * @en Performs a DELETE request and returns the parsed response.
   * @template T - Expected response body type.
   * @param url - Request URL.
   * @param options - Optional request options.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the parsed response body.
   */
  public delete<T = unknown>(
    url: string,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType }
        : optionsOrResponseType;
    return this.executeShortcut<T>("DELETE", url, options, signal);
  }

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
  public options<T = unknown>(
    url: string,
    body?: unknown,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType, body }
        : { ...optionsOrResponseType, body };
    return this.executeShortcut<T>("OPTIONS", url, options, signal);
  }

  /**
   * @ru Выполняет HEAD-запрос и возвращает статус и заголовки (без тела).
   * @en Performs a HEAD request and returns status and headers (no body).
   * @param url - Request URL.
   * @param options - Optional request options.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to an object with status and headers.
   */
  public async head(
    url: string,
    options?: RestRequestOptions,
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    const requestSignal = signal ?? options?.signal;
    const response = await this._engine.send<RestInput, unknown, "rest">({
      protocol: "rest",
      input: {
        ...options,
        method: "HEAD",
        url: this.resolveUrl(url),
        signal: requestSignal,
      },
      signal: requestSignal,
    });
    return {
      status: response.status,
      headers: response.headers as Record<string, string | string[]>,
    };
  }

  /**
   * @ru Выполняет потоковый GET-запрос. Тело ответа возвращается как асинхронно итерируемый поток.
   * @en Performs a streaming GET request. Response data is returned as an async-iterable stream.
   * @param url - Request URL.
   * @param options - Optional request options.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the stream response.
   */
  public async stream(
    url: string,
    options?: RestRequestOptions,
    signal?: AbortSignal,
  ): Promise<UniversalResponse<AsyncIterable<Uint8Array>>> {
    const requestSignal = signal ?? options?.signal;
    return this._engine.send<RestInput, AsyncIterable<Uint8Array>, "rest">({
      protocol: "rest",
      input: {
        ...options,
        method: "GET",
        url: this.resolveUrl(url),
        stream: true,
        signal: requestSignal,
      },
      metadata: {
        responseType: "stream",
      },
      signal: requestSignal,
    });
  }

  public query<T = unknown>(
    url: string,
    body?: unknown,
    optionsOrResponseType?: ShortcutRequestOptions | ResponseType,
    signal?: AbortSignal,
  ): Promise<T> {
    const options =
      typeof optionsOrResponseType === "string"
        ? { responseType: optionsOrResponseType, body }
        : { ...optionsOrResponseType, body };
    return this.executeShortcut<T>("QUERY", url, options, signal);
  }

  /**
   * @ru Возвращает построитель запросов для цепочечного формирования HTTP-запроса.
   * @en Returns a request builder for chainable HTTP request composition.
   * @param url - Target URL for the request.
   * @returns A RequestBuilder instance bound to this client.
   */
  public request(url: string): RequestBuilder {
    return new RequestBuilder(url, this);
  }

  /**
   * @ru Создаёт новый экземпляр клиента, объединяя текущую конфигурацию с переданными опциями.
   * @en Creates a new client instance by merging the current configuration with provided options.
   * @param options - Partial configuration options to extend.
   * @returns A new HyperClient instance.
   */
  public extend(options: Partial<HyperClientOptions>): HyperClient {
    const config: HyperClientOptions = {
      ...this._config,
      ...options,
      retry: {
        ...this._config.retry,
        ...options.retry,
      },
    };
    const transport = options.customTransport ?? this._transport;

    return new HyperClient(config, transport);
  }

  /**
   * @ru Алиас для extend(). Создаёт новый экземпляр клиента.
   * @en Alias for extend(). Creates a new client instance.
   * @param options - Partial configuration options.
   * @returns A new HyperClient instance.
   */
  public create(options: Partial<HyperClientOptions>): HyperClient {
    return this.extend(options);
  }

  /**
   * @ru Завершает работу клиента и освобождает ресурсы (соединения, пулы, плагины).
   * @en Shuts down the client and releases resources (connections, pools, plugins).
   * @param graceful - If true, waits for active requests to complete before closing.
   * @returns Promise that resolves when shutdown is complete.
   */
  public async destroy(graceful?: boolean): Promise<void> {
    await this._engine.destroy(graceful);
  }
}
