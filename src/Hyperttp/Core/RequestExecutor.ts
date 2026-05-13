import { request, Agent } from "undici";
import { InterceptorManager } from "./InterceptorManager";
import { RetryOptions } from "../../Types/options";
import { LogLevel } from "../../Types/http";
import { RequestMetrics } from "../../Types/metrics";
import { HttpClientError, TimeoutError } from "../../Types/errors";

type LowLevelResponse = {
  status: number;
  headers: Record<string, any>;
  body: any;
  url: string;
};

export class RequestExecutor {
  private readonly redirectStatusCodes = new Set([301, 302, 303, 307, 308]);

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

  private calcDelay(attempt: number): number {
    const { baseDelay, maxDelay, jitter } = this.options.retryOptions;
    const base = Math.min(baseDelay! * Math.pow(2, attempt), maxDelay!);
    return jitter ? base * (0.75 + Math.random() * 0.5) : base;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async drainBody(body: any): Promise<void> {
    if (!body) return;

    try {
      if (typeof body.dump === "function") {
        await body.dump();
        return;
      }
      if (typeof body.resume === "function") {
        body.resume();
        return;
      }
      if (typeof body.destroy === "function") {
        body.destroy();
      }
    } catch {
      /* ignore */
    }
  }

  private async executeCore<TBody>(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | Buffer | undefined,
    metrics: RequestMetrics | undefined,
    signal: AbortSignal | undefined,
    parser: (res: LowLevelResponse) => Promise<TBody>,
  ): Promise<{
    status: number;
    headers: Record<string, any>;
    body: TBody;
    url: string;
  }> {
    let currentUrl = url;
    let currentMethod = method;
    let currentHeaders = headers;
    let currentBody = body;

    let redirects = 0;
    let attempt = 0;

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
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      while (true) {
        try {
          const config = await this.interceptors.applyRequest({
            url: currentUrl,
            method: currentMethod,
            headers: currentHeaders,
            body: currentBody,
          });

          const res = await request(config.url, {
            method: config.method as any,
            headers: config.headers,
            body: config.body,
            dispatcher: this.agent,
            signal: timeoutController.signal,
          });

          const status = res.statusCode;
          const resHeaders = res.headers as Record<string, any>;

          if (
            this.options.followRedirects &&
            this.redirectStatusCodes.has(status)
          ) {
            if (redirects >= this.options.maxRedirects) {
              await this.drainBody(res.body);
              throw new HttpClientError(
                "Too many redirects",
                "TOO_MANY_REDIRECTS",
                status,
              );
            }

            const location = resHeaders.location as string | undefined;
            if (location) {
              await this.drainBody(res.body);

              const nextUrl = new URL(location, config.url).toString();
              const nextMethod = status === 303 ? "GET" : currentMethod;

              currentUrl = nextUrl;
              currentMethod = nextMethod;
              currentBody = nextMethod === "GET" ? undefined : currentBody;

              if (nextMethod === "GET") {
                if (
                  currentHeaders["content-type"] ||
                  currentHeaders["Content-Type"] ||
                  currentHeaders["content-length"] ||
                  currentHeaders["Content-Length"]
                ) {
                  const nextHeaders = { ...currentHeaders };
                  delete nextHeaders["content-type"];
                  delete nextHeaders["Content-Type"];
                  delete nextHeaders["content-length"];
                  delete nextHeaders["Content-Length"];
                  currentHeaders = nextHeaders;
                }
              }

              redirects++;
              continue;
            }
          }

          if (status >= 500) {
            if (attempt < this.options.maxRetries) {
              if (metrics) metrics.retries += 1;

              await this.drainBody(res.body);
              const delay = this.calcDelay(attempt);
              if (delay > 0) await this.sleep(delay);

              attempt++;
              continue;
            }

            throw new HttpClientError(
              `HTTP ${status}`,
              "HTTP_ERROR",
              status,
              undefined,
              config.url,
              currentMethod,
            );
          }

          const transformed = await this.interceptors.applyResponse({
            status,
            headers: resHeaders,
            body: res.body as any,
            url: config.url,
          });

          const parsed = await parser(transformed as LowLevelResponse);

          return {
            status: transformed.status,
            headers: transformed.headers,
            body: parsed,
            url: transformed.url,
          };
        } catch (err: any) {
          if (err?.name === "AbortError") {
            if (signal?.aborted) {
              throw new HttpClientError(
                "Request aborted by user",
                "ABORTED",
                0,
                err,
                url,
                method,
              );
            }
            throw new TimeoutError(url, this.options.timeout);
          }

          if (
            attempt < this.options.maxRetries &&
            (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT")
          ) {
            metrics && (metrics.retries += 1);
            await this.sleep(this.calcDelay(attempt));
            attempt++;
            continue;
          }

          throw err;
        }
      }
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", abortHandler);
    }
  }

  async execute(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | Buffer | undefined,
    metrics?: RequestMetrics,
    signal?: AbortSignal,
  ): Promise<{
    status: number;
    headers: Record<string, any>;
    body: any;
    url: string;
  }> {
    return this.executeCore(
      method,
      url,
      headers,
      body,
      metrics,
      signal,
      async (res) => res.body,
    );
  }
}
