import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClientImproved, PreparedRequest, Request } from "../src";
import { MetricsManager } from "../src/Hyperttp";

const mocks = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock("undici", async () => {
  const actual = await vi.importActual("undici");
  return {
    ...actual,
    request: mocks.mockRequest,
    Agent: class MockAgent {
      constructor() {}
      dispatch() {
        return true;
      }
    },
  };
});

function createMockBody(data: any) {
  const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
  const buffer = Buffer.from(jsonStr);
  return {
    [Symbol.asyncIterator]: async function* () {
      yield buffer;
    },
    arrayBuffer: async () => {
      const uint8 = new Uint8Array(buffer);
      return uint8.buffer.slice(
        uint8.byteOffset,
        uint8.byteOffset + uint8.byteLength,
      );
    },
    text: async () => jsonStr,
    json: async () => (typeof data === "string" ? JSON.parse(data) : data),
  };
}

function createMockResponse(
  data: any,
  status = 200,
  headers = { "content-type": "application/json" },
) {
  return {
    statusCode: status,
    statusText: status === 200 ? "OK" : "Error",
    headers: headers as any,
    trailers: {},
    opaque: false,
    context: { target: {} } as any,
    body: createMockBody(data),
  };
}

describe("HttpClientImproved", () => {
  let client: HttpClientImproved;

  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.mockRequest.mockReset();

    mocks.mockRequest.mockResolvedValue(createMockResponse({ result: "ok" }));

    client = new HttpClientImproved({
      maxRetries: 2,
      cacheTTL: 5000,
      enableQueue: true,
    });

    vi.spyOn(client as any, "queue", "get").mockReturnValue({
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    });
  });

  it("should perform GET request and parse JSON", async () => {
    const res = await client.get("https://httpbin.org/get", "json");
    expect(res).toEqual({ result: "ok" });
  });

  it("should handle Redirects (301 -> 200)", async () => {
    mocks.mockRequest
      .mockResolvedValueOnce({
        statusCode: 301,
        headers: { location: "https://new-url.com" },
        body: createMockBody({}),
      })
      .mockResolvedValueOnce(createMockResponse({ success: true }));

    const res = await client.get("https://old-url.com");
    expect(res).toEqual({ success: true });
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
  });

  it("should handle Retry-After header (429)", async () => {
    const sleepSpy = vi
      .spyOn(client as any, "sleep")
      .mockResolvedValue(undefined);

    mocks.mockRequest
      .mockResolvedValueOnce({
        statusCode: 429,
        headers: { "retry-after": "1" },
        body: createMockBody("Too many requests"),
      })
      .mockResolvedValueOnce(createMockResponse({ result: "after-retry" }));

    const res = await client.get("https://api.com");
    expect(res).toEqual({ result: "after-retry" });
    expect(sleepSpy).toHaveBeenCalledWith(1000);
  });

  it("should apply Request Interceptors", async () => {
    client.addRequestInterceptor(async (config) => {
      config.headers["X-Custom-Auth"] = "secret";
      return config;
    });

    await client.get("https://api.com");
    const callArgs = mocks.mockRequest.mock.calls[0][1];
    expect(callArgs.headers["X-Custom-Auth"]).toBe("secret");
  });

  it("should handle TimeoutError correctly", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mocks.mockRequest.mockRejectedValue(abortError);

    await expect(client.get("https://slow-api.com")).rejects.toThrow(/timeout/);
  });

  it("should cover PUT, PATCH, DELETE methods", async () => {
    mocks.mockRequest.mockResolvedValue(createMockResponse({ ok: true }));

    await client.put("https://api.com/1", { data: 1 });
    await client.patch("https://api.com/1", { data: 1 });
    await client.delete("https://api.com/1");

    expect(mocks.mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "PUT" }),
    );
    expect(mocks.mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(mocks.mockRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("should block requests when Circuit Breaker is open", async () => {
    vi.spyOn((client as any).metricsManager, "isCircuitOpen").mockReturnValue(
      true,
    );

    await expect(client.get("https://broken.com")).rejects.toThrow(
      /Circuit Breaker is OPEN/,
    );
  });

  it("should support HEAD requests and response interceptors", async () => {
    let intercepted = false;
    client.addResponseInterceptor(async (res) => {
      intercepted = true;
      return res;
    });

    mocks.mockRequest.mockResolvedValue({
      statusCode: 200,
      headers: { "x-test": "head" },
      body: createMockBody(null),
    });

    const res = await client.head("https://api.com");
    expect(res.status).toBe(200);
    expect(intercepted).toBe(true);
  });

  it("should handle XML parsing", async () => {
    const xmlContent = "<user><name>John</name></user>";
    mocks.mockRequest.mockResolvedValue(
      createMockResponse(xmlContent, 200, {
        "content-type": "application/xml",
      }),
    );

    const res = await client.get("https://api.com/user.xml", "xml");
    expect(res).toContain("<user");
  });

  it("should correctly build request using fluent API", async () => {
    const customHeaders = { "X-Custom": "value" };
    const queryParams = { search: "test" };
    const bodyData = { foo: "bar" };

    mocks.mockRequest.mockResolvedValueOnce(
      createMockResponse({ success: true }),
    );

    const res = await client
      .request("https://api.com/resource")
      .headers(customHeaders)
      .query(queryParams)
      .body(bodyData)
      .post()
      .timeout(2000)
      .json()
      .send();

    expect(res).toEqual({ success: true });

    const [sentUrl, options] = mocks.mockRequest.mock.calls[0];

    expect(sentUrl).toContain("search=test");
    expect(options.method).toBe("POST");
    expect(options.headers["X-Custom"]).toBe("value");
    expect(options.body).toBeDefined();
  });

  it("should collect metrics and return full stats", async () => {
    const testUrl = "https://metrics-test.org/";
    mocks.mockRequest.mockResolvedValueOnce(createMockResponse({ ok: true }));

    await client.get(testUrl);

    const stats = client.getStats();
    const allMetrics = client.getAllMetrics();
    const specificMetric = client.getMetrics(testUrl);

    expect(stats).toHaveProperty("cacheSize");
    expect(stats).toHaveProperty("inflightRequests");
    expect(Array.isArray(allMetrics)).toBe(true);
    expect(allMetrics.length).toBeGreaterThan(0);
  });

  it("should cover CacheManager cleanup logic", async () => {
    await client.get("https://cache-test.com");

    expect(client.getStats().cacheSize).toBe(1);

    client.clearCache();

    expect(client.getStats().cacheSize).toBe(0);
  });

  it("should cover Request class data handling", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });

    req.setBodyData({ test: "data" });

    expect(req).toBeDefined();

    const internalPath = (req as any).path;
    expect(internalPath).toBeDefined();
  });

  it("should cover all RequestBuilder methods including put, patch, delete", async () => {
    mocks.mockRequest.mockResolvedValue(createMockResponse({ ok: true }));

    await client
      .request("https://api.com/data")
      .query({ v: 1, search: "test" })
      .timeout(1000)
      .headers({ "X-Test": "1" })
      .jsonBody({ item: "value" })
      .put()
      .send();

    expect(mocks.mockRequest).toHaveBeenLastCalledWith(
      expect.stringContaining("search=test"),
      expect.objectContaining({ method: "PUT" }),
    );

    await client.request("https://api.com/data").patch().send();
    await client.request("https://api.com/data").delete().send();

    expect(mocks.mockRequest).toHaveBeenCalledTimes(3);
  });

  it("should handle streaming in RequestBuilder", async () => {
    mocks.mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: {},
      body: createMockBody("stream data"),
    });

    const streamRes = await client.request("https://api.com/stream").stream();
    expect(streamRes.status).toBe(200);
    expect(streamRes.body).toBeDefined();
  });

  it("should cover MetricsManager summary and stats", async () => {
    mocks.mockRequest.mockResolvedValue(createMockResponse({ a: 1 }));

    await client.get("https://api.com/1");
    await client.get("https://api.com/2");

    const stats = client.getStats();
    const allMetrics = client.getAllMetrics();

    expect(stats.inflightRequests).toBe(0);
    expect(allMetrics.length).toBeGreaterThan(0);

    const summary = (client as any).metricsManager.getSummary();
    expect(summary).not.toBeNull();
    expect(summary.totalRequests).toBeGreaterThan(0);
    expect(summary.p99DurationMs).toBeDefined();
  });

  it("should handle decompression failure (lines 405-411)", async () => {
    mocks.mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: { "content-encoding": "gzip" },
      body: createMockBody("not-a-gzip-content"),
    });

    const res = await client.get("https://api.com/bad-gzip");
    expect(typeof res).toBe("string");
  });

  it("should deduplicate concurrent requests (lines 838-848)", async () => {
    mocks.mockRequest.mockResolvedValue(
      new Promise((resolve) =>
        setTimeout(() => resolve(createMockResponse({ ok: 1 })), 50),
      ),
    );

    const [res1, res2] = await Promise.all([
      client.get("https://api.com/dedup"),
      client.get("https://api.com/dedup"),
    ]);

    expect(res1).toEqual(res2);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
  });

  it("should cover different response types in builder", async () => {
    mocks.mockRequest.mockResolvedValue(
      createMockResponse("<xml>ok</xml>", 200, { "content-type": "text/xml" }),
    );

    const xmlRes = await client.request("https://api.com/xml").xml().send();
    expect(xmlRes).toContain("<xml>");

    mocks.mockRequest.mockResolvedValue(
      createMockResponse("plain text", 200, { "content-type": "text/plain" }),
    );
    const textRes = await client.request("https://api.com/text").text().send();
    expect(textRes).toBe("plain text");
  });

  it("should reach 100% coverage for builder and metrics", async () => {
    mocks.mockRequest.mockResolvedValue(createMockResponse({ success: true }));

    await client.request("https://api.com/v1").put().body({ x: 1 }).send();
    await client.request("https://api.com/v1").patch().send();
    await client.request("https://api.com/v1").delete().send();
    await client.request("https://api.com/v1").xml().send();
    await client.request("https://api.com/v1").text().send();

    const stats = client.getStats();
    expect(stats.inflightRequests).toBe(0);

    const allMetrics = client.getAllMetrics();
    expect(allMetrics.length).toBeGreaterThan(0);

    const metrics = (client as any).metricsManager;
    expect(metrics.getScope("not-a-url")).toBe("unknown");
  });

  it("should default to port 80 for http in PreparedRequest", () => {
    const prepReq = new PreparedRequest("http://example.com/api");

    expect(prepReq.getURI()).toBe("http://example.com:80/api");
  });

  it("should cover signal handling and path normalization in Request", () => {
    const req = new Request({ scheme: "https", host: "api.com", port: 443 });

    req.setPath("v1/data");
    expect(req.getURI()).toBe("https://api.com:443/v1/data");

    const controller = new AbortController();
    req.setSignal(controller.signal);
    expect(req.getSignal()).toBe(controller.signal);
  });

  it("should cover PreparedRequest proxy methods", () => {
    const prepReq = new PreparedRequest("https://test.com");

    prepReq
      .setHost("new-host.com")
      .setHeaders({ "X-Custom": "1" })
      .setQuery({ q: "test" })
      .setBodyData({ foo: "bar" });

    expect(prepReq.getURL()).toContain("new-host.com");
    expect(prepReq.getHeaders()).toHaveProperty("X-Custom");
    expect(prepReq.getQuery()).toEqual({ q: "test" });
    expect(prepReq.getBodyDataString()).toBe("foo=bar");
  });

  it("should cover signal and proxy methods in PreparedRequest", () => {
    const prepReq = new PreparedRequest("https://api.test.com");
    const controller = new AbortController();

    prepReq.setSignal(controller.signal);
    expect(prepReq.getSignal()).toBe(controller.signal);

    prepReq
      .setHost("alt-api.com")
      .setHeaders({ Authorization: "test" })
      .setQuery({ v: "1" });

    expect(prepReq.getURL()).toContain("alt-api.com");
  });
});

describe("CacheManager Sync Methods", () => {
  it("should skip null and undefined values in query strings", () => {
    const req = new Request({
      scheme: "https",
      host: "api.com",
      port: 443,
      query: {
        valid: "yes",
        invalid: null,
        missing: undefined,
      },
    });
    const qs = req.getQueryAsString();
    expect(qs).toBe("?valid=yes");
    expect(qs).not.toContain("invalid");
    expect(qs).not.toContain("missing");
    const url = req.getURL();
    expect(url).toBe("https://api.com/?valid=yes");
  });

  it("should return empty string if query is empty", () => {
    const req = new Request({ scheme: "http", host: "test.com", port: 80 });
    expect(req.getQueryAsString()).toBe("");
  });

  it("should handle empty port in getURI", () => {
    const req = new Request({
      scheme: "https",
      host: "api.com",
      port: 0 as any,
    });

    const uri = req.getURI();
    expect(uri).toBe("https://api.com");
    expect(uri).not.toContain(":0");
  });

  it("should proxy signal methods in PreparedRequest", () => {
    const prepReq = new PreparedRequest("https://api.com");
    const controller = new AbortController();

    prepReq.setSignal(controller.signal);
    expect(prepReq.getSignal()).toBe(controller.signal);
  });

  it("should cover decompression variants and logging", async () => {
    const client = new HttpClientImproved({ verbose: true });
    const buf = Buffer.from("test");

    const def = await (client as any).decompress(buf, "deflate");

    const unknown = await (client as any).decompress(buf, "unknown-enc");
    expect(unknown).toBe("test");

    const brokenBuf = Buffer.from([0, 1, 2]);
    const failed = await (client as any).decompress(brokenBuf, "gzip");
    expect(failed).toBe(brokenBuf.toString());
  });

  it("should cover all branches of parseRetryAfterMs", () => {
    const client = new HttpClientImproved();
    const parse = (client as any).parseRetryAfterMs.bind(client);

    expect(parse(null)).toBeUndefined();

    expect(parse(["120"])).toBe(120000);

    const futureDate = new Date(Date.now() + 5000).toUTCString();
    expect(parse(futureDate)).toBeGreaterThan(0);

    expect(parse("not-a-date")).toBeUndefined();
  });

  it("should cover redirect errors and jitterless delay", () => {
    const client = new HttpClientImproved({
      retryOptions: { jitter: false },
    });

    const link = (client as any).resolveRedirect(
      "http://[invalid-url]",
      "http://base.com",
    );
    expect(link).toBe("http://[invalid-url]");

    const delay = (client as any).calcDelay(1);
    expect(delay).toBe(client["retryOptions"].baseDelay * 2);
  });

  it("should cover default options logic", () => {
    const client = new HttpClientImproved();
    const options = (client as any).options;

    expect(options.validateStatus(200)).toBe(true);
    expect(options.validateStatus(500)).toBe(false);

    options.logger("info", "test message", { meta: 1 });
    options.logger("debug", "test");
  });

  it("should destroy stream when limit exceeded", async () => {
    const client = new HttpClientImproved({ maxResponseBytes: 5 });

    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.from("1234567890");
      },
      destroy: vi.fn(),
    };

    await expect((client as any).readBodyWithLimit(mockStream)).rejects.toThrow(
      "Response too large",
    );

    expect(mockStream.destroy).toHaveBeenCalled();
  });

  it("should cover all abortion branches (before, during, and stream)", async () => {
    const client = new HttpClientImproved();

    const controller1 = new AbortController();
    controller1.abort();

    const abortedReq = {
      getURL: () => "https://api.com",
      getHeaders: () => ({}),
      getBodyData: () => undefined,
      getSignal: () => controller1.signal,
    };

    await expect(client.get(abortedReq as any)).rejects.toThrow(
      "Aborted before execution",
    );

    const controller2 = new AbortController();
    controller2.abort();

    const abortedStreamReq = {
      getURL: () => "https://api.com",
      getHeaders: () => ({}),
      getSignal: () => controller2.signal,
    };

    await expect(client.stream(abortedStreamReq as any)).rejects.toThrow(
      "Request aborted before execution",
    );

    const controller3 = new AbortController();

    const promise = client.get({
      getURL: () => "https://api.com",
      getHeaders: () => ({}),
      getBodyData: () => undefined,
      getSignal: () => controller3.signal,
    } as any);

    controller3.abort();

    await expect(promise).rejects.toThrow(/aborted|timeout/i);
  });

  it("should cover parsing branches: JSON, XML, Buffer, Auto", async () => {
    const client = new HttpClientImproved();

    const baseRes = { status: 200, headers: {} };

    await (client as any).parseResponse(
      { ...baseRes, body: Buffer.from("<xml></xml>") },
      "json",
    );

    await (client as any).parseResponse(
      { ...baseRes, body: Buffer.from('{"a":1}') },
      "xml",
    );

    await (client as any).parseResponse(
      { ...baseRes, body: Buffer.from("just text") },
      "xml",
    );

    const buf = await (client as any).parseResponse(
      { ...baseRes, body: Buffer.from("data") },
      "buffer",
    );
    expect(Buffer.isBuffer(buf)).toBe(true);

    await (client as any).parseResponse(
      {
        ...baseRes,
        headers: { "content-type": "application/json" },
        body: Buffer.from("{ bad json"),
      },
      "auto",
    );
  });

  it("should cover retry exhaustion and rate limit errors", async () => {
    const client = new HttpClientImproved({ maxRetries: 1 });

    const mockResponse = {
      statusCode: 429,
      headers: { "retry-after": "0.1" },
      body: createMockBody("Limit"),
    };

    mocks.mockRequest
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockResponse);

    await expect(client.get("https://limit.com")).rejects.toThrow();
  });

  it("should cover logging and metrics clearing", () => {
    const client = new HttpClientImproved({ verbose: true });

    (client as any).log("info", "test");

    client.clearMetrics();

    client.setDefaultHeaders({ Authorization: "Bearer token" });

    expect(client.getCookieJar()).toBeDefined();
  });
});

describe("MetricsManager Coverage", () => {
  it("should cover all branches in MetricsManager", () => {
    const mm = new MetricsManager({ maxHistory: 10, ttl: 5000 });

    const baseMetrics = {
      endTime: Date.now(),
      bytesReceived: 100,
      bytesSent: 50,
      cached: false,
      retries: 0,
      startTime: Date.now(),
    };

    expect(mm.getSummary()).toBeNull();

    mm.record({
      ...baseMetrics,
      url: "not-a-url",
      duration: 100,
      method: "GET",
    });

    mm.record({
      ...baseMetrics,
      url: "https://api.com/v1/test",
      duration: 6000,
      statusCode: 200,
      method: "GET",
    });

    const url = "https://service.com/api/v1/fail";
    mm.clear();
    for (let i = 0; i < 6; i++) {
      mm.record({
        ...baseMetrics,
        url: url,
        duration: 100,
        statusCode: 500,
        method: "POST",
      });
    }

    expect(mm.isCircuitOpen(url)).toBe(true);

    const summary = mm.getSummary();
    expect(summary).not.toBeNull();
    mm.clear();
    expect(mm.getAll().length).toBe(0);
  });
});
