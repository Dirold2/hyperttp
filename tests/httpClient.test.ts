import { describe, it, expect, vi, beforeEach } from "vitest";
import { HyperClient, PreparedRequest, Request } from "../src";
import { MetricsManager } from "@hyperttp/metrics";

const mocks = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

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
  let client: HyperClient;

  beforeEach(async () => {
    vi.restoreAllMocks();
    mocks.mockRequest.mockReset();
    mocks.mockRequest.mockResolvedValue(createMockResponse({ result: "ok" }));
    const mockRequest = vi.fn();

    client = new HyperClient({
      retry: { maxRetries: 2 },
      cache: { enabled: true, ttl: 5000 },
      queue: { enabled: true },
      metrics: { enabled: true, maxHistory: 10, ttl: 5000 },
      interceptors: { enabled: true },
    });

    (client as any).dispatch = mockRequest;

    (client as any).queue = {
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    };
  });

  it("should perform GET request and parse JSON", async () => {
    const res = await client.get("http://localhost:3000/json", "json");
    console.log(res);
    expect(res).toEqual(expect.objectContaining({ ok: true }));
  });

  it("should cover CacheManager cleanup logic", async () => {
    await client.get("http://localhost:3000/cache");

    expect(client.getStats()?.cacheSize).toBe(1);

    client.clearCache();

    expect(client.getStats()?.cacheSize).toBe(1);
  });

  it("should cover Request class data handling", () => {
    const req = new Request({
      scheme: "http",
      host: "localhost",
      port: 3000,
    });

    req.setBodyData({ test: "data" });
    expect(req).toBeDefined();

    const internalPath = (req as any).path;
    expect(internalPath).toBeDefined();
  });

  it("should handle decompression failure (lines 405-411)", async () => {
    mocks.mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      headers: { "content-encoding": "gzip" },
      body: createMockBody("not-a-gzip-content"),
    });

    const res = await client.get("http://localhost:3000/status/200");
    expect(typeof res).toBe("object");
  });

  it("should cover PreparedRequest proxy methods", () => {
    const prepReq = new PreparedRequest("http://localhost:3000");

    prepReq
      .setHost("localhost")
      .setHeaders({ "X-Custom": "1" })
      .setQuery({ q: "test" })
      .setBodyData({ foo: "bar" });

    expect(prepReq.getURL()).toContain("localhost");
    expect(prepReq.getHeaders()).toHaveProperty("X-Custom");
    expect(prepReq.getQuery()).toEqual({ q: "test" });
    prepReq.setBodyType("form");
    expect(prepReq.getBodyDataString()).toBe("foo=bar");
  });

  it("should cover signal and proxy methods in PreparedRequest", () => {
    const prepReq = new PreparedRequest("http://localhost:3000");
    const controller = new AbortController();

    prepReq.setSignal(controller.signal);
    expect(prepReq.getSignal()).toBe(controller.signal);

    prepReq
      .setHost("localhost")
      .setHeaders({ Authorization: "test" })
      .setQuery({ v: "1" });

    expect(prepReq.getURL()).toContain("localhost");
  });
});

describe("CacheManager Sync Methods", () => {
  it("should skip null and undefined values in query strings", () => {
    const req = new Request({
      scheme: "http",
      host: "localhost",
      port: 3000,
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
    expect(url).toBe("http://localhost:3000/?valid=yes");
  });

  it("should return empty string if query is empty", () => {
    const req = new Request({ scheme: "http", host: "localhost", port: 3000 });
    expect(req.getQueryAsString()).toBe("");
  });

  it("should proxy signal methods in PreparedRequest", () => {
    const prepReq = new PreparedRequest("http://localhost:3000");
    const controller = new AbortController();

    prepReq.setSignal(controller.signal);
    expect(prepReq.getSignal()).toBe(controller.signal);
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
      url: "http://localhost:3000/json",
      duration: 6000,
      statusCode: 200,
      method: "GET",
    });

    const url = "http://localhost:3000/status/500";
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
