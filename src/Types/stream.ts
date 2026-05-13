import { Readable } from "node:stream";

export interface StreamResponse<TBody = Readable> {
  /**
   * @ru HTTP статус код ответа
   * @en HTTP status code
   */
  status: number;

  /**
   * @ru Заголовки ответа (сырые)
   * @en Response headers (raw)
   */
  headers: Record<string, string | string[] | undefined>;

  /**
   * @ru Потоковое тело (низкоуровневые чанки)
   * @en Streamed body (low-level chunks)
   */
  body: TBody;

  /**
   * @ru Финальный URL (после редиректов)
   * @en Final resolved URL (after redirects)
   */
  url: string;

  /**
   * @ru Сигнал для отслеживания abort (pipeline control)
   * @en Optional signal for abort tracking (useful for pipeline control)
   */
  signal?: AbortSignal;

  /**
   * @ru Content-Length если известен (zero-copy оптимизации)
   * @en Content-Length if known (zero-copy optimizations)
   */
  contentLength?: number;

  /**
   * @ru Hint кодировки (gzip/br/etc)
   * @en Encoding hint (gzip/br/etc)
   */
  encoding?: string;
}
