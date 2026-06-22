import { describe, it, expect } from "vitest";
import { appendQueryToUrl } from "../src/Hyperttp/Utils/query.js";

describe("appendQueryToUrl", () => {
  it("adds query params to a plain URL", () => {
    const result = appendQueryToUrl("http://example.com/api", { foo: "bar", num: "42" });
    const url = new URL(result);
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.get("num")).toBe("42");
  });

  it("merges with existing query params", () => {
    const result = appendQueryToUrl("http://example.com/api?existing=true", { foo: "bar" });
    const url = new URL(result);
    expect(url.searchParams.get("existing")).toBe("true");
    expect(url.searchParams.get("foo")).toBe("bar");
  });

  it("handles array values", () => {
    const result = appendQueryToUrl("http://example.com/api", { tags: ["a", "b", "c"] });
    const url = new URL(result);
    expect(url.searchParams.getAll("tags")).toEqual(["a", "b", "c"]);
  });

  it("skips null and undefined values", () => {
    const result = appendQueryToUrl("http://example.com/api", {
      a: "valid",
      b: null,
      c: undefined,
    });
    const url = new URL(result);
    expect(url.searchParams.get("a")).toBe("valid");
    expect(url.searchParams.get("b")).toBeNull();
    expect(url.searchParams.get("c")).toBeNull();
  });

  it("skips null and undefined in arrays", () => {
    const result = appendQueryToUrl("http://example.com/api", {
      items: ["a", null, "b", undefined],
    });
    const url = new URL(result);
    expect(url.searchParams.getAll("items")).toEqual(["a", "b"]);
  });

  it("handles boolean and number values", () => {
    const result = appendQueryToUrl("http://example.com/api", {
      flag: true,
      count: 5,
    });
    const url = new URL(result);
    expect(url.searchParams.get("flag")).toBe("true");
    expect(url.searchParams.get("count")).toBe("5");
  });

  it("returns original URL for empty query", () => {
    const result = appendQueryToUrl("http://example.com/api", {});
    expect(result).toBe("http://example.com/api");
  });

  it("preserves original URL when URL is invalid", () => {
    const result = appendQueryToUrl("not-a-valid-url", { foo: "bar" });
    expect(result).toBe("not-a-valid-url");
  });

  it("overrides existing params with set", () => {
    const result = appendQueryToUrl("http://example.com/api?foo=old", { foo: "new" });
    const url = new URL(result);
    expect(url.searchParams.get("foo")).toBe("new");
  });
});
