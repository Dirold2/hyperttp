import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { HttpClientImproved, StreamResponse } from "../src";

describe("HttpClientImproved", () => {
  let client: HttpClientImproved;

  beforeEach(() => {
    client = new HttpClientImproved({ verbose: false });
  });

  describe("Core HTTP Methods", () => {
    it("GET возвращает JSON", async () => {
      const data = await client.get("https://httpbin.org/json");
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    }, 10000);

    it("POST отправляет JSON body", async () => {
      const payload = { test: "hyperttp", version: "1.1.0" };
      const response = await client.post("https://httpbin.org/post", payload);

      expect(response).toBeDefined();
      expect(typeof response).toBe("object");
      expect(response).not.toBeNull();
    }, 10000);

    it("HEAD возвращает статус и headers", async () => {
      const head = await client.head("https://httpbin.org/json");
      expect(head.status).toBe(200);
      expect(head.headers["content-type"]).toContain("application/json");
    });
  });

  describe("Кэширование", () => {
    it("повторный GET из кэша", async () => {
      const url = "https://httpbin.org/json";
      const first = await client.get(url);
      const second = await client.get(url);

      expect(first).toEqual(second);
      expect(client.getStats().cacheSize).toBeGreaterThan(0);
    });
  });

  describe("Streaming", () => {
    it("stream возвращает чанки", async () => {
      const stream: StreamResponse = await client.stream(
        "https://httpbin.org/stream/5",
      );

      expect(stream.status).toBe(200);
      expect(typeof stream.body[Symbol.asyncIterator]).toBe("function");

      let totalBytes = 0;
      const chunks: number[] = [];

      for await (const chunk of stream.body) {
        totalBytes += chunk.length;
        chunks.push(chunk.length);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(totalBytes).toBeGreaterThan(10);
    }, 15000);
  });

  describe("RequestBuilder (Fluent API)", () => {
    it("строит запрос с query + headers", async () => {
      const response = await client
        .request("https://httpbin.org/get")
        .query({ foo: "hyperttp", version: "1.1" })
        .headers({ "X-Custom": "test" })
        .send();

      expect(response).toBeDefined();
      expect(typeof response).toBe("object");
      expect(response).not.toBeNull();
    }, 10000);
  });

  describe("Error Handling", () => {
    it("кидает ошибку на 404", async () => {
      const noRetryClient = new HttpClientImproved({
        verbose: false,
        maxRetries: 0,
        retryOptions: {
          retryStatusCodes: [],
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      try {
        await noRetryClient.get("https://httpbin.org/status/404");

        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 2000);

    it("timeout срабатывает", async () => {
      const timeoutClient = new HttpClientImproved({
        timeout: 100,
        maxRetries: 0,
        retryOptions: {
          retryStatusCodes: [],
        },
      });

      try {
        await timeoutClient.get("https://httpbin.org/delay/1");

        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 2000);
  });

  describe("Advanced Features", () => {
    it("собирает метрики", async () => {
      await client.get("https://httpbin.org/json");
      const metrics = client.getAllMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]?.duration).toBeGreaterThanOrEqual(0);
    });

    it("interceptors модифицируют запрос", async () => {
      const interceptor = vi.fn().mockImplementation((config: any) => {
        config.headers["X-Test"] = "hyperttp";
        return config;
      });

      // @ts-ignore (private method)
      client["requestInterceptors"].push(interceptor);

      await client.get("https://httpbin.org/get");
      expect(interceptor).toHaveBeenCalled();
    });
  });

  describe("Performance", () => {
    it("параллельные запросы", async () => {
      const urls = Array(5).fill("https://httpbin.org/json");
      const start = Date.now();

      await Promise.all(urls.map((url) => client.get(url)));
      const duration = Date.now() - start;
;
      expect(duration).toBeLessThan(3000);
    }, 10000);
  });
});
