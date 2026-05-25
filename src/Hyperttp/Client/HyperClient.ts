import {
  HttpResponse,
  HyperCore,
  ResponseType,
  type HttpClientOptions,
  type RequestBodyData,
  type RequestInterface,
} from "@hyperttp/core";

import type { Readable } from "node:stream";

import { RequestBuilder } from "../Utils/RequestBuilder.js";
import { defaultConfig } from "../defaultConfig.js";

import { withSerializer } from "@hyperttp/serializer";
import { withParser } from "@hyperttp/parser";
import { withQueue } from "@hyperttp/queue";
import { withRateLimit } from "@hyperttp/ratelimit";
import { withInflight } from "@hyperttp/inflight";
import { withCache } from "@hyperttp/cache";
import { withInterceptors } from "@hyperttp/interceptors";
import { withMetrics } from "@hyperttp/metrics";

const EMPTY_HEADERS = Object.freeze({});
const STATIC_META: Record<
  string,
  Readonly<{ responseType: any }>
> = Object.freeze({
  auto: Object.freeze({ responseType: "auto" }),
  json: Object.freeze({ responseType: "json" }),
  text: Object.freeze({ responseType: "text" }),
  buffer: Object.freeze({ responseType: "buffer" }),
  blob: Object.freeze({ responseType: "blob" }),
});

/**
 * @private
 * Вынесено из инстанса для исключения аллокаций замыканий при обработке тела ответа
 */
const unpackBodyFast = (body: any, responseType: ResponseType): any => {
  if (body && typeof body === "object" && typeof body.text === "function") {
    if (responseType === "text") return body.text();
    if (responseType === "json") return body.json();
    if (responseType === "blob") return body.blob();
    if (responseType === "buffer") {
      return typeof body.bytes === "function" ? body.bytes() : body;
    }
  }
  return body;
};

/**
 * @private
 * Статический метод клонирования стрима для предотвращения создания стрелочных функций
 */
function streamCloneHandler(this: any) {
  return {
    status: this.status,
    headers: this.headers,
    body: this.body,
    url: this.url,
    clone: streamCloneHandler,
  };
}

export class HyperClient {
  private readonly _engine: HyperCore;
  private readonly _config: HttpClientOptions;

  constructor(config: HttpClientOptions = defaultConfig) {
    this._config = {
      ...defaultConfig,
      ...config,
      network: {
        ...defaultConfig.network,
        ...config.network,
      },
    };

    const client = new HyperCore(this._config);

    client.use(withSerializer());
    // client.use(withParser(this._config.responseConverter));

    if (this._config.queue?.enabled) {
      client.use(
        withQueue({
          maxConcurrent: this._config.network?.maxConcurrent || 500,
        }),
      );
    }

    if (this._config.rateLimit?.enabled) {
      client.use(withRateLimit(this._config.rateLimit));
    }

    if (this._config.inflight?.enabled) {
      client.use(withInflight());
    }

    if (this._config.cache?.enabled) {
      client.use(withCache());
    }

    if (this._config.interceptors?.enabled) {
      client.use(withInterceptors());
    }

    if (this._config.metrics?.enabled) {
      client.use(withMetrics());
    }

    this._engine = client;
  }

  private wrapRequest(
    req: RequestInterface | string,
    responseType: ResponseType,
    signal?: AbortSignal,
  ): RequestInterface {
    if (typeof req === "string") {
      return {
        url: req,
        headers: EMPTY_HEADERS,
        body: undefined,
        signal,
        meta: STATIC_META[responseType] || { responseType },
      };
    }

    const baseMeta = req.meta;
    if (baseMeta && baseMeta.responseType === responseType) {
      if (!signal || req.signal === signal) return req;

      return { ...req, signal: req.signal ?? signal };
    }

    return {
      ...req,
      signal: req.signal ?? signal,
      meta: baseMeta
        ? { ...baseMeta, responseType }
        : STATIC_META[responseType] || { responseType },
    };
  }

  public async get<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.get<any>(
      this.wrapRequest(req, responseType, signal),
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async post<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.post<any>(
      this.wrapRequest(req, responseType, signal),
      body,
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async put<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.put<any>(
      this.wrapRequest(req, responseType, signal),
      body,
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async patch<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.patch<any>(
      this.wrapRequest(req, responseType, signal),
      body,
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async options<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.options<any>(
      this.wrapRequest(req, responseType, signal),
      body,
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async delete<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await this._engine.delete<any>(
      this.wrapRequest(req, responseType, signal),
      signal,
    );
    return unpackBodyFast(res.body, responseType);
  }

  public async head(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    const res = await this._engine.head(
      this.wrapRequest(req, responseType, signal),
      signal,
    );
    return {
      status: res.status,
      headers: res.headers,
    };
  }

  public async stream(
    req: RequestInterface | string,
    signal?: AbortSignal,
  ): Promise<HttpResponse<Readable>> {
    const res = await this._engine.stream(req, signal);
    return {
      status: res.status,
      headers: res.headers,
      body: res.body,
      url: res.url,
      clone: streamCloneHandler,
    };
  }

  public request(url: string): RequestBuilder {
    return new RequestBuilder(url, this);
  }

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

  public create(options: Partial<HttpClientOptions>): HyperClient {
    return this.extend(options);
  }

  public destroy(): Promise<void> {
    return this._engine.destroy();
  }

  public getStats() {
    return this._engine.getStats?.();
  }

  public clearCache() {
    return (this._engine as any).clearCache?.();
  }

  public getAllMetrics() {
    return this._engine.getAllMetrics?.();
  }

  public getMetrics(key: string) {
    return (this._engine as any).getMetrics?.(key);
  }
}
