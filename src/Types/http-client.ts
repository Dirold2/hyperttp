import { RequestBuilder } from "../Hyperttp/Utils/RequestBuilder.js";
import type {
  HttpClientOptions,
  RequestInterface,
  RequestMetrics,
  ResponseType,
  StreamResponse,
} from "@hyperttp/core";

export interface HttpClientStats {
  cacheSize: number;
  inflightRequests: number;
  queuedRequests: number;
  activeRequests: number;
  currentRateLimit: number;
}

export interface HeadResponse {
  status: number;
  headers: Record<string, any>;
}

export interface HttpClientInterface {
  readonly config?: HttpClientOptions;

  get<T = unknown>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;

  post<T = unknown>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  put<T = unknown>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  patch<T = unknown>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  delete<T = unknown>(
    req: RequestInterface | string,
    responseType?: ResponseType,
  ): Promise<T>;

  options<T = unknown>(
    req: RequestInterface | string,
    body?: any,
    responseType?: ResponseType,
  ): Promise<T>;

  head(req: RequestInterface | string): Promise<HeadResponse>;

  stream(req: RequestInterface | string): Promise<StreamResponse>;

  request(url: string): RequestBuilder;

  create(options: Partial<HttpClientOptions>): HttpClientInterface;
  extend(options: Partial<HttpClientOptions>): HttpClientInterface;

  warmup(urls: string[], count?: number): Promise<void>;

  getStats(): HttpClientStats;
  getMetrics(key: string): RequestMetrics | undefined;
  getAllMetrics(): RequestMetrics[];
  clearMetrics(): void;
  clearCache(): void;

  destroy(): Promise<void>;
}
