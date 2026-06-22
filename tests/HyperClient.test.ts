import { describe, it, expect, beforeAll } from "vitest";
import { HyperClient, RequestBuilder } from "../src/index.js";

const BASE = "http://127.0.0.1:3000";

describe("HyperClient", () => {
  let client: HyperClient;

  beforeAll(() => {
    client = new HyperClient();
  });

  it("performs GET and parses JSON", async () => {
    const res = await client.get<{ ok: boolean; timestamp: number }>(`${BASE}/json`);
    expect(res).toBeTypeOf("object");
    expect(res.ok).toBe(true);
    expect(res.timestamp).toBeTypeOf("number");
  });

  it("performs GET and returns text", async () => {
    const res = await client.get<string>(`${BASE}/get`, "text");
    expect(res).toContain("method=GET");
  });

  it("performs POST with body", async () => {
    const res = await client.post<string>(
      `${BASE}/post`,
      "text",
      "hello-body",
    );
    expect(res).toContain("method=POST");
    expect(res).toContain("hello-body");
  });

  it("performs HEAD request", async () => {
    const res = await client.head(`${BASE}/json`);
    expect(res.status).toBe(200);
    expect(res.headers).toBeTypeOf("object");
  });

  it("performs status code requests", async () => {
    const res404 = await client.get(`${BASE}/status/404`);
    expect((res404 as any).status).toBe(404);
  });

  it("handles empty client config", () => {
    const c = new HyperClient();
    expect(c).toBeInstanceOf(HyperClient);
  });

  it("extend creates new client with merged config", () => {
    const c1 = new HyperClient({ verbose: true });
    const c2 = c1.extend({ verbose: false });
    expect(c2).toBeInstanceOf(HyperClient);
    expect(c2).not.toBe(c1);
  });

  it("create alias works", () => {
    const c1 = new HyperClient();
    const c2 = c1.create({ verbose: true });
    expect(c2).toBeInstanceOf(HyperClient);
  });

  it("stream returns stream response", async () => {
    const res = await client.stream(`${BASE}/stream`);
    expect(res).toBeDefined();
  });
});

describe("RequestBuilder", () => {
  let client: HyperClient;

  beforeAll(() => {
    client = new HyperClient();
  });

  it("sends GET request", async () => {
    const res = await new RequestBuilder(`${BASE}/json`, client)
      .get()
      .send<{ ok: boolean }>();
    expect(res.ok).toBe(true);
  });

  it("sends POST with JSON body", async () => {
    const res = await new RequestBuilder(`${BASE}/post`, client)
      .post()
      .jsonBody({ data: "test" })
      .text()
      .send<string>();
    expect(res).toContain("POST");
  });

  it("sends with query params", async () => {
    const res = await new RequestBuilder(`${BASE}/get`, client)
      .get()
      .query({ foo: "bar", baz: "qux" })
      .text()
      .send<string>();
    expect(res).toContain("query=");
  });

  it("response type shorthands work", async () => {
    const text = await new RequestBuilder(`${BASE}/get`, client)
      .get()
      .text()
      .send<string>();
    expect(text).toContain("GET");

    const json = await new RequestBuilder(`${BASE}/json`, client)
      .get()
      .json()
      .send<{ ok: boolean }>();
    expect(json.ok).toBe(true);
  });

  it("clone creates independent copy", () => {
    const builder = new RequestBuilder(`${BASE}/json`, client).get().text();
    const cloned = builder.clone();
    cloned.json();
    expect(builder).not.toBe(cloned);
  });

  it("timeout sets abort signal", () => {
    const builder = new RequestBuilder(`${BASE}/delay/5`, client).timeout(100);
    expect((builder as any)._signal).toBeInstanceOf(AbortSignal);
  });

  it("request() returns RequestBuilder", () => {
    const builder = client.request(`${BASE}/json`);
    expect(builder).toBeInstanceOf(RequestBuilder);
  });

  it("chainable request().get().send() with text works", async () => {
    const res = await client
      .request(`${BASE}/get`)
      .get()
      .text()
      .send<string>();
    expect(res).toContain("GET");
  });

  it("chainable request().post().jsonBody().send() works", async () => {
    const res = await client
      .request(`${BASE}/post`)
      .post()
      .jsonBody({ msg: "hello" })
      .text()
      .send<string>();
    expect(res).toContain("POST");
  });
});
