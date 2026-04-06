import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { HttpClientImproved, Request } from "../src";

function createMockBody(data: any) {
  const jsonStr = JSON.stringify(data);
  const buffer = Buffer.from(jsonStr);
  return {
    [Symbol.asyncIterator]: async function* () {
      yield buffer;
    },
    arrayBuffer: async () => {
      // Return a fresh ArrayBuffer containing only the JSON data
      const uint8 = new Uint8Array(buffer);
      return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    },
    text: async () => jsonStr,
    json: async () => data,
  };
}

function createMockResponse(data: any, status = 200, headers = { "content-type": "application/json" }) {
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
    mocks.mockRequest.mockReset();

    mocks.mockRequest.mockResolvedValue(createMockResponse({ result: "ok" }));

    client = new HttpClientImproved({ maxRetries: 2, cacheTTL: 5000 });

    vi.spyOn(client as any, "queue", "get").mockReturnValue({
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    });
  });

  it("should perform GET request and parse JSON", async () => {
    const req = new Request({
      scheme: "https",
      host: "httpbin.org",
      port: 443,
    });
    const res = await client.get(req, "json");
    expect(res).toEqual({ result: "ok" });
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
  });

  it("should cache GET requests", async () => {
    const req = new Request({
      scheme: "https",
      host: "httpbin.org",
      port: 443,
    });

    await client.get(req);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);

    await client.get(req);
    expect(mocks.mockRequest).toHaveBeenCalledTimes(1);
  });

  it("should retry failed requests", async () => {
    const errorClient = new HttpClientImproved({ maxRetries: 1 });

    vi.spyOn(errorClient as any, "queue", "get").mockReturnValue({
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    });

    mocks.mockRequest
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(createMockResponse({ result: "ok" }));

    const req = new Request({
      scheme: "https",
      host: "httpbin.org",
      port: 443,
    });
    const res = await errorClient.get(req, "json");

    expect(res).toEqual({ result: "ok" });
    expect(mocks.mockRequest).toHaveBeenCalledTimes(2);
  });

  it("should POST data correctly", async () => {
    const req = new Request({
      scheme: "https",
      host: "httpbin.org",
      port: 443,
    });
    req.setBodyData({ foo: "bar" });
    const res = await client.post(req, "json");
    expect(res).toEqual({ result: "ok" });
  });

  it("should clear cache", async () => {
    const req = new Request({
      scheme: "https",
      host: "httpbin.org",
      port: 443,
    });
    await client.get(req, "json");
    client.clearCache();

    const cache = await (client as any).cache.get(
      "GET:https://httpbin.org:443/",
    );
    expect(cache).toBeUndefined();
  });
});