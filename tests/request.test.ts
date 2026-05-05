import { describe, it, expect } from "vitest";
import { Request, PreparedRequest } from "../src";

describe("Request class", () => {
  it("should handle body data correctly", () => {
    const req = new Request({
      scheme: "https",
      host: "api.example.com",
      port: 443,
    });

    req.setBodyData({ foo: "bar" });
    expect(req.getBodyData()).toEqual({ foo: "bar" });
    req.setBodyType("form")
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
  it("should handle body data correctly", () => {
    const prepReq = new PreparedRequest("https://api.example.com");
    prepReq.setBodyData({ foo: "bar" });
    expect(prepReq.getBodyData()).toEqual({ foo: "bar" });

    prepReq.addBodyData({ baz: "qux" });
    expect(prepReq.getBodyData()).toEqual({ foo: "bar", baz: "qux" });
  });

  it("should handle PreparedRequest with complex query parameters", () => {
    const prepReq = new PreparedRequest(
      "https://api.example.com?foo=bar&baz=qux&num=42",
    );

    expect(prepReq.getQuery()).toEqual({ foo: "bar", baz: "qux", num: "42" });
    expect(prepReq.getQueryAsString()).toBe("?foo=bar&baz=qux&num=42");
  });

  it("should handle PreparedRequest body data methods", () => {
    const prepReq = new PreparedRequest("https://api.example.com");

    prepReq.setBodyData({ test: "value" });
    expect(prepReq.getBodyData()).toEqual({ test: "value" });
    prepReq.setBodyType("form")
    expect(prepReq.getBodyDataString()).toBe("test=value");

    prepReq.addBodyData({ another: "data" });
    expect(prepReq.getBodyData()).toEqual({ test: "value", another: "data" });
    expect(prepReq.getBodyDataString()).toBe("test=value&another=data");
  });
});
