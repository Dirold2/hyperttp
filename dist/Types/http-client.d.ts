import type { RequestInterface } from "./request.js";
import type { ResponseType } from "./http.js";
import type { StreamResponse } from "./stream.js";
import type { RequestMetrics } from "./metrics.js";
import type { HttpClientOptions } from "./options.js";
import type { RequestBuilder } from "../Hyperttp/Core/RequestBuilder.js";
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
    get<T = unknown>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    post<T = unknown>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    put<T = unknown>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    patch<T = unknown>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    delete<T = unknown>(req: RequestInterface | string, responseType?: ResponseType): Promise<T>;
    options<T = unknown>(req: RequestInterface | string, body?: any, responseType?: ResponseType): Promise<T>;
    head(req: RequestInterface | string): Promise<HeadResponse>;
    stream(req: RequestInterface | string): Promise<StreamResponse>;
    request<T = unknown>(url: string): RequestBuilder<T>;
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
//# sourceMappingURL=http-client.d.ts.map