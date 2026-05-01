import { Agent } from "undici";
import { RetryOptions, LogLevel, RequestMetrics } from "../../Types";
import { InterceptorManager } from "./InterceptorManager";
/**
 * @class RequestExecutor
 * @en The core engine responsible for low-level HTTP execution, retries, and redirect logic.
 * @ru Основной движок, отвечающий за низкоуровневое выполнение HTTP-запросов, повторы и логику редиректов.
 */
export declare class RequestExecutor {
    private agent;
    private interceptors;
    private options;
    constructor(agent: Agent, interceptors: InterceptorManager, options: {
        timeout: number;
        maxRetries: number;
        followRedirects: boolean;
        maxRedirects: number;
        retryOptions: RetryOptions;
        verbose?: boolean;
        logger?: (level: LogLevel, message: string, meta?: any) => void;
    });
    /**
     * @en Internal logger wrapper.
     * @ru Внутренняя обертка для логирования.
     */
    private log;
    /**
     * @en Calculates the delay before the next retry using Exponential Backoff and Jitter.
     * @ru Вычисляет задержку перед следующим повтором, используя экспоненциальный рост и Jitter (джиттер).
     */
    private calcDelay;
    /** @en Simple async sleep helper. */
    private sleep;
    /**
     * @en Parses the 'Retry-After' header (can be seconds or a Date string).
     * @ru Парсит заголовок 'Retry-After' (может быть в секундах или в формате даты).
     */
    private parseRetryAfterMs;
    /**
     * @en Executes an HTTP request with full retry and redirect lifecycle management.
     * @ru Выполняет HTTP-запрос с полным циклом управления повторами и редиректами.
     * @param method - HTTP method
     * @param url - Destination URL
     * @param headers - Request headers
     * @param body - Request payload
     * @param metrics - Performance metrics object to update
     * @param signal - External AbortSignal for user cancellation
     * @param redirects - Internal redirect counter
     * @param attempt - Internal retry attempt counter
     */
    execute(method: string, url: string, headers: Record<string, string>, body: string | Buffer | undefined, metrics?: RequestMetrics, signal?: AbortSignal, redirects?: number, attempt?: number): Promise<{
        status: number;
        headers: Record<string, any>;
        body: any;
        url: string;
    }>;
}
//# sourceMappingURL=RequestExecutor.d.ts.map