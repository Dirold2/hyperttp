import { describe, it, expect, beforeEach } from "vitest";
import { CacheManager } from "../src/Hyperttp/Core/CacheManager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe("Basic Operations", () => {
    it("should set and get a value", () => {
      cache.set("key1", "value1");
      const result = cache.get<string>("key1");
      expect(result).toBe("value1");
    });

    it("should return null for non-existent key", () => {
      const result = cache.get<string>("nonexistent");
      expect(result).toBeNull();
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should delete a key", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      
      const deleted = cache.delete("key1");
      expect(deleted).toBe(true);
      expect(cache.has("key1")).toBe(false);
    });

    it("should return false when deleting non-existent key", () => {
      const deleted = cache.delete("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
      
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });
  });

  describe("Cache Size", () => {
    it("should track cache size", () => {
      expect(cache.size).toBe(0);
      
      cache.set("key1", "value1");
      expect(cache.size).toBe(1);
      
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
      
      cache.delete("key1");
      expect(cache.size).toBe(1);
    });

    it("should respect max size limit", () => {
      const smallCache = new CacheManager({ cacheMaxSize: 2 });
      
      smallCache.set("key1", "value1");
      smallCache.set("key2", "value2");
      smallCache.set("key3", "value3");
      
      expect(smallCache.has("key1")).toBe(false);
      expect(smallCache.has("key2")).toBe(true);
      expect(smallCache.has("key3")).toBe(true);
    });
  });

  describe("TTL (Time to Live)", () => {
    it("should expire entries after TTL", async () => {
      const shortCache = new CacheManager({ cacheTTL: 100 });
      
      shortCache.set("key1", "value1");
      expect(shortCache.has("key1")).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortCache.has("key1")).toBe(false);
      expect(shortCache.get("key1")).toBeNull();
    }, 1000);

    it("should update age on get when updateAgeOnGet is true", async () => {
      const shortCache = new CacheManager({ cacheTTL: 200 });
      
      shortCache.set("key1", "value1");
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shortCache.get("key1")).toBe("value1");
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortCache.has("key1")).toBe(true);
    }, 1000);
  });

  describe("Type Safety", () => {
    it("should handle different types correctly", () => {
      cache.set("string", "hello");
      cache.set("number", 42);
      cache.set("boolean", true);
      cache.set("object", { name: "test" });
      cache.set("array", [1, 2, 3]);

      expect(cache.get<string>("string")).toBe("hello");
      expect(cache.get<number>("number")).toBe(42);
      expect(cache.get<boolean>("boolean")).toBe(true);
      expect(cache.get<{ name: string }>("object")).toEqual({ name: "test" });
      expect(cache.get<number[]>("array")).toEqual([1, 2, 3]);
    });

    it("should return null for wrong type access", () => {
      cache.set("number", 42);
      
      const result = cache.get<string>("number");
      expect(result).toBe(42);
    });
  });

  describe("Configuration", () => {
    it("should use default values when no options provided", () => {
      const defaultCache = new CacheManager();
      expect(defaultCache.size).toBe(0);
    });

    it("should use custom TTL", () => {
      const customCache = new CacheManager({ cacheTTL: 5000 });
      customCache.set("key1", "value1");
      expect(customCache.has("key1")).toBe(true);
    });

    it("should use custom max size", () => {
      const customCache = new CacheManager({ cacheMaxSize: 3 });
      customCache.set("key1", "value1");
      customCache.set("key2", "value2");
      customCache.set("key3", "value3");
      customCache.set("key4", "value4");
      
      expect(customCache.has("key1")).toBe(false);
      expect(customCache.has("key2")).toBe(true);
      expect(customCache.has("key3")).toBe(true);
      expect(customCache.has("key4")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string keys", () => {
      cache.set("", "empty key value");
      expect(cache.get<string>("")).toBe("empty key value");
      expect(cache.has("")).toBe(true);
    });

    it("should handle null and undefined values", () => {
      cache.set("null", null);
      cache.set("undefined", undefined);
      
      const nullResult = cache.get("null");
      const undefinedResult = cache.get("undefined");
      
      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeNull();
    });

    it("should handle complex nested objects", () => {
      const complexObject = {
        user: {
          id: 1,
          name: "John",
          settings: {
            theme: "dark",
            notifications: true
          }
        },
        posts: [
          { id: 1, title: "First post" },
          { id: 2, title: "Second post" }
        ]
      };

      cache.set("complex", complexObject);
      const retrieved = cache.get<typeof complexObject>("complex");
      
      expect(retrieved).toEqual(complexObject);
      expect(retrieved?.user.name).toBe("John");
      expect(retrieved?.posts.length).toBe(2);
    });
  });
});