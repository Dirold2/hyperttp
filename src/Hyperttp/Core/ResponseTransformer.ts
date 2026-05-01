import * as zlib from "zlib";
import { promisify } from "util";
import { XMLParser } from "fast-xml-parser";
import XMLBuilder from "fast-xml-builder";
import { HttpClientError, ResponseType, LogLevel } from "../../Types";

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * @class ResponseTransformer
 * @en Handles stream reading, decompression (Gzip/Brotli), and parsing (JSON/XML/Text).
 * @ru Обрабатывает чтение стримов, декомпрессию (Gzip/Brotli) и парсинг (JSON/XML/Text).
 */
export class ResponseTransformer {
  private xmlParser: XMLParser;

  constructor(
    private maxResponseBytes: number = 1024 * 1024,
    private logger?: (level: LogLevel, message: string, meta?: any) => void,
  ) {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      allowBooleanAttributes: true,
    });
  }

  /**
   * @en Reads the response stream into a Buffer while respecting the byte limit.
   * @ru Читает поток ответа в Buffer с соблюдением лимита байтов.
   * @throws {HttpClientError} If response size exceeds maxResponseBytes.
   */
  async readBodyWithLimit(body: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    for await (const chunk of body) {
      receivedBytes += chunk.length;

      if (this.maxResponseBytes > 0 && receivedBytes > this.maxResponseBytes) {
        if (typeof body.destroy === "function") body.destroy();
        throw new HttpClientError(
          `Response size limit exceeded (${this.maxResponseBytes} bytes)`,
          "HTTP_ERROR",
          0,
        );
      }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * @en Decompresses the buffer based on the Content-Encoding header.
   * @ru Декомпрессия данных (gzip, deflate, br) на основе заголовка Content-Encoding.
   */
  async decompress(
    buf: Buffer,
    enc?: string,
    charset: BufferEncoding = "utf-8",
  ): Promise<string> {
    if (!enc || buf.length === 0) return buf.toString(charset);

    try {
      switch (enc.toLowerCase()) {
        case "gzip":
          return (await gunzip(buf)).toString(charset);
        case "deflate":
          return (await inflate(buf)).toString(charset);
        case "br":
          return (await brotliDecompress(buf)).toString(charset);
        default:
          return buf.toString(charset);
      }
    } catch (error) {
      this.logger?.("error", `Decompression failed for encoding ${enc}`, error);
      return buf.toString(charset);
    }
  }

  /**
   * @en Parses the decompressed text content into the requested format.
   * @ru Основной метод парсинга ответа в указанный формат.
   * @param res - Object containing status, headers and raw body buffer.
   * @param responseType - Targeted format (json, xml, text, buffer, auto).
   */
  async parseResponse(
    res: { status: number; headers: Record<string, any>; body: Buffer },
    responseType: ResponseType = "auto",
  ): Promise<any> {
    try {
      const text = await this.decompress(
        res.body,
        res.headers["content-encoding"] as string | undefined,
      );
      const trimmed = text.trim();

      switch (responseType) {
        case "json": {
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            return JSON.parse(trimmed);
          }
          if (trimmed.startsWith("<")) {
            return this.xmlParser.parse(trimmed);
          }
          return { data: trimmed };
        }

        case "xml": {
          if (trimmed.startsWith("<")) return trimmed;
          try {
            const obj = JSON.parse(trimmed);
            const builder = new XMLBuilder({
              format: true,
              indentBy: "  ",
              ignoreAttributes: false,
            });
            return builder.build(obj);
          } catch {
            return text;
          }
        }

        case "text":
          return text;

        case "buffer":
          return res.body;

        case "auto":
        default: {
          const contentType = (res.headers["content-type"] || "").toLowerCase();

          if (
            contentType.includes("json") ||
            trimmed.startsWith("{") ||
            trimmed.startsWith("[")
          ) {
            try {
              return JSON.parse(trimmed);
            } catch {
              return text;
            }
          }
          return text;
        }
      }
    } catch (err: any) {
      throw new HttpClientError(
        `Parsing failed: ${err?.message ?? String(err)}`,
        "PARSING_ERROR",
        res.status,
      );
    }
  }
}
