import { request, Agent } from "undici";
import {
  HttpClientError,
  TimeoutError,
  RetryOptions,
  LogLevel,
  RequestMetrics,
} from "../../Types";
import { InterceptorManager } from "./InterceptorManager";

/**
 * @class RequestExecutor
 * @en The core engine responsible for low-level HTTP execution, retries, and redirect logic.
 * @ru Основной движок, отвечающий за низкоуровневое выполнение HTTP-запросов, повторы и логику редиректов.
 */
export class RequestExecutor {
  constructor(
    private agent: Agent,
    private interceptors: InterceptorManager,
    private options: {
      timeout: number;
      maxRetries: number;
      followRedirects: boolean;
      maxRedirects: number;
      retryOptions: RetryOptions;
      verbose?: boolean;
      logger?: (level: LogLevel, message: string, meta?: any) => void;
    },
  ) {}

  /**
   * @en Internal logger wrapper.
   * @ru Внутренняя обертка для логирования.
   */
  private log(level: LogLevel, msg: string, meta?: any): void {
    if (this.options.verbose && this.options.logger) {
      this.options.logger(level, msg, meta);
    }
  }

  /**
   * @en Calculates the delay before the next retry using Exponential Backoff and Jitter.
   * @ru Вычисляет задержку перед следующим повтором, используя экспоненциальный рост и Jitter (джиттер).
   */
  private calcDelay(attempt: number): number {
    const { baseDelay, maxDelay, jitter } = this.options.retryOptions;
    const base = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Jitter помогает избежать "эффекта стада", распределяя запросы во времени
    return jitter ? base * (0.75 + Math.random() * 0.5) : base;
  }

  /** @en Simple async sleep helper. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * @en Parses the 'Retry-After' header (can be seconds or a Date string).
   * @ru Парсит заголовок 'Retry-After' (может быть в секундах или в формате даты).
   */
  private parseRetryAfterMs(header: unknown): number | undefined {
    if (!header) return undefined;
    const raw = Array.isArray(header) ? header[0] : String(header);
    const asSeconds = Number(raw);
    if (Number.isFinite(asSeconds))
      return Math.max(0, Math.floor(asSeconds * 1000));
    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
    return undefined;
  }

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
  async execute(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | Buffer | undefined,
    metrics?: RequestMetrics,
    signal?: AbortSignal,
    redirects = 0,
    attempt = 0,
  ): Promise<{
    status: number;
    headers: Record<string, any>;
    body: any;
    url: string;
  }> {
    const timeoutController = new AbortController();
    const timer = setTimeout(
      () => timeoutController.abort(),
      this.options.timeout,
    );

    const abortHandler = () => timeoutController.abort();
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        throw new HttpClientError(
          "Request aborted by user",
          "ABORTED",
          0,
          undefined,
          url,
          method,
        );
      }
      signal.addEventListener("abort", abortHandler);
    }

    try {
      const config = await this.interceptors.applyRequest({
        url,
        method,
        headers,
        body,
      });

      const res = await request(config.url, {
        method: config.method as any,
        headers: config.headers,
        body: config.body,
        dispatcher: this.agent,
        signal: timeoutController.signal,
      });

      clearTimeout(timer);

      if (
        this.options.followRedirects &&
        [301, 302, 303, 307, 308].includes(res.statusCode)
      ) {
        if (redirects >= this.options.maxRedirects) {
          throw new HttpClientError(
            "Too many redirects",
            "TOO_MANY_REDIRECTS",
            res.statusCode,
          );
        }
        const location = res.headers.location as string | undefined;
        if (location) {
          const nextUrl = new URL(location, config.url).toString();
          const nextMethod = res.statusCode === 303 ? "GET" : method;

          const nextHeaders = { ...headers };
          if (nextMethod === "GET") {
            delete nextHeaders["content-type"];
            delete nextHeaders["content-length"];
          }

          return this.execute(
            nextMethod,
            nextUrl,
            nextHeaders,
            nextMethod === "GET" ? undefined : body,
            metrics,
            signal,
            redirects + 1,
          );
        }
      }

      if (this.options.retryOptions.retryStatusCodes.includes(res.statusCode)) {
        if (attempt < this.options.maxRetries) {
          if (metrics) {
            metrics.retries += 1;
          }

          let delay = this.calcDelay(attempt);
          if (res.statusCode === 429) {
            const retryAfter = this.parseRetryAfterMs(
              res.headers["retry-after"],
            );
            if (retryAfter !== undefined) delay = retryAfter;
          }

          await this.sleep(delay);
          return this.execute(
            method,
            url,
            headers,
            body,
            metrics,
            signal,
            redirects,
            attempt + 1,
          );
        }
      }

      return await this.interceptors.applyResponse({
        status: res.statusCode,
        headers: res.headers as Record<string, any>,
        body: res.body as any,
        url: config.url,
      });
    } catch (err: any) {
      clearTimeout(timer);

      if (err.name === "AbortError") {
        if (signal?.aborted)
          throw new HttpClientError(
            "Request aborted by user",
            "ABORTED",
            0,
            err,
            url,
            method,
          );
        throw new TimeoutError(url, this.options.timeout);
      }

      if (
        attempt < this.options.maxRetries &&
        (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT")
      ) {
        if (metrics) {
          metrics.retries += 1;
        }
        await this.sleep(this.calcDelay(attempt));
        return this.execute(
          method,
          url,
          headers,
          body,
          metrics,
          signal,
          redirects,
          attempt + 1,
        );
      }

      throw err;
    } finally {
      if (signal) signal.removeEventListener("abort", abortHandler);
    }
  }
}
