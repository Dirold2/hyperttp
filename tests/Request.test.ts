import { describe, it, expect } from "vitest";
import Request, { PreparedRequest } from "../src/Hyperttp/Request.js";

describe("Request", () => {
  it("builds URL from components", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
      path: "/v1/users",
    });
    expect(req.url).toBe("https://api.example.com/v1/users");
  });

  it("includes query params in URL", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
      path: "/search",
      query: { q: "test", page: "1" },
    });
    const url = new URL(req.url);
    expect(url.searchParams.get("q")).toBe("test");
    expect(url.searchParams.get("page")).toBe("1");
  });

  it("supports method chaining", () => {
    const req = new Request({ scheme: "https", host: "example.com", port: 443 })
      .setPath("/foo")
      .setHeaders({ Authorization: "Bearer token" })
      .addHeaders({ "X-Custom": "val" })
      .setBodyData({ key: "value" })
      .setMethod("POST");

    expect(req.method).toBe("POST");
    expect(req.headers["Authorization"]).toBe("Bearer token");
    expect(req.headers["X-Custom"]).toBe("val");
  });

  it("clones correctly", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      path: "/original",
      headers: { Authorization: "Bearer tok" },
      query: { foo: "bar" },
    });
    const cloned = req.clone();

    expect(cloned.url).toBe(req.url);

    cloned.setPath("/changed");
    expect(req.path).not.toBe(cloned.path);
  });

  it("withQuery creates new request with merged query", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      path: "/search",
      query: { existing: "yes" },
    });
    const withExtra = req.withQuery({ extra: "param" });
    const url = new URL(withExtra.url);
    expect(url.searchParams.get("existing")).toBe("yes");
    expect(url.searchParams.get("extra")).toBe("param");
  });

  it("toFetchInit returns correct RequestInit", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      path: "/data",
    })
      .setBodyData({ hello: "world" })
      .setMethod("POST")
      .setHeaders({ "Content-Type": "application/json" });

    const init = req.toFetchInit();
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"hello":"world"}');
  });

  it("getQueryAsString returns query string", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      query: { a: "1", b: "2" },
    });
    const qs = req.getQueryAsString();
    expect(qs).toContain("a=1");
    expect(qs).toContain("b=2");
  });

  it("getBodyDataString returns JSON for JSON body type", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      bodyData: { foo: "bar" },
    });
    expect(req.getBodyDataString()).toBe('{"foo":"bar"}');
  });

  it("getBodyDataString returns form-encoded for form body type", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      bodyData: { foo: "bar", baz: "qux" },
    }).setBodyType("form");
    const str = req.getBodyDataString();
    expect(str).toContain("foo=bar");
    expect(str).toContain("baz=qux");
  });

  it("meta is Record<string, unknown>", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
      meta: { responseType: "json", traceId: "abc-123" },
    });
    expect(req.meta.responseType).toBe("json");
    expect(req.meta.traceId).toBe("abc-123");
  });

  it("normalizes path", () => {
    const req = new Request({
      scheme: "https",
      host: "example.com",
      port: 443,
    });
    req.setPath("no-leading-slash");
    expect(req.path).toBe("/no-leading-slash");
  });
});

describe("PreparedRequest", () => {
  it("parses full URL", () => {
    const req = new PreparedRequest("https://api.example.com:8080/v2/users?active=true");
    const url = new URL(req.url);
    expect(url.hostname).toBe("api.example.com");
    expect(url.port).toBe("8080");
    expect(url.pathname).toBe("/v2/users");
    expect(url.searchParams.get("active")).toBe("true");
  });

  it("defaults ports correctly", () => {
    const httpsReq = new PreparedRequest("https://example.com/path");
    const httpReq = new PreparedRequest("http://example.com/other");
    expect(new URL(httpsReq.url).port).toBe("");
    expect(new URL(httpReq.url).port).toBe("");
  });
});
