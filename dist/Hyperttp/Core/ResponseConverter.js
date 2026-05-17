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
exports.ResponseConverter = void 0;
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const fast_xml_parser_1 = require("fast-xml-parser");
const fast_xml_builder_1 = __importDefault(require("fast-xml-builder"));
const cheerio = __importStar(require("cheerio"));
const gunzip = (0, util_1.promisify)(zlib.gunzip);
const inflate = (0, util_1.promisify)(zlib.inflate);
const brotliDecompress = (0, util_1.promisify)(zlib.brotliDecompress);
function normalizeContentType(ct) {
    if (!ct)
        return undefined;
    return ct.split(";")[0].trim().toLowerCase();
}
class ResponseConverter {
    options;
    xmlParser;
    xmlBuilder;
    constructor(options = {}) {
        this.options = options;
        this.xmlParser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseTagValue: true,
            parseAttributeValue: true,
            trimValues: true,
        });
        this.xmlBuilder = new fast_xml_builder_1.default({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true,
        });
    }
    async readBody(body) {
        if (!body)
            return Buffer.alloc(0);
        if (Buffer.isBuffer(body)) {
            return body;
        }
        if (typeof body.arrayBuffer === "function") {
            return Buffer.from(await body.arrayBuffer());
        }
        const chunks = [];
        let received = 0;
        const max = this.options.maxBodySize ?? 0;
        for await (const chunk of body) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            received += buf.length;
            if (max > 0 && received > max) {
                if (typeof body.destroy === "function") {
                    body.destroy();
                }
                throw new Error(`Response size limit exceeded (${max} bytes)`);
            }
            chunks.push(buf);
        }
        return Buffer.concat(chunks);
    }
    async decodeBody(body, encoding, charset = this.options.charset ?? "utf-8") {
        if (!encoding || body.length === 0) {
            return body.toString(charset);
        }
        try {
            switch (encoding.toLowerCase()) {
                case "gzip":
                    return (await gunzip(body)).toString(charset);
                case "deflate":
                    return (await inflate(body)).toString(charset);
                case "br":
                    return (await brotliDecompress(body)).toString(charset);
                default:
                    return body.toString(charset);
            }
        }
        catch {
            return body.toString(charset);
        }
    }
    detectSourceType(contentType, text, url) {
        const ct = normalizeContentType(contentType)?.replace(/\s+/g, "");
        const sample = (text || "").trimStart().slice(0, 512).toLowerCase();
        const isHtml = ct === "text/html" ||
            sample.includes("<!doctype html") ||
            sample.includes("<html") ||
            sample.includes("<head") ||
            sample.includes("<body");
        const isJson = ct === "application/json" ||
            ct?.endsWith("+json") ||
            sample.startsWith("{") ||
            sample.startsWith("[");
        const isXml = ct === "application/xml" ||
            ct === "text/xml" ||
            (sample.startsWith("<") && !isHtml);
        if (ct?.startsWith("image/") ||
            ct?.startsWith("audio/") ||
            ct?.startsWith("video/") ||
            ct === "application/octet-stream") {
            return "buffer";
        }
        if (isJson)
            return "json";
        if (isHtml)
            return "html";
        if (isXml)
            return "xml";
        if (url) {
            const lower = url.toLowerCase();
            if (lower.includes(".json"))
                return "json";
            if (lower.includes(".xml"))
                return "xml";
            if (lower.includes(".html") || lower.includes(".htm"))
                return "html";
        }
        return "text";
    }
    async convert(body, targetType, meta = {}) {
        const text = await this.decodeBody(body, meta.contentEncoding, this.options.charset ?? "utf-8");
        const sourceType = this.detectSourceType(meta.contentType, text, meta.url);
        const trimmed = text.trim();
        switch (targetType) {
            case "buffer":
                return body;
            case "text":
                return text;
            case "json":
                return this.toJson(trimmed, sourceType, meta.url);
            case "xml":
                return this.toXml(trimmed, sourceType);
            case "html":
                return this.toHtml(trimmed, sourceType);
            case "auto":
            default:
                return this.toAuto(trimmed, sourceType, meta.url, body);
        }
    }
    toAuto(text, sourceType, url, rawBody) {
        if (sourceType === "buffer") {
            return rawBody ?? Buffer.alloc(0);
        }
        if (!text)
            return null;
        switch (sourceType) {
            case "json":
                return this.safeJsonParse(text);
            case "xml":
                return this.xmlParser.parse(text);
            case "html":
                return this.htmlToJson(text);
            case "text":
            default:
                if (url &&
                    (url.toLowerCase().endsWith(".json") ||
                        text.startsWith("{") ||
                        text.startsWith("["))) {
                    return this.safeJsonParse(text);
                }
                return text;
        }
    }
    toJson(text, sourceType, url) {
        if (!text)
            return null;
        if (sourceType === "json") {
            return this.safeJsonParse(text);
        }
        if (sourceType === "xml") {
            return this.xmlParser.parse(text);
        }
        if (sourceType === "html") {
            return this.htmlToJson(text);
        }
        if (url && url.toLowerCase().includes("/download-info")) {
            const parsed = this.safeJsonParse(text);
            return this.normalizeResponseShape(parsed, url);
        }
        if (text.startsWith("{") || text.startsWith("[")) {
            const parsed = this.safeJsonParse(text);
            return this.normalizeResponseShape(parsed, url);
        }
        if (text.startsWith("<")) {
            if (text.startsWith("<html") || text.startsWith("<!doctype html")) {
                return this.htmlToJson(text);
            }
            return this.xmlParser.parse(text);
        }
        return {
            data: text,
        };
    }
    toXml(text, sourceType) {
        if (!text)
            return "";
        if (sourceType === "xml") {
            return text;
        }
        if (sourceType === "json") {
            const parsed = this.safeJsonParse(text);
            return this.xmlBuilder.build(parsed);
        }
        if (sourceType === "html") {
            const json = this.htmlToJson(text);
            return this.xmlBuilder.build(json);
        }
        return `<root>${this.escapeXml(text)}</root>`;
    }
    toHtml(text, sourceType) {
        if (!text)
            return null;
        if (sourceType === "html") {
            return this.htmlToJson(text);
        }
        if (sourceType === "json") {
            const parsed = this.safeJsonParse(text);
            return {
                html: parsed,
            };
        }
        if (sourceType === "xml") {
            const parsed = this.xmlParser.parse(text);
            return {
                xml: parsed,
            };
        }
        return this.htmlToJson(text);
    }
    htmlToJson(html) {
        if (this.options.parseHTML === false) {
            return html;
        }
        const $ = cheerio.load(html);
        if (this.options.htmlMode === "simple") {
            return {
                title: $("title").text(),
                text: $("body").text().trim(),
            };
        }
        const result = {
            title: $("title").text() || undefined,
            meta: {},
            body: {
                text: $("body").text().trim(),
            },
        };
        $("meta").each((_, el) => {
            const name = $(el).attr("name") || $(el).attr("property") || $(el).attr("charset");
            const content = $(el).attr("content") || $(el).attr("value") || "";
            if (name) {
                result.meta[name] = content;
            }
        });
        $("body")
            .children()
            .each((_, el) => {
            const tag = el.tagName?.toLowerCase();
            if (!tag)
                return;
            const text = $(el).text().trim();
            if (!text)
                return;
            if (!result.body[tag]) {
                result.body[tag] = [];
            }
            result.body[tag].push(text);
        });
        return result;
    }
    safeJsonParse(text) {
        if (!text)
            return null;
        try {
            return JSON.parse(text);
        }
        catch {
            return { data: text };
        }
    }
    normalizeResponseShape(value, url) {
        if (value === null || value === undefined)
            return value;
        if (Array.isArray(value))
            return value;
        if (typeof value !== "object")
            return value;
        const obj = value;
        if (obj.downloadInfo !== undefined) {
            return value;
        }
        if (url?.includes("/download-info")) {
            const candidate = obj.result ?? obj.data ?? obj.response ?? obj;
            if (candidate && typeof candidate === "object") {
                if (Array.isArray(candidate)) {
                    return {
                        ...obj,
                        downloadInfo: candidate,
                    };
                }
                return {
                    ...obj,
                    ...candidate,
                    downloadInfo: candidate.downloadInfo ?? candidate,
                };
            }
        }
        const wrapper = obj.result ?? obj.data ?? obj.response;
        if (wrapper && typeof wrapper === "object" && !Array.isArray(wrapper)) {
            return {
                ...obj,
                ...wrapper,
            };
        }
        return value;
    }
    escapeXml(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
    toBuffer(input) {
        if (Buffer.isBuffer(input))
            return input;
        if (typeof input === "string")
            return Buffer.from(input, "utf-8");
        return Buffer.from(JSON.stringify(input), "utf-8");
    }
}
exports.ResponseConverter = ResponseConverter;
//# sourceMappingURL=ResponseConverter.js.map