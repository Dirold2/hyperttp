import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { HyperClient, RequestBuilder, type HyperTransport } from "../src/index.js";

const BASE = inject("benchmarkBaseUrl");

function successfulTransport(onExecute?: (signal?: AbortSignal) => void): HyperTransport {
  return {
    async execute(request) {
      onExecute?.(request.signal);
      return {
        status: 200,
        headers: { "content-type": "text/plain" },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("ok"));
            controller.close();
          },
        }),
      };
    },
  };
}

describe("HyperClient", () => {
  let client: HyperClient;

  beforeAll(() => {
    client = new HyperClient();
  });

  afterAll(async () => {
    await client.destroy();
  });

  it("performs GET and parses JSON", async () => {
    const res = await client.get<{ ok: boolean; timestamp: number }>(`${BASE}/json`);
    expect(res).toBeTypeOf("object");
    expect(res.ok).toBe(true);
    expect(res.timestamp).toBeTypeOf("number");
  });

  it("performs GET with an explicit JSON response type", async () => {
    const res = await client.get<{ ok: boolean }>(`${BASE}/json`, "json");
    expect(res.ok).toBe(true);
  });

  it("exposes the REST protocol namespace", async () => {
    const res = await client.rest.get<{ ok: boolean }>(`${BASE}/json`);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });

  it("performs GET and returns text", async () => {
    const res = await client.get<string>(`${BASE}/get`);
    expect(res).toContain("method=GET");
  });

  it("honors shortcut redirect options", async () => {
    const res = await client.get<string>(`${BASE}/status/302`, {
      followRedirects: false,
      responseType: "text",
    });
    expect(res).toContain("Redirecting to /json");
  });

  it("forwards a signal provided in request options", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const signalClient = new HyperClient(
      { builtInPlugins: false },
      successfulTransport((signal) => {
        receivedSignal = signal;
      }),
    );

    try {
      await signalClient.get("http://example.test/resource", { signal: controller.signal });
      expect(receivedSignal).toBe(controller.signal);
    } finally {
      await signalClient.destroy();
    }
  });

  it("performs POST with body", async () => {
    const res = await client.post<string>(`${BASE}/post`, "hello-body");
    expect(res).toContain("method=POST");
    expect(res).toContain("hello-body");
  });

  it("adds a SHA-256 Digest header for requests with a body", async () => {
    let digest: string | string[] | undefined;
    const cryptoClient = new HyperClient(
      {},
      {
        async execute(request) {
          digest = request.headers.digest;
          return {
            status: 200,
            headers: { "content-type": "text/plain" },
            body: new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new TextEncoder().encode("ok"));
                controller.close();
              },
            }),
          };
        },
      },
    );

    try {
      await cryptoClient.post("http://example.test/resource", "hello-body");
      expect(digest).toBe("sha-256=:cgwC2aoQz0zjMSckFIJqaLK/Z+CWziQx8cpgcGDwsK0=:");
    } finally {
      await cryptoClient.destroy();
    }
  });

  it.each(["post", "put", "patch", "options", "query"] as const)(
    "%s preserves options.body when the body argument is omitted",
    async (method) => {
      const body = { source: "options" };
      let receivedBody: unknown;
      const bodyClient = new HyperClient(
        { builtInPlugins: false },
        {
          async execute(request) {
            receivedBody = request.body;
            return {
              status: 200,
              headers: { "content-type": "text/plain" },
              body: new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.close();
                },
              }),
            };
          },
        },
      );
      const shortcut = bodyClient[method] as (
        url: string,
        body?: unknown,
        options?: { body?: unknown; responseType?: "text" },
      ) => Promise<string>;

      try {
        await shortcut.call(bodyClient, "http://example.test/resource", undefined, {
          body,
          responseType: "text",
        });
        expect(receivedBody).toBe(JSON.stringify(body));
      } finally {
        await bodyClient.destroy();
      }
    },
  );

  it.each(["get", "delete"] as const)(
    "%s accepts an AbortSignal as its second argument",
    async (method) => {
      const controller = new AbortController();
      let receivedSignal: AbortSignal | undefined;
      const signalClient = new HyperClient(
        { builtInPlugins: false },
        successfulTransport((signal) => {
          receivedSignal = signal;
        }),
      );
      const shortcut = signalClient[method] as (
        url: string,
        signal?: AbortSignal,
      ) => Promise<unknown>;

      try {
        await shortcut.call(signalClient, "http://example.test/resource", controller.signal);
        expect(receivedSignal).toBe(controller.signal);
      } finally {
        await signalClient.destroy();
      }
    },
  );

  it.each(["post", "put", "patch", "options", "query"] as const)(
    "%s accepts an AbortSignal as its third argument",
    async (method) => {
      const controller = new AbortController();
      let receivedSignal: AbortSignal | undefined;
      const signalClient = new HyperClient(
        { builtInPlugins: false },
        successfulTransport((signal) => {
          receivedSignal = signal;
        }),
      );
      const shortcut = signalClient[method] as (
        url: string,
        body?: unknown,
        signal?: AbortSignal,
      ) => Promise<unknown>;

      try {
        await shortcut.call(
          signalClient,
          "http://example.test/resource",
          { ok: true },
          controller.signal,
        );
        expect(receivedSignal).toBe(controller.signal);
      } finally {
        await signalClient.destroy();
      }
    },
  );

  it("combines shortcut and options abort signals", async () => {
    const optionController = new AbortController();
    const argumentController = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const signalClient = new HyperClient(
      { builtInPlugins: false },
      successfulTransport((signal) => {
        receivedSignal = signal;
      }),
    );

    try {
      await signalClient.get(
        "http://example.test/resource",
        { signal: optionController.signal },
        argumentController.signal,
      );
      expect(receivedSignal).not.toBe(optionController.signal);
      expect(receivedSignal).not.toBe(argumentController.signal);
      optionController.abort();
      expect(receivedSignal?.aborted).toBe(true);
    } finally {
      await signalClient.destroy();
    }
  });

  it("performs HEAD request", async () => {
    const res = await client.head(`${BASE}/json`);
    expect(res.status).toBe(200);
    expect(res.headers).toBeTypeOf("object");
  });

  it("performs status code requests", async () => {
    const res404 = await client.get<{ status: number }>(`${BASE}/status/404`);
    expect(res404.status).toBe(404);
  });

  it("handles empty client config", async () => {
    const emptyClient = new HyperClient();
    expect(emptyClient).toBeInstanceOf(HyperClient);
    await emptyClient.destroy();
  });

  it("extend preserves an explicitly injected transport", async () => {
    let calls = 0;
    const parent = new HyperClient(
      { builtInPlugins: false },
      successfulTransport(() => {
        calls += 1;
      }),
    );
    const child = parent.extend({ verbose: true });

    try {
      await child.get("http://example.test/resource");
      expect(calls).toBe(1);
    } finally {
      await child.destroy();
      await parent.destroy();
    }
  });

  it("deep-merges nested plugin config in constructor and extend", async () => {
    const parent = new HyperClient({
      retry: { maxRetries: 7 },
      rateLimit: { maxRequests: 10, windowMs: 1_000 },
    });
    const child = parent.extend({
      retry: { baseDelay: 250 },
      rateLimit: { maxRequests: 20 },
    });

    expect(parent["_config"].retry).toEqual({
      maxRetries: 7,
      baseDelay: 100,
      maxDelay: 5000,
      jitter: true,
    });
    expect(child["_config"].retry).toEqual({
      maxRetries: 7,
      baseDelay: 250,
      maxDelay: 5000,
      jitter: true,
    });
    expect(child["_config"].rateLimit).toEqual({ maxRequests: 20, windowMs: 1_000 });

    await child.destroy();
    await parent.destroy();
  });

  it("allows redefining exposed protocol namespaces", async () => {
    const protocolClient = new HyperClient({ builtInPlugins: false });

    try {
      expect(() => {
        Object.defineProperty(protocolClient, "rest", {
          configurable: true,
          value: "overridden",
        });
      }).not.toThrow();
      expect(protocolClient["rest"]).toBe("overridden");
    } finally {
      await protocolClient.destroy();
    }
  });

  it("create alias works", async () => {
    const parent = new HyperClient();
    const child = parent.create({ verbose: true });
    expect(child).toBeInstanceOf(HyperClient);
    await child.destroy();
    await parent.destroy();
  });

  it("stream returns consumable response data", async () => {
    const res = await client.stream(`${BASE}/stream`);
    const decoder = new TextDecoder();
    let text = "";

    for await (const chunk of res.data) {
      text += decoder.decode(chunk, { stream: true });
    }
    text += decoder.decode();

    expect(text).toContain("chunk-0");
    expect(text).toContain("done");
  });
});

describe("RequestBuilder", () => {
  let client: HyperClient;

  beforeAll(() => {
    client = new HyperClient();
  });

  afterAll(async () => {
    await client.destroy();
  });

  it("sends GET request", async () => {
    const res = await new RequestBuilder(`${BASE}/json`, client).get().send<{ ok: boolean }>();
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

  it("sends exact query params", async () => {
    const res = await new RequestBuilder(`${BASE}/get`, client)
      .get()
      .query({ foo: "bar", tag: ["a", "b"], skipped: null })
      .text()
      .send<string>();
    expect(res).toContain("foo=bar");
    expect(res).toContain("tag=a");
    expect(res).toContain("tag=b");
    expect(res).not.toContain("skipped=");
  });

  it("sends query params with a relative URL", async () => {
    const relativeClient = new HyperClient({ baseURL: BASE });

    try {
      const res = await relativeClient
        .request("/get")
        .query({ foo: "bar", page: 2 })
        .text()
        .send<string>();
      expect(res).toContain("foo=bar");
      expect(res).toContain("page=2");
    } finally {
      await relativeClient.destroy();
    }
  });

  it("passes response type metadata to the request pipeline", async () => {
    const text = await new RequestBuilder(`${BASE}/get`, client).get().text().send<string>();
    expect(text).toContain("method=GET");

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

  it("preserves an explicit abort signal when setting a timeout", async () => {
    const controller = new AbortController();
    const request = new RequestBuilder(`${BASE}/delay/5`, client)
      .signal(controller.signal)
      .timeout(1_000)
      .send();

    controller.abort();
    await expect(request).rejects.toThrow();
  });

  it("request() returns RequestBuilder", () => {
    const builder = client.request(`${BASE}/json`);
    expect(builder).toBeInstanceOf(RequestBuilder);
  });

  it("chainable request().get().send() with text works", async () => {
    const res = await client.request(`${BASE}/get`).get().text().send<string>();
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
