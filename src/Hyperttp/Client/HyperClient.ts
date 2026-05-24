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
  json: Object.freeze({
    responseType: "json",
  }),
  text: Object.freeze({ responseType: "text" }),
  buffer: Object.freeze({ responseType: "buffer" }),
  blob: Object.freeze({ responseType: "blob" }),
});

const extractHead = (res: { status: number; headers: any }) => ({
  status: res.status,
  headers: res.headers,
});
const extractStream = (res: any) => ({
  status: res.status,
  headers: res.headers,
  body: res.body,
  url: res.url,
  clone: () => {
    return extractStream(res);
  },
});

class FastStringRequest implements RequestInterface {
  constructor(
    private readonly _url: string,
    private readonly _meta: Readonly<{ responseType: ResponseType }>,
    private readonly _signal?: AbortSignal,
  ) {}

  getURL() {
    return this._url;
  }
  getHeaders() {
    return EMPTY_HEADERS;
  }
  getBodyData() {
    return undefined;
  }
  getSignal() {
    return this._signal;
  }
  getMeta() {
    return this._meta;
  }
}

class FastObjectRequest implements RequestInterface {
  private readonly _meta: Record<string, any>;
  private readonly _signal?: AbortSignal;

  constructor(
    private readonly _req: RequestInterface,
    responseType: ResponseType,
    signal?: AbortSignal,
  ) {
    this._signal = _req.getSignal ? _req.getSignal() : signal;
    const baseMeta = _req.getMeta ? _req.getMeta() : undefined;

    if (baseMeta) {
      if (baseMeta.responseType === responseType) {
        this._meta = baseMeta;
      } else {
        this._meta = Object.create(baseMeta);
        this._meta.responseType = responseType;
      }
    } else {
      this._meta = STATIC_META[responseType] || { responseType };
    }
  }

  getURL() {
    return this._req.getURL();
  }
  getHeaders() {
    return this._req.getHeaders();
  }
  getBodyData() {
    return this._req.getBodyData ? this._req.getBodyData() : undefined;
  }
  getSignal() {
    return this._signal;
  }
  getMeta() {
    return this._meta;
  }
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
    client.use(withParser(this._config.responseConverter));

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
      const meta = STATIC_META[responseType] || { responseType };
      return new FastStringRequest(req, meta as any, signal);
    }
    return new FastObjectRequest(req, responseType, signal);
  }

  private _extract<T>(
    promise: Promise<any>,
    responseType: ResponseType,
  ): Promise<T> {
    return promise.then((res) => {
      const body = res.body;
      if (body && typeof body === "object" && typeof body.text === "function") {
        if (responseType === "text") return body.text();
        if (responseType === "json") return body.json();
        if (responseType === "blob") return body.blob();
        if (responseType === "buffer")
          return typeof body.bytes === "function" ? body.bytes() : body;
      }
      return body;
    });
  }

  public get<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.get<T>(this.wrapRequest(req, responseType, signal), signal),
      responseType,
    );
  }

  public post<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.post<T>(
        this.wrapRequest(req, responseType, signal),
        body,
        signal,
      ),
      responseType,
    );
  }

  public put<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.put<T>(
        this.wrapRequest(req, responseType, signal),
        body,
        signal,
      ),
      responseType,
    );
  }

  public patch<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.patch<T>(
        this.wrapRequest(req, responseType, signal),
        body,
        signal,
      ),
      responseType,
    );
  }

  public options<T = unknown>(
    req: RequestInterface | string,
    body?: RequestBodyData,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.options<T>(
        this.wrapRequest(req, responseType, signal),
        body,
        signal,
      ),
      responseType,
    );
  }

  public delete<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    return this._extract<T>(
      this._engine.delete<T>(
        this.wrapRequest(req, responseType, signal),
        signal,
      ),
      responseType,
    );
  }

  public head(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    return this._engine
      .head(this.wrapRequest(req, responseType, signal), signal)
      .then(extractHead);
  }

  public stream(
    req: RequestInterface | string,
    signal?: AbortSignal,
  ): Promise<HttpResponse<Readable>> {
    return this._engine.stream(req, signal).then(extractStream);
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
