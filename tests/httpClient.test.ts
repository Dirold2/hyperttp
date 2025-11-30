import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClientImproved, Request } from "../src";

const mockRequest = vi.hoisted(() => vi.fn());
vi.mock("undici", () => ({
  Agent: class MockAgent {
    compose() {
      return this; // Return itself for chaining
    }
  },
  request: mockRequest,
}));

describe("HttpClientImproved", () => {
  let client: HttpClientImproved;

  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        arrayBuffer: async () => Buffer.from(JSON.stringify({ result: "ok" })),
      },
    });

    client = new HttpClientImproved({ maxRetries: 2, cacheTTL: 5000 });

    // Мокаем queue.enqueue, чтобы retry и ошибки отрабатывались корректно
    vi.spyOn(client as any, "queue", "get").mockReturnValue({
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    });
  });

  it("should perform GET request and parse JSON", async () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });
    const res = await client.get(req, "json");
    expect(res).toEqual({ result: "ok" });
  });

  it("should cache GET requests", async () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });

    // Первый запрос вызывает undici.request
    await client.get(req);
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Второй запрос берётся из кеша
    await client.get(req);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("should retry failed requests", async () => {
    const errorClient = new HttpClientImproved({ maxRetries: 1 });

    // Мокаем queue.enqueue, чтобы callback вызывался напрямую
    vi.spyOn(errorClient as any, "queue", "get").mockReturnValue({
      enqueue: async (cb: any) => cb(),
      queuedCount: 0,
      activeCount: 0,
    });

    mockRequest
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          arrayBuffer: async () =>
            Buffer.from(JSON.stringify({ result: "ok" })),
        },
      });

    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });
    const res = await errorClient.get(req, "json");

    expect(res).toEqual({ result: "ok" });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("should POST data correctly", async () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });
    req.setBodyData({ foo: "bar" });
    const res = await client.post(req, "json");
    expect(res).toEqual({ result: "ok" });
  });

  it("should clear cache", async () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });
    await client.get(req, "json");
    client.clearCache();

    // Новый вызов кеша должен вернуть null
    const cache = (client as any).cache.get("GET:https://example.com:443:");
    expect(cache).toBeNull();
  });
});
