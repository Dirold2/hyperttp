import { describe, it, expect } from "vitest";
import { Request, PreparedRequest } from "../src";

describe("Request class", () => {
  it("should build URI and full URL correctly", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
      path: "/v1/users",
    });

    req.addQuery({ page: "1", limit: "10" });
    req.addHeaders({ Authorization: "Bearer token" });

    expect(req.getURI()).toBe("https://api.example.com:443/v1/users");
    expect(req.getQueryAsString()).toBe("?page=1&limit=10");
    expect(req.getURL()).toBe("https://api.example.com:443/v1/users?page=1&limit=10");
    expect(req.getHeaders()).toEqual({ Authorization: "Bearer token" });
  });

  it("should handle body data correctly", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
    });

    req.setBodyData({ foo: "bar" });
    expect(req.getBodyData()).toEqual({ foo: "bar" });
    expect(req.getBodyDataString()).toBe("foo=bar");

    req.addBodyData({ baz: "qux" });
    expect(req.getBodyData()).toEqual({ foo: "bar", baz: "qux" });
    expect(req.getBodyDataString()).toBe("foo=bar&baz=qux");
  });

  it("should replace headers, query and body data correctly", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
    });

    req.setHeaders({ A: "1" });
    expect(req.getHeaders()).toEqual({ A: "1" });

    req.addHeaders({ B: "2" });
    expect(req.getHeaders()).toEqual({ A: "1", B: "2" });

    req.setQuery({ q: "search" });
    expect(req.getQuery()).toEqual({ q: "search" });

    req.addQuery({ page: "5" });
    expect(req.getQuery()).toEqual({ q: "search", page: "5" });

    req.setBodyData({ x: "y" });
    expect(req.getBodyData()).toEqual({ x: "y" });

    req.addBodyData({ z: "w" });
    expect(req.getBodyData()).toEqual({ x: "y", z: "w" });
  });
});

describe("PreparedRequest class", () => {
  it("should parse base URL and build full URL correctly", () => {
    const prepReq = new PreparedRequest("https://api.example.com:443");

    prepReq.setPath("/v1/users")
           .addQuery({ page: "2", limit: "5" })
           .addHeaders({ "X-Test": "123" });

    expect(prepReq.getURI()).toBe("https://api.example.com:443/v1/users");
    expect(prepReq.getQueryAsString()).toBe("?page=2&limit=5");
    expect(prepReq.getURL()).toBe("https://api.example.com:443/v1/users?page=2&limit=5");
    expect(prepReq.getHeaders()).toEqual({ "X-Test": "123" });
  });

  it("should handle body data correctly", () => {
    const prepReq = new PreparedRequest("https://api.example.com");
    prepReq.setBodyData({ foo: "bar" });
    expect(prepReq.getBodyData()).toEqual({ foo: "bar" });

    prepReq.addBodyData({ baz: "qux" });
    expect(prepReq.getBodyData()).toEqual({ foo: "bar", baz: "qux" });
  });
});
