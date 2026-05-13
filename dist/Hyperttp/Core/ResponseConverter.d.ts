import { ResponseType, SourceType } from "../../Types/http";
import { ConversionMeta } from "../../Types/request";
import { ResponseConverterOptions, ParsedResponse } from "../../Types/response";
export declare class ResponseConverter {
    private readonly options;
    private readonly xmlParser;
    private readonly xmlBuilder;
    constructor(options?: ResponseConverterOptions);
    readBody(body: any): Promise<Buffer>;
    decodeBody(body: Buffer, encoding?: string, charset?: BufferEncoding): Promise<string>;
    detectSourceType(contentType?: string, text?: string, url?: string): SourceType;
    convert(body: Buffer, targetType: ResponseType, meta?: ConversionMeta): Promise<ParsedResponse>;
    private toAuto;
    private toJson;
    private toXml;
    private toHtml;
    private htmlToJson;
    private safeJsonParse;
    private normalizeResponseShape;
    private escapeXml;
    toBuffer(input: any): Buffer;
}
//# sourceMappingURL=ResponseConverter.d.ts.map