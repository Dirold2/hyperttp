import { describe, it, expect, vi } from "vitest";
import { ResponseConverter } from "../src";
import * as zlib from "zlib";

function makeIterableBody(chunks: Array<string | Buffer>, withDestroy = false) {
  const destroy = vi.fn();

  const body: any = {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };

  if (withDestroy) {
    body.destroy = destroy;
  }

  return { body, destroy };
}

describe("ResponseConverter", () => {
  it("readBody handles empty, Buffer and arrayBuffer bodies", async () => {
    const converter = new ResponseConverter();

    const empty = await converter.readBody(undefined);
    expect(empty.equals(Buffer.alloc(0))).toBe(true);

    const inputBuffer = Buffer.from("abc");
    const same = await converter.readBody(inputBuffer);
    expect(same).toBe(inputBuffer);

    const abBody = {
      arrayBuffer: async () => {
        const b = Buffer.from("array-buffer");
        const u8 = new Uint8Array(b);
        return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      },
    };

    const fromArrayBuffer = await converter.readBody(abBody);
    expect(fromArrayBuffer.toString("utf-8")).toBe("array-buffer");
  });

  it("readBody enforces maxBodySize and destroys source stream", async () => {
    const converter = new ResponseConverter({ maxBodySize: 3 });
    const { body, destroy } = makeIterableBody(["ab", "cd"], true);

    await expect(converter.readBody(body)).rejects.toThrow(
      "Response size limit exceeded (3 bytes)",
    );
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("decodeBody supports gzip/deflate/br and fallback behavior", async () => {
    const converter = new ResponseConverter();
    const plain = Buffer.from("hello world", "utf-8");

    const gz = await converter.decodeBody(zlib.gzipSync(plain), "gzip");
    expect(gz).toBe("hello world");

    const def = await converter.decodeBody(zlib.deflateSync(plain), "deflate");
    expect(def).toBe("hello world");

    const br = await converter.decodeBody(zlib.brotliCompressSync(plain), "br");
    expect(br).toBe("hello world");

    const unknown = await converter.decodeBody(plain, "unknown");
    expect(unknown).toBe("hello world");

    const invalidGzip = await converter.decodeBody(Buffer.from("bad"), "gzip");
    expect(invalidGzip).toBe("bad");
  });

  it("detectSourceType resolves by content-type, text sample and url", () => {
    const converter = new ResponseConverter();

    expect(converter.detectSourceType("application/json; charset=utf-8", "{}")).toBe(
      "json",
    );
    expect(converter.detectSourceType("text/html", "<html></html>")).toBe("html");
    expect(converter.detectSourceType("application/xml", "<a/> ")).toBe("xml");
    expect(converter.detectSourceType("image/png", "binary")).toBe("buffer");

    expect(converter.detectSourceType(undefined, "hello", "https://x.dev/file.json")).toBe(
      "json",
    );
    expect(converter.detectSourceType(undefined, "hello", "https://x.dev/file.xml")).toBe(
      "xml",
    );
    expect(converter.detectSourceType(undefined, "hello", "https://x.dev/file.htm")).toBe(
      "html",
    );
    expect(converter.detectSourceType(undefined, "hello", "https://x.dev/file.txt")).toBe(
      "text",
    );
  });

  it("convert handles explicit target types", async () => {
    const converter = new ResponseConverter();

    const raw = Buffer.from('{"x":1}', "utf-8");
    expect(await converter.convert(raw, "buffer", { contentType: "application/json" })).toBe(
      raw,
    );
    expect(await converter.convert(raw, "text", { contentType: "application/json" })).toBe(
      '{"x":1}',
    );

    const asJson = await converter.convert(Buffer.from("{bad"), "json", {
      contentType: "text/plain",
    });
    expect(asJson).toEqual({ data: "{bad" });

    const asXmlFromJson = await converter.convert(Buffer.from('{"root":{"n":1}}'), "xml", {
      contentType: "application/json",
    });
    expect(typeof asXmlFromJson).toBe("string");
    expect(String(asXmlFromJson)).toContain("<root>");

    const asHtmlFromJson = await converter.convert(
      Buffer.from('{"title":"ok"}'),
      "html",
      {
        contentType: "application/json",
      },
    );
    expect(asHtmlFromJson).toEqual({ html: { title: "ok" } });
  });

  it("convert auto handles buffer/json/xml/html/text and empty body", async () => {
    const converter = new ResponseConverter();
    const binary = Buffer.from([1, 2, 3]);

    const asBuffer = await converter.convert(binary, "auto", {
      contentType: "application/octet-stream",
    });
    expect(Buffer.isBuffer(asBuffer)).toBe(true);

    const empty = await converter.convert(Buffer.alloc(0), "auto", {
      contentType: "text/plain",
    });
    expect(empty).toBeNull();

    const json = await converter.convert(Buffer.from('{"a":1}'), "auto", {
      contentType: "application/json",
    });
    expect(json).toEqual({ a: 1 });

    const xml = await converter.convert(Buffer.from("<root><a>1</a></root>"), "auto", {
      contentType: "application/xml",
    });
    expect(xml).toEqual({ root: { a: 1 } });

    const html = await converter.convert(
      Buffer.from("<!doctype html><html><head><title>T</title></head><body><h1>H</h1></body></html>"),
      "auto",
      { contentType: "text/html" },
    );
    expect(html).toHaveProperty("title", "T");

    const textToJsonByUrl = await converter.convert(Buffer.from('{"url":"json"}'), "auto", {
      contentType: "text/plain",
      url: "https://api.test.com/file.json",
    });
    expect(textToJsonByUrl).toEqual({ url: "json" });

    const plainText = await converter.convert(Buffer.from("just text"), "auto", {
      contentType: "text/plain",
      url: "https://api.test.com/file.txt",
    });
    expect(plainText).toBe("just text");
  });

  it("toJson path normalizes wrappers and download-info payload", async () => {
    const converter = new ResponseConverter();

    const merged = await converter.convert(Buffer.from('{"result":{"a":1}}'), "json", {
      contentType: "text/plain",
    });
    expect(merged).toEqual({ result: { a: 1 } });

    const downloadInfo = await converter.convert(
      Buffer.from('{"data":{"file":"x"}}'),
      "json",
      {
        contentType: "text/plain",
        url: "https://api.test.com/download-info",
      },
    );
    expect(downloadInfo).toEqual({
      data: {  file: "x" },
    });

    const untouched = await converter.convert(
      Buffer.from('{"downloadInfo":{"id":1}}'),
      "json",
      {
        contentType: "application/json",
      },
    );
    expect(untouched).toEqual({ downloadInfo: { id: 1 } });

    const wrappedText = await converter.convert(Buffer.from("plain-jsonless-text"), "json", {
      contentType: "text/plain",
    });
    expect(wrappedText).toEqual({ data: "plain-jsonless-text" });
  });

  it("toJson detects html/xml by text prefix", async () => {
    const converter = new ResponseConverter();

    const html = await converter.convert(
      Buffer.from("<html><head><title>Hi</title></head><body><p>ok</p></body></html>"),
      "json",
      { contentType: "text/plain" },
    );
    expect(html).toHaveProperty("title", "Hi");

    const xml = await converter.convert(Buffer.from("<root><n>2</n></root>"), "json", {
      contentType: "text/plain",
    });
    expect(xml).toEqual({ root: { n: 2 } });
  });

  it("html parsing options and xml escape branches are covered", async () => {
    const html = "<html><head><title>T</title><meta name='a' content='b'></head><body><h1>H</h1><p>P</p></body></html>";

    const simple = new ResponseConverter({ htmlMode: "simple" });
    const simpleParsed = await simple.convert(Buffer.from(html), "html", {
      contentType: "text/html",
    });
    expect(simpleParsed).toEqual({ title: "T", text: "HP" });

    const noParse = new ResponseConverter({ parseHTML: false });
    const rawHtml = await noParse.convert(Buffer.from(html), "html", {
      contentType: "text/html",
    });
    expect(rawHtml).toBe(html);

    const escapedXml = await noParse.convert(Buffer.from("a < b & c \"q\" 's'"), "xml", {
      contentType: "text/plain",
    });
    expect(escapedXml).toBe(
      "<root>a &lt; b &amp; c &quot;q&quot; &apos;s&apos;</root>",
    );
  });

  it("toBuffer converts string/object and keeps Buffer", () => {
    const converter = new ResponseConverter();

    const buf = Buffer.from("x");
    expect(converter.toBuffer(buf)).toBe(buf);
    expect(converter.toBuffer("abc").toString("utf-8")).toBe("abc");
    expect(converter.toBuffer({ a: 1 }).toString("utf-8")).toBe('{"a":1}');
  });
});
