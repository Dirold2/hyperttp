import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { HttpClientImproved } from "../src/index.js";

const JSON_API = "https://jsonplaceholder.typicode.com/posts/1";
const POST_API = "http://localhost:3000/post";
const HTML_API = "http://localhost:3000/html";

describe("HttpClient Wrapper", () => {
  let HttpClient: HttpClientImproved;

  beforeEach(() => {
    HttpClient = new HttpClientImproved({
      verbose: true,
    });
  });

  describe("Static get method", () => {
    it("GET returns object", async () => {
      const result = await HttpClient.get(JSON_API);

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
    }, 10000);

    it("GET text returns string", async () => {
      const result = await HttpClient.get(HTML_API, "text");

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(10);
    }, 10000);

    it("GET xml returns XML string", async () => {
      const result = await HttpClient.get(JSON_API, "xml");

      expect(typeof result).toBe("string");
      expect(result).toContain("<");
    }, 10000);
  });

  describe("Static post method", () => {
    it("POST returns response", async () => {
      const testData = { name: "hyperttp", version: "0.2.0" };
      const result = await HttpClient.post(POST_API, testData);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    }, 10000);
  });

  describe("RequestBuilder", () => {
    it("creates RequestBuilder", () => {
      const builder = HttpClient.request(JSON_API);
      expect(builder).toBeDefined();
      expect(typeof builder.send).toBe("function");
    });

    describe("Fluent API", () => {
      it("chain methods work", () => {
        const builder = HttpClient.request(POST_API)
          .headers({ test: "1" })
          .body({ test: 123 })
          .post()
          .json();

        expect(builder).toBeDefined();
      });
    });

    describe("RequestBuilder.send()", () => {
      it("GET by default", async () => {
        const result = await HttpClient.request(JSON_API).send();
        expect(result).toBeDefined();
        expect(typeof result).toBe("object");
      }, 10000);

      it("POST fluent API", async () => {
        const result = await HttpClient.request(POST_API)
          .post()
          .body({ test: "hyperttp" })
          .send();

        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      }, 10000);

      it("text responseType", async () => {
        const result = await HttpClient.request(HTML_API).text().send();
        expect(typeof result).toBe("string");
      }, 10000);

      it("xml responseType", async () => {
        const result = await HttpClient.request(JSON_API).xml().send();
        expect(typeof result).toBe("string");
      }, 10000);
    });
  });

  describe("Cache", () => {
    it("caches repeated requests", async () => {
      const first = await HttpClient.get(JSON_API);
      const second = await HttpClient.get(JSON_API);

      expect(first).toEqual(second);
    }, 10000);

    it("stats returns object", async () => {
      await HttpClient.get(JSON_API);
      const stats = HttpClient.getStats?.();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });
  });
});
