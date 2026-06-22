import type {
  HttpResponse,
  ResponseType,
  HttpClientOptions,
  RequestBodyData,
  RequestInterface,
  RequestHeaders,
  HyperPlugin,
  Method,
  RequestMetrics,
  HyperTransport,
} from "@hyperttp/types";
import { defaultConfig } from "../defaultConfig.js";
import { HyperCore } from "@hyperttp/core";
import { withParser } from "@hyperttp/parser";
import { withQueue } from "@hyperttp/queue";
import { withCache } from "@hyperttp/cache";
import { withRateLimit } from "@hyperttp/ratelimit";
import { withInflight } from "@hyperttp/inflight";
import { withInterceptors } from "@hyperttp/interceptors";
import { withMetrics } from "@hyperttp/metrics";
import { appendQueryToUrl } from "../Utils/query.js";
import { RequestBuilder } from "../Utils/RequestBuilder.js";

const EMPTY_HEADERS: Readonly<Record<string, never>> = Object.freeze({});

interface HyperCoreEngine {
  getStats?(): unknown;
  getAllMetrics?(): RequestMetrics[];
  getMetrics?(key: string): RequestMetrics | RequestMetrics[] | undefined;
  clearCache?(key?: string): void | Promise<void>;
  getMetricsSummary?(): unknown;
  resetMetrics?(): void;
}

type RequestLike = RequestInterface & {
  body?: RequestBodyData;
  bodyData?: RequestBodyData;
  _bodyData?: RequestBodyData;
  getURL?: () => string;
  getHeaders?: () => RequestHeaders;
  getBodyData?: () => RequestBodyData;
  getBodyDataString?: () => string;
  getSignal?: () => AbortSignal | undefined;
  getQuery?: () => Record<string, unknown>;
  getQueryAsString?: () => string;
};

/**
 * @ru Высокоуровневый HTTP-клиент с автоматической регистрацией плагинов
 * (сериализация, парсинг, очередь, rate limit, inflight, кэш, перехватчики, метрики).
 * Делегирует выполнение запросов ядру HyperCore и извлекает тело ответа.
 * @en High-level HTTP client with automatic plugin registration
 * (serialization, parsing, queue, rate limit, inflight, cache, interceptors, metrics).
 * Delegates request execution to the HyperCore core and extracts the response body.
 */
export class HyperClient {
  private readonly _engine: HyperCore;
  private readonly _config: HttpClientOptions;

  /**
   * @ru Создаёт экземпляр HyperClient и регистрирует все стандартные плагины.
   * @en Creates a HyperClient instance and registers all standard plugins.
   * @param config - Client configuration options.
   */
  constructor(
    config: HttpClientOptions = defaultConfig,
    transport?: HyperTransport,
  ) {
    this._config = {
      ...defaultConfig,
      ...config,
      network: { ...defaultConfig.network, ...config.network },
    };
    this._engine = new HyperCore(this._config, transport);

    this._engine.use(withParser(this._config.responseConverter));
    this._engine.use(withQueue());
    this._engine.use(withRateLimit(this._config.rateLimit));
    this._engine.use(withInflight(this._config.inflight));
    this._engine.use(withCache(this._config.cache));
    this._engine.use(withInterceptors());
    this._engine.use(withMetrics(this._config.metrics));
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

  /**
   * @ru Строит RequestInterface, правильно извлекая данные из геттеров старого класса Request.
   * @en Builds RequestInterface, correctly extracting data from getters of the old Request class.
   * @param req - Request URL or configuration object.
   * @param responseType - Response parsing strategy.
   * @param body - Optional request body.
   * @param signal - Optional abort signal.
   * @returns Normalized RequestInterface ready for dispatching.
   */
  private _buildRequest(
    req: RequestInterface | string,
    responseType: ResponseType,
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): RequestInterface {
    if (typeof req === "string") {
      return {
        url: req,
        headers: EMPTY_HEADERS,
        body,
        signal,
        meta: { responseType },
      };
    }
    const r = req as RequestLike;
    const url = req.url ?? r.getURL?.() ?? "";
    const headers = req.headers ?? r.getHeaders?.() ?? EMPTY_HEADERS;
    const extractedBody =
      body ??
      r.body ??
      r.bodyData ??
      r._bodyData ??
      r.getBodyData?.() ??
      r.getBodyDataString?.();

    const extractedSignal = signal ?? req.signal ?? r.getSignal?.();

    let finalUrl = url;

    if (!r.getURL) {
      const query = req.query ?? r.getQuery?.();
      if (query && Object.keys(query).length > 0) {
        const appended = appendQueryToUrl(
          finalUrl,
          query as Record<
            string,
            string | string[] | number | boolean | undefined | null
          >,
        );
        if (appended !== finalUrl) {
          finalUrl = appended;
        } else {
          const qs = r.getQueryAsString?.();
          if (qs) finalUrl += qs;
        }
      } else {
        const qs = r.getQueryAsString?.();
        if (qs) finalUrl += qs;
      }
    }

    return {
      url: finalUrl,
      headers,
      body: extractedBody,
      signal: extractedSignal,
      meta: { ...req.meta, responseType },
    };
  }

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
   */
  private async _execute<T>(
    method: Method,
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const request = this._buildRequest(req, responseType, body, signal);

    let response: HttpResponse<unknown>;
    switch (method) {
      case "GET":
        response = await this._engine.get(request, signal);
        break;
      case "POST":
        response = await this._engine.post(request, request.body, signal);
        break;
      case "PUT":
        response = await this._engine.put(request, request.body, signal);
        break;
      case "PATCH":
        response = await this._engine.patch(request, request.body, signal);
        break;
      case "DELETE":
        response = await this._engine.delete(request, signal);
        break;
      case "OPTIONS":
        response = await this._engine.options(request, request.body, signal);
        break;
      case "HEAD":
        response = await this._engine.head(request, signal);
        break;
      default:
        response = await this._engine.get(request, signal);
    }

    return response.body as T;
  }

  /**
   * @ru Выполняет GET-запрос и возвращает распарсенный ответ.
   * @en Performs a GET request and returns the parsed response.
   * @template T - Expected response body type.
   * @param req - Request URL or configuration object.
   * @param responseType - Response parsing strategy ('auto', 'json', 'text', 'stream', 'buffer', 'blob', 'xml', 'html').
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the parsed response body.
   */
  public get<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("GET", req, responseType, undefined, signal);
  }

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
  public post<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("POST", req, responseType, body, signal);
  }

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
  public put<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("PUT", req, responseType, body, signal);
  }

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
  public patch<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("PATCH", req, responseType, body, signal);
  }

  /**
   * @ru Выполняет DELETE-запрос и возвращает распарсенный ответ.
   * @en Performs a DELETE request and returns the parsed response.
   * @template T - Expected response body type.
   * @param req - Request URL or configuration object.
   * @param responseType - Response parsing strategy.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the parsed response body.
   */
  public delete<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("DELETE", req, responseType, undefined, signal);
  }

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
  public options<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    return this._execute<T>("OPTIONS", req, responseType, body, signal);
  }

  /**
   * @ru Выполняет HEAD-запрос и возвращает статус и заголовки (без тела).
   * @en Performs a HEAD request and returns status and headers (no body).
   * @param req - Request URL or configuration object.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to an object with status and headers.
   */
  public async head(
    req: RequestInterface | string,
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    const request = this._buildRequest(req, "auto", undefined, signal);
    const response = await this._engine.head(request, signal);
    return {
      status: response.status,
      headers: response.headers as Record<string, string | string[]>,
    };
  }

  /**
   * @ru Выполняет потоковый GET-запрос. Тело ответа возвращается как ReadableStream.
   * @en Performs a streaming GET request. Response body is returned as a ReadableStream.
   * @param req - Request URL or configuration object.
   * @param signal - Optional abort signal.
   * @returns Promise resolving to the stream response.
   */
  public stream(req: RequestInterface | string, signal?: AbortSignal) {
    return this._engine.stream(req, signal);
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
  public extend(options: Partial<HttpClientOptions>): HyperClient {
    return new HyperClient({
      ...this._config,
      ...options,
      network: { ...this._config.network, ...options.network },
    });
  }

  /**
   * @ru Алиас для extend(). Создаёт новый экземпляр клиента.
   * @en Alias for extend(). Creates a new client instance.
   * @param options - Partial configuration options.
   * @returns A new HyperClient instance.
   */
  public create(options: Partial<HttpClientOptions>): HyperClient {
    return this.extend(options);
  }

  /**
   * @ru Завершает работу клиента и освобождает ресурсы (соединения, пулы, плагины).
   * @en Shuts down the client and releases resources (connections, pools, plugins).
   * @returns Promise that resolves when shutdown is complete.
   */
  public async destroy(): Promise<void> {
    await this._engine.destroy();
  }

  /**
   * @ru Возвращает статистику работы клиента (активные соединения, очередь, кэш).
   * Требует наличия плагина метрик или очереди.
   * @en Returns client statistics (active connections, queue, cache).
   * Requires metrics or queue plugin to be registered.
   * @returns Statistics object, or undefined if no plugin provides it.
   */
  public getStats(): unknown {
    return (this._engine as unknown as HyperCoreEngine).getStats?.();
  }

  /**
   * @ru Возвращает все агрегированные метрики (latency, RPS, cache hits и т.д.).
   * Требует наличия плагина `withMetrics`.
   * @en Returns all aggregated metrics (latency, RPS, cache hits, etc.).
   * Requires the `withMetrics` plugin to be registered.
   * @returns Array of metrics, or undefined if the plugin is not registered.
   */
  public getAllMetrics(): RequestMetrics[] | undefined {
    return (this._engine as unknown as HyperCoreEngine).getAllMetrics?.();
  }

  /**
   * @ru Возвращает конкретную метрику по ключу.
   * Требует наличия плагина `withMetrics`.
   * @en Returns a specific metric by key.
   * Requires the `withMetrics` plugin to be registered.
   * @param key - Metric key (e.g., 'rps', 'avgLatency', 'cacheHits').
   * @returns Metric value, or undefined if not found.
   */
  public getMetrics(
    key: string,
  ): RequestMetrics | RequestMetrics[] | undefined {
    return (this._engine as unknown as HyperCoreEngine).getMetrics?.(key);
  }

  /**
   * @ru Очищает кэш ответов. Требует наличия плагина `withCache`.
   * @en Clears the response cache. Requires the `withCache` plugin.
   * @returns Void or Promise if async clearing is required.
   */
  public clearCache(): void | Promise<void> | undefined {
    return (this._engine as unknown as HyperCoreEngine).clearCache?.();
  }

  /**
   * @ru Возвращает агрегированную сводку метрик (success rate, avg duration, bottlenecks).
   * Требует наличия плагина `withMetrics`.
   * @en Returns aggregated metrics summary (success rate, avg duration, bottlenecks).
   * Requires the `withMetrics` plugin to be registered.
   * @returns Summary object, or null if no metrics collected.
   */
  public getMetricsSummary(): unknown {
    return (this._engine as unknown as HyperCoreEngine).getMetricsSummary?.();
  }

  /**
   * @ru Сбрасывает все накопленные метрики.
   * Требует наличия плагина `withMetrics`.
   * @en Resets all accumulated metrics.
   * Requires the `withMetrics` plugin to be registered.
   */
  public resetMetrics(): void {
    (this._engine as unknown as HyperCoreEngine).resetMetrics?.();
  }
}
