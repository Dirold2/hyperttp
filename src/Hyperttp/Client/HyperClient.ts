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
      logger: config.logger ?? (() => {}),
    };

    const client = new HyperCore(this._config);

    client.use(withSerializer());
    client.use(withParser(this._config.responseConverter));
    client.use(withQueue());
    client.use(withRateLimit(this._config.rateLimit));
    client.use(withInflight());
    client.use(withCache());
    client.use(withInterceptors());
    client.use(withMetrics());

    this._engine = client;
  }

  private wrapRequest(
    req: RequestInterface,
    responseType: ResponseType,
    signal?: AbortSignal,
  ): RequestInterface {
    const r = req as RequestLike;
    const baseMeta = r.meta;

    const wrapped = Object.assign({}, r);
    wrapped.signal = r.signal ?? signal;
    wrapped.meta = baseMeta
      ? Object.assign({}, baseMeta, { responseType })
      : { responseType };

    const body = r.body ?? r.bodyData ?? r._bodyData;
    if (body !== undefined) {
      wrapped.body = body;
    }

    return wrapped;
  }

  private extractBody(
    req: RequestInterface | string,
    fallback?: RequestBodyData,
  ): RequestBodyData | undefined {
    if (typeof req === "string") return fallback;
    const r = req as RequestLike;
    return r.body ?? r.bodyData ?? r._bodyData ?? fallback;
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

  private static parseJsonOrText(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  }

  public get<T>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .get<T>(wrapped, signal)
      .then(HyperClient.extractBodyFromResponse);
  }

  public post<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine.post<any>(wrapped, finalBody, signal).then((res) => {
      if (res.body instanceof ReadableStream) {
        return new Response(res.body).text().then(HyperClient.parseJsonOrText);
      }
      return res.body;
    });
  }

  public put<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .put<T>(wrapped, finalBody, signal)
      .then(HyperClient.extractBodyFromResponse);
  }

  public patch<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .patch<T>(wrapped, finalBody, signal)
      .then(HyperClient.extractBodyFromResponse);
  }

  public options<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    body?: RequestBodyData,
    signal?: AbortSignal,
  ): Promise<T> {
    const finalBody = body ?? this.extractBody(req);
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .options<T>(wrapped, finalBody, signal)
      .then(HyperClient.extractBodyFromResponse);
  }

  public delete<T = unknown>(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<T> {
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .delete<T>(wrapped, signal)
      .then(HyperClient.extractBodyFromResponse);
  }

  public head(
    req: RequestInterface | string,
    responseType: ResponseType = "auto",
    signal?: AbortSignal,
  ): Promise<{ status: number; headers: Record<string, string | string[]> }> {
    const wrapped =
      typeof req === "string"
        ? { url: req, headers: EMPTY_HEADERS, signal, meta: { responseType } }
        : this.wrapRequest(req, responseType, signal);

    return this._engine
      .head(wrapped, signal)
      .then(HyperClient.formatHeadResponse);
  }

  public stream(
    req: RequestInterface | string,
    signal?: AbortSignal,
  ): Promise<HttpResponse<StreamResponseBody>> {
    return this._engine
      .stream(req, signal)
      .then(HyperClient.formatStreamResponse);
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

  public async destroy(): Promise<void> {
    await this._engine.destroy();
  }

  public getStats(): Record<string, unknown> | undefined {
    return this._engine.getStats?.();
  }

  public clearCache(): void | Promise<void> | undefined {
    return this._engine.clearCache?.();
  }

  public getAllMetrics(): Record<string, unknown> | undefined {
    return this._engine.getAllMetrics?.();
  }

  public getMetrics(key: string): unknown {
    return this._engine.getMetrics?.(key);
  }
}
