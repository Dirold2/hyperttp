import { describe, it, expect, beforeEach } from "vitest";
import { HyperClient } from "../src";

describe("HttpClientImproved", () => {
  let client: HyperClient;

  beforeEach(() => {
    client = new HyperClient({
      verbose: false,
      cache: { enabled: true },
      metrics: { enabled: true },
    });
  });

  describe("Core HTTP Methods", () => {
    it("GET возвращает JSON", async () => {
      const data = await client.get("http://localhost:3000/json");
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    }, 10000);

    it("POST отправляет JSON body", async () => {
      const payload = { test: "hyperttp", version: "1.1.0" };
      const response = await client.post("http://localhost:3000/post", payload);

      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
      expect(response).not.toBeNull();
    }, 10000);

    it("HEAD возвращает статус и headers", async () => {
      const head = await client.head("http://localhost:3000/json");
      expect(head.status).toBe(200);
      expect(head.headers["content-type"]).toContain("application/json");
    });
  });

  describe("Кэширование", () => {
    it("повторный GET из кэша", async () => {
      const url = "http://localhost:3000/json";

      await client.get(url);

      await client.get(url);
      const stats = client.getStats();

      expect(stats?.cacheSize).toBe(1);
    });
  });

  describe("Streaming", () => {
    it("stream возвращает чанки", async () => {
      const stream = await client.stream("http://localhost:3000/stream/5");

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
        .request("http://localhost:3000/get")
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
      const noRetryClient = new HyperClient({
        verbose: false,
        retry: {
          maxRetries: 0,
          retryStatusCodes: [],
        },
        network: {
          validateStatus: (status) => status >= 200 && status < 300,
        },
      });

      try {
        await noRetryClient.get("http://localhost:3000/status/404");

        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 2000);

    it("timeout срабатывает", async () => {
      const timeoutClient = new HyperClient({
        network: {
          timeout: 100,
        },

        retry: {
          maxRetries: 0,
          retryStatusCodes: [],
        },
      });

      await expect(
        timeoutClient.get("http://localhost:3000/delay/1"),
      ).rejects.toBeDefined();

      timeoutClient.destroy();
    }, 2000);
  });

  describe("Advanced Features", () => {
    it("собирает метрики", async () => {
      await client.get("http://localhost:3000/json");
      const metrics = client.getAllMetrics();
      await new Promise((resolve) => setTimeout(resolve, 0));
      console.log(metrics);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Performance", () => {
    it("параллельные запросы", async () => {
      const urls = Array(5).fill("http://localhost:3000/json");
      const start = Date.now();

      await Promise.all(urls.map((url) => client.get(url)));
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(3000);
    }, 10000);
  });
});
