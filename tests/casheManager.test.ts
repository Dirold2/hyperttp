import { describe, it, expect, beforeEach } from "vitest";
import { CacheManager } from "../src/Hyperttp/Core/CacheManager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe("Basic Operations", () => {
    it("should set and get a value", async () => {
      await cache.set("key1", "value1");
      const result = await cache.get<string>("key1");
      expect(result).toBe("value1");
    });

    it("should return null for non-existent key", async () => {
      const result = await cache.get<string>("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should check if key exists", async () => {
      await cache.set("key1", "value1");
      expect(await cache.has("key1")).toBe(true);
      expect(await cache.has("nonexistent")).toBe(false);
    });

    it("should delete a key", async () => {
      await cache.set("key1", "value1");
      expect(await cache.has("key1")).toBe(true);

      const deleted = await cache.delete("key1");
      expect(deleted).toBe(true);
      expect(await cache.has("key1")).toBe(false);
    });

    it("should return false when deleting non-existent key", async () => {
      const deleted = await cache.delete("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should clear all entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      expect(cache.size).toBe(2);

      await cache.clear();
      expect(cache.size).toBe(0);
      expect(await cache.has("key1")).toBe(false);
      expect(await cache.has("key2")).toBe(false);
    });
  });

  describe("Cache Size", () => {
    it("should track cache size", async () => {
      expect(cache.size).toBe(0);

      await cache.set("key1", "value1");
      expect(cache.size).toBe(1);

      await cache.set("key2", "value2");
      expect(cache.size).toBe(2);

      await cache.delete("key1");
      expect(cache.size).toBe(1);
    });

    it("should respect max size limit", async () => {
      const smallCache = new CacheManager({ cacheMaxSize: 2 });

      await smallCache.set("key1", "value1");
      await smallCache.set("key2", "value2");
      await smallCache.set("key3", "value3");

      expect(await smallCache.has("key1")).toBe(false);
      expect(await smallCache.has("key2")).toBe(true);
      expect(await smallCache.has("key3")).toBe(true);
    });
  });

  describe("TTL (Time to Live)", () => {
    it("should expire entries after TTL", async () => {
      const shortCache = new CacheManager({ cacheTTL: 100 });

      await shortCache.set("key1", "value1");
      expect(await shortCache.has("key1")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await shortCache.has("key1")).toBe(false);
      expect(await shortCache.get("key1")).toBeUndefined();
    }, 1000);

    it("should update age on get when updateAgeOnGet is true", async () => {
      const shortCache = new CacheManager({ cacheTTL: 200 });

      shortCache.set("key1", "value1");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(await shortCache.get("key1")).toBe("value1");

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(await shortCache.has("key1")).toBe(true);
    }, 1000);
  });

  describe("Type Safety", () => {
    it("should handle different types correctly", async () => {
      await cache.set("string", "hello");
      await cache.set("number", 42);
      await cache.set("boolean", true);
      await cache.set("object", { name: "test" });
      await cache.set("array", [1, 2, 3]);

      expect(await cache.get<string>("string")).toBe("hello");
      expect(await cache.get<number>("number")).toBe(42);
      expect(await cache.get<boolean>("boolean")).toBe(true);
      expect(await cache.get<{ name: string }>("object")).toEqual({
        name: "test",
      });
      expect(await cache.get<number[]>("array")).toEqual([1, 2, 3]);
    });

    it("should return null for wrong type access", async () => {
      await cache.set("number", 42);

      const result = await cache.get<string>("number");
      expect(result).toBe(42);
    });
  });

  describe("Configuration", () => {
    it("should use default values when no options provided", () => {
      const defaultCache = new CacheManager();
      expect(defaultCache.size).toBe(0);
    });

    it("should use custom TTL", async () => {
      const customCache = new CacheManager({ cacheTTL: 5000 });
      await customCache.set("key1", "value1");
      expect(await customCache.has("key1")).toBe(true);
    });

    it("should use custom max size", async () => {
      const customCache = new CacheManager({ cacheMaxSize: 3 });
      await customCache.set("key1", "value1");
      await customCache.set("key2", "value2");
      await customCache.set("key3", "value3");
      await customCache.set("key4", "value4");

      expect(await customCache.has("key1")).toBe(false);
      expect(await customCache.has("key2")).toBe(true);
      expect(await customCache.has("key3")).toBe(true);
      expect(await customCache.has("key4")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string keys", async () => {
      await cache.set("", "empty key value");
      expect(await cache.get<string>("")).toBe("empty key value");
      expect(await cache.has("")).toBe(true);
    });

    it("should handle null and undefined values", async () => {
      await cache.set("null", null);
      await cache.set("undefined", undefined);

      const nullResult = await cache.get("null");
      const undefinedResult = await cache.get("undefined");

      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeUndefined();
    });

    it("should handle complex nested objects", async () => {
      const complexObject = {
        user: {
          id: 1,
          name: "John",
          settings: {
            theme: "dark",
            notifications: true,
          },
        },
        posts: [
          { id: 1, title: "First post" },
          { id: 2, title: "Second post" },
        ],
      };

      cache.set("complex", complexObject);
      const retrieved = await cache.get<typeof complexObject>("complex");

      expect(retrieved).toEqual(complexObject);
      expect(retrieved?.user.name).toBe("John");
      expect(retrieved?.posts.length).toBe(2);
    });
  });
});
