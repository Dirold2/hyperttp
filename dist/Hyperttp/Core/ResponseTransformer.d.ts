import { ResponseType, LogLevel } from "../../Types";
/**
 * @class ResponseTransformer
 * @en Handles stream reading, decompression (Gzip/Brotli), and parsing (JSON/XML/Text).
 * @ru Обрабатывает чтение стримов, декомпрессию (Gzip/Brotli) и парсинг (JSON/XML/Text).
 */
export declare class ResponseTransformer {
    private maxResponseBytes;
    private logger?;
    private xmlParser;
    constructor(maxResponseBytes?: number, logger?: ((level: LogLevel, message: string, meta?: any) => void) | undefined);
    /**
     * @en Reads the response stream into a Buffer while respecting the byte limit.
     * @ru Читает поток ответа в Buffer с соблюдением лимита байтов.
     * @throws {HttpClientError} If response size exceeds maxResponseBytes.
     */
    readBodyWithLimit(body: any): Promise<Buffer>;
    /**
     * @en Decompresses the buffer based on the Content-Encoding header.
     * @ru Декомпрессия данных (gzip, deflate, br) на основе заголовка Content-Encoding.
     */
    decompress(buf: Buffer, enc?: string, charset?: BufferEncoding): Promise<string>;
    /**
     * @en Parses the decompressed text content into the requested format.
     * @ru Основной метод парсинга ответа в указанный формат.
     * @param res - Object containing status, headers and raw body buffer.
     * @param responseType - Targeted format (json, xml, text, buffer, auto).
     */
    parseResponse(res: {
        status: number;
        headers: Record<string, any>;
        body: Buffer;
    }, responseType?: ResponseType): Promise<any>;
}
//# sourceMappingURL=ResponseTransformer.d.ts.map