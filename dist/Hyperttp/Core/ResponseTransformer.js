"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseTransformer = void 0;
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const fast_xml_parser_1 = require("fast-xml-parser");
const fast_xml_builder_1 = __importDefault(require("fast-xml-builder"));
const Types_1 = require("../../Types");
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const inflate = (0, util_1.promisify)(zlib.inflate);
const brotliDecompress = (0, util_1.promisify)(zlib.brotliDecompress);
/**
 * @class ResponseTransformer
 * @en Handles stream reading, decompression (Gzip/Brotli), and parsing (JSON/XML/Text).
 * @ru Обрабатывает чтение стримов, декомпрессию (Gzip/Brotli) и парсинг (JSON/XML/Text).
 */
class ResponseTransformer {
    maxResponseBytes;
    logger;
    xmlParser;
    constructor(maxResponseBytes = 1024 * 1024, logger) {
        this.maxResponseBytes = maxResponseBytes;
        this.logger = logger;
        this.xmlParser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            allowBooleanAttributes: true,
        });
    }
    /**
     * @en Reads the response stream into a Buffer while respecting the byte limit.
     * @ru Читает поток ответа в Buffer с соблюдением лимита байтов.
     * @throws {HttpClientError} If response size exceeds maxResponseBytes.
     */
    async readBodyWithLimit(body) {
        const chunks = [];
        let receivedBytes = 0;
        for await (const chunk of body) {
            receivedBytes += chunk.length;
            if (this.maxResponseBytes > 0 && receivedBytes > this.maxResponseBytes) {
                if (typeof body.destroy === "function")
                    body.destroy();
                throw new Types_1.HttpClientError(`Response size limit exceeded (${this.maxResponseBytes} bytes)`, "HTTP_ERROR", 0);
            }
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    /**
     * @en Decompresses the buffer based on the Content-Encoding header.
     * @ru Декомпрессия данных (gzip, deflate, br) на основе заголовка Content-Encoding.
     */
    async decompress(buf, enc, charset = "utf-8") {
        if (!enc || buf.length === 0)
            return buf.toString(charset);
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
        }
        catch (error) {
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
    async parseResponse(res, responseType = "auto") {
        try {
            const text = await this.decompress(res.body, res.headers["content-encoding"]);
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
                    if (trimmed.startsWith("<"))
                        return trimmed;
                    try {
                        const obj = JSON.parse(trimmed);
                        const builder = new fast_xml_builder_1.default({
                            format: true,
                            indentBy: "  ",
                            ignoreAttributes: false,
                        });
                        return builder.build(obj);
                    }
                    catch {
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
                    if (contentType.includes("json") ||
                        trimmed.startsWith("{") ||
                        trimmed.startsWith("[")) {
                        try {
                            return JSON.parse(trimmed);
                        }
                        catch {
                            return text;
                        }
                    }
                    return text;
                }
            }
        }
        catch (err) {
            throw new Types_1.HttpClientError(`Parsing failed: ${err?.message ?? String(err)}`, "PARSING_ERROR", res.status);
        }
    }
}
exports.ResponseTransformer = ResponseTransformer;
//# sourceMappingURL=ResponseTransformer.js.map