import type {
  HttpResponse,
  ResponseType,
  HttpClientOptions,
  RequestBodyData,
  RequestInterface,
} from "@hyperttp/types";

import { HyperCore } from "@hyperttp/core";
import { RequestBuilder } from "../Utils/RequestBuilder.js";
import { defaultConfig } from "../defaultConfig.js";

import { withSerializer } from "@hyperttp/serializer";
import { withQueue } from "@hyperttp/queue";
import { withRateLimit } from "@hyperttp/ratelimit";
import { withInflight } from "@hyperttp/inflight";
import { withCache } from "@hyperttp/cache";
import { withInterceptors } from "@hyperttp/interceptors";
import { withMetrics } from "@hyperttp/metrics";
import { withParser } from "@hyperttp/parser";

declare module "@hyperttp/core" {
  interface HyperCore {
    getStats?: () => Record<string, unknown>;
    clearCache?: () => void | Promise<void>;
    getAllMetrics?: () => Record<string, unknown>;
    getMetrics?: (key: string) => unknown;
  }
}

type StreamResponseBody = ReadableStream<Uint8Array> & {
  dump?: () => Promise<void>;
};

const EMPTY_HEADERS: Readonly<Record<string, never>> = Object.freeze({});

function streamCloneHandler(
  this: HttpResponse<StreamResponseBody>,
): HttpResponse<StreamResponseBody> {
  return {
    status: this.status,
    headers: this.headers,
    body: this.body,
    url: this.url,
    clone: streamCloneHandler,
  };
}

type RequestLike = RequestInterface & {
  body?: RequestBodyData;
  bodyData?: RequestBodyData;
  _bodyData?: RequestBodyData;
  query?: Record<string, unknown>;
  url?: string;
};

/**
 * @ru Основной клиент для выполнения HTTP-запросов с поддержкой плагинов (сериализация, кэширование, очередь, rate limit, метрики, парсинг, перехватчики).
 * @en Main HTTP client supporting plugins (serialization, caching, queue, rate limiting, metrics, parsing, interceptors).
 */
export class HyperClient {
  private readonly _engine: HyperCore;
  private readonly _config: HttpClientOptions;

  /**
   * @ru Создаёт экземпляр HyperClient с расширенными возможностями.
   * @en Creates a HyperClient instance with enhanced capabilities.
   * @param config - Client configuration (base URL, timeouts, network, logger, etc.).
   */
  constructor(config: HttpClientOptions = defaultConfig) {
    this._config = {
      ...defaultConfig,
      ...config,
      network: config.network
        ? { ...defaultConfig.network, ...config.network }
        : defaultConfig.network,
      logger: config.logger ?? (() => {}),
    };

    const client = new HyperCore(this._config);

    client.use(withSerializer());
    client.use(withParser(this._config.responseConverter));
    client.use(withQueue());
    client.use(withRateLimit(this._config.rateLimit));
    client.use(withInflight(this._config.inflight));
    client.use(withCache(this._config.cache));
    client.use(withInterceptors());
    client.use(withMetrics(this._config.metrics));

    this._engine = client;
  }

  /**
   * @ru Возвращает текущий транспортный экземпляр (или null, если он ещё не инициализирован).
   * @en Returns the current transport instance (or null if not yet initialized).
   */
  public async getTransportName(): Promise<string> {
    return this._engine.getTransportName();
  }

  private wrapRequest(
    req: RequestInterface,
    responseType: ResponseType,
    signal?: AbortSignal,
  ): RequestInterface {
    const r = req as RequestLike;

    return {
      url: r.url,
      headers: r.headers ?? EMPTY_HEADERS,
      signal: signal ?? r.signal,
      body: r.body ?? r.bodyData ?? r._bodyData,
      query: r.query,
      meta: {
        ...r.meta,
        responseType,
      },
    };
  }

  private extractBody(
    req: RequestInterface | string,
  ): RequestBodyData | undefined {
    if (typeof req === "string") return undefined;
    const r = req as RequestLike;
    return r.body ?? r.bodyData ?? r._bodyData;
  }

  private static extractBodyFromResponse(res: HttpResponse<any>): any {
    return res.body;
  }

  private static formatHeadResponse(res: HttpResponse<any>) {
    return {
      status: res.status,
      headers: res.headers as Record<string, string | string[]>,
    };
  }

  private static formatStreamResponse(res: {
    status: number;
    headers: any;
    body: any;
    url?: string;
  }) {
    return {
      status: res.status,
      headers: res.headers,
      body: res.body as StreamResponseBody,
      url: res.url,
      clone: streamCloneHandler,
    };
  }

  /**
   * @ru Выполняет GET-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs a GET request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param signal - Optional abort signal.
   * @returns Promise with the response body (type depends on responseType).
   */
  public async get<T>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._engine
      .get<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет POST-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs a POST request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param body - Request body data (overrides body from req).
   * @param signal - Optional abort signal.
   * @returns Promise with the response body.
   */
  public async post<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    return this._engine
      .post<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        finalBody,
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет PUT-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs a PUT request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param body - Request body data (overrides body from req).
   * @param signal - Optional abort signal.
   * @returns Promise with the response body.
   */
  public async put<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    return this._engine
      .put<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        finalBody,
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет PATCH-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs a PATCH request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param body - Request body data (overrides body from req).
   * @param signal - Optional abort signal.
   * @returns Promise with the response body.
   */
  public async patch<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    return this._engine
      .patch<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        finalBody,
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет OPTIONS-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs an OPTIONS request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param body - Request body data (overrides body from req).
   * @param signal - Optional abort signal.
   * @returns Promise with the response body.
   */
  public async options<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    return this._engine
      .options<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        finalBody,
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет DELETE-запрос и возвращает распарсенный ответ (тело ответа).
   * @en Performs a DELETE request and returns the parsed response body.
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type ('auto', 'json', 'text', 'stream', 'buffer').
   * @param signal - Optional abort signal.
   * @returns Promise with the response body.
   */
  public async delete<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._engine
      .delete<T>(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        signal,
      )
      .then(HyperClient.extractBodyFromResponse);
  }

  /**
   * @ru Выполняет HEAD-запрос и возвращает статус и заголовки (без тела).
   * @en Performs a HEAD request and returns status and headers (no body).
   * @param req - Request URL or RequestInterface object.
   * @param responseType - Desired response type (ignored for HEAD, but kept for consistency).
   * @param signal - Optional abort signal.
   * @returns Promise with status and headers.
   */
  public async head(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    return this._engine
      .head(
        typeof req === "string"
          ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
          : this.wrapRequest(req, responseType, signal),
        signal,
      )
      .then(HyperClient.formatHeadResponse);
  }

  /**
   * @ru Выполняет GET-запрос и возвращает ответ в виде потока (StreamResponse). Тело ответа — ReadableStream.
   * @en Performs a GET request and returns the response as a stream (StreamResponse). Response body is a ReadableStream.
   * @param req - Request URL or RequestInterface object.
   * @param signal - Optional abort signal.
   * @returns Promise with HTTP response containing a readable stream body.
   */
  public async stream(
    req: RequestInterface | string,
    signal?: AbortSignal,
  ): Promise<HttpResponse<StreamResponseBody>> {
    return this._engine
      .stream(req, signal)
      .then(HyperClient.formatStreamResponse);
  }

  /**
   * @ru Создаёт построитель запроса (RequestBuilder) для удобной цепочной настройки GET-запроса.
   * @en Creates a RequestBuilder for convenient chained GET request configuration.
   * @param url - Base URL for the request.
   * @returns RequestBuilder instance.
   */
  public request(url: string): RequestBuilder {
    return new RequestBuilder(url, this);
  }

  /**
   * @ru Создаёт новый экземпляр HyperClient с расширенной конфигурацией (поверх текущей).
   * @en Creates a new HyperClient instance with extended configuration (on top of current).
   * @param options - Partial configuration to merge.
   * @returns New HyperClient instance.
   */
  public extend(options: Partial<HttpClientOptions>): HyperClient {
    return new HyperClient({
      ...this._config,
      ...options,
      network: {
        ...this._config.network,
        ...options.network,
      },
    });
  }

  /**
   * @ru Алиас для extend(). Создаёт новый экземпляр HyperClient.
   * @en Alias for extend(). Creates a new HyperClient instance.
   * @param options - Configuration options.
   * @returns New HyperClient instance.
   */
  public create(options: Partial<HttpClientOptions>): HyperClient {
    return this.extend(options);
  }

  /**
   * @ru Уничтожает клиент, закрывая соединения и очищая ресурсы (транспорт, агенты).
   * @en Destroys the client, closing connections and cleaning up resources (transport, agents).
   * @returns Promise that resolves after destruction.
   */
  public async destroy(): Promise<void> {
    await this._engine.destroy();
  }

  /**
   * @ru Возвращает статистику работы клиента (если включены метрики).
   * @en Returns client statistics (if metrics are enabled).
   * @returns Statistics object or undefined.
   */
  public getStats(): Record<string, unknown> | undefined {
    return this._engine.getStats?.();
  }

  /**
   * @ru Очищает кэш ответов (если используется плагин кэширования).
   * @en Clears the response cache (if the caching plugin is used).
   * @returns Void or Promise if async clearing is required.
   */
  public clearCache(): void | Promise<void> | undefined {
    return this._engine.clearCache?.();
  }

  /**
   * @ru Возвращает все метрики (если включен плагин метрик).
   * @en Returns all metrics (if the metrics plugin is enabled).
   * @returns Metrics object or undefined.
   */
  public getAllMetrics(): Record<string, unknown> | undefined {
    return this._engine.getAllMetrics?.();
  }

  /**
   * @ru Возвращает конкретную метрику по ключу.
   * @en Returns a specific metric by key.
   * @param key - Metric key.
   * @returns Metric value or undefined.
   */
  public getMetrics(key: string): unknown {
    return this._engine.getMetrics?.(key);
  }
}
