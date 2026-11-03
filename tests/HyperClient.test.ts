import { AsyncLocalStorage } from "node:async_hooks";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { HyperClient, RequestBuilder, type HyperTransport } from "../src/index.js";
import { RestProtocol, RestSender, RestReceiver } from "@hyperttp/protocol-rest";
import type { HyperClientOptions, HyperProtocol } from "@hyperttp/types";

const BASE = inject("benchmarkBaseUrl");

const webRtcProtocol: HyperProtocol<
  { peerUrl: string },
  { peerUrl: string },
  unknown,
  unknown,
  "webrtc"
> = {
  protocol: "webrtc",
  sender: {
    protocol: "webrtc",
    methods: {
      connect: (
        core: {
          send(request: { protocol: "webrtc"; input: { peerUrl: string } }): Promise<unknown>;
        },
        peerUrl: string,
      ) => core.send({ protocol: "webrtc", input: { peerUrl } }),
    },
    prepare: (request) => request.input,
    async send(prepared) {
      return prepared;
    },
    parse(raw) {
      return {
        protocol: "webrtc",
        ok: true,
        status: 200,
        headers: {},
        data: raw as { peerUrl: string },
      };
    },
  },
};

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

  it.each(["enabled", "disabled", "no-builtins", "post"] as const)(
    "honors automatic retry policy: %s",
    async (mode) => {
      let attempts = 0;
      const retryClient = new HyperClient(
        {
          builtInPlugins: mode !== "no-builtins",
          retry: { enabled: mode !== "disabled", maxRetries: 1, baseDelay: 0, jitter: false },
          cache: { enabled: false },
          inflight: { enabled: false },
        },
        {
          async execute() {
            attempts++;
            return {
              status: attempts === 1 ? 503 : 200,
              headers: { "content-type": "text/plain" },
              body: new TextEncoder().encode(attempts === 1 ? "unavailable" : "ok"),
            };
          },
        },
      );

      try {
        if (mode === "post") {
          await retryClient.post("https://example.test/retry", "body");
        } else {
          await retryClient.get("https://example.test/retry");
        }
        expect(attempts).toBe(mode === "enabled" ? 2 : 1);
      } finally {
        await retryClient.destroy();
      }
    },
  );

  it.each(["protocols", "senders", "receivers", "customSender"] as const)(
    "preserves configured REST registration through %s",
    async (source) => {
      class CustomSender extends RestSender {}
      class CustomReceiver extends RestReceiver {}
      const sender = new CustomSender();
      const receiver = new CustomReceiver();
      const config: HyperClientOptions = { builtInPlugins: false };
      if (source === "protocols") {
        config.protocols = [{ ...RestProtocol, name: "CustomRest", sender, receiver }];
      } else if (source === "senders") {
        config.senders = [sender];
      } else if (source === "receivers") {
        config.receivers = [receiver];
      } else {
        config.customSender = sender;
      }
      const configuredClient = new HyperClient(config);
      try {
        if (source === "protocols") {
          expect(await configuredClient.getProtocolName("rest")).toBe("CustomRest");
        }
        if (source !== "receivers") {
          expect(await configuredClient.getSenderName("rest")).toBe("CustomSender");
        }
        if (source === "receivers" || source === "protocols") {
          expect(await configuredClient.getReceiverName("rest")).toBe("CustomReceiver");
        }
      } finally {
        await configuredClient.destroy();
      }
    },
  );

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

  it("exposes namespaces for configured protocols", async () => {
    const protocolClient = new HyperClient(
      { builtInPlugins: false, protocols: [webRtcProtocol] },
      successfulTransport(),
    );

    try {
      const webRtc = (protocolClient as HyperClient & Record<string, unknown>).webrtc as {
        connect(peerUrl: string): Promise<{ data: { peerUrl: string } }>;
      };
      const request = webRtc.connect("webrtc://peer.example");
      const response = await request;

      expect(response.data).toEqual({ peerUrl: "webrtc://peer.example" });
    } finally {
      await protocolClient.destroy();
    }
  });

  it("rejects configured protocol namespaces that conflict with the client API", () => {
    expect(
      () =>
        new HyperClient({
          builtInPlugins: false,
          protocols: [{ ...webRtcProtocol, protocol: "get" }],
        }),
    ).toThrow('Protocol namespace "get" conflicts with the HyperClient API.');
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

  it("delegates server listening to Core", async () => {
    let receivedOptions: { host?: string; port?: number; onRequest?: unknown } | undefined;
    let closed = false;
    const listenClient = new HyperClient(
      { builtInPlugins: false },
      {
        async execute() {
          throw new Error("Not used by listen()");
        },
        async listen(options) {
          receivedOptions = options;
          return {
            close() {
              closed = true;
            },
          };
        },
      },
    );

    try {
      const server = await listenClient.listen({
        host: "127.0.0.1",
        port: 0,
        handler: () => ({ body: "ok" }),
      });

      expect(receivedOptions?.host).toBe("127.0.0.1");
      expect(receivedOptions?.port).toBe(0);
      expect(receivedOptions?.onRequest).toBeTypeOf("function");
      await server.close();
      expect(closed).toBe(true);
    } finally {
      await listenClient.destroy();
    }
  });

  it("applies configured auth credentials", async () => {
    let authorization: string | string[] | undefined;
    const authClient = new HyperClient(
      {
        auth: {
          allowedOrigins: ["http://example.test"],
          rest: { type: "bearer", getToken: () => "access-token" },
        },
      },
      {
        async execute(request) {
          authorization = request.headers.authorization;
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

    try {
      await authClient.get("http://example.test/resource");
      expect(authorization).toBe("Bearer access-token");
    } finally {
      await authClient.destroy();
    }
  });

  it.each(["query", "header"] as const)(
    "isolates configured %s API-key authentication with a credential-free cache key",
    async (location) => {
      let identity = "user:one";
      let credential = "secret-one";
      let networkCalls = 0;
      const keys: string[] = [];
      const authClient = new HyperClient(
        {
          auth: {
            allowedOrigins: ["https://api.example.test"],
            rest: {
              type: "api-key",
              location,
              name: "custom_credential",
              getValue: () => credential,
              getCacheKey: () => identity,
            },
          },
          inflight: { enabled: false },
          cache: {
            key(request, context) {
              const scope = context?.state["@hyperttp/auth.identity"];
              if (typeof scope !== "string") return;
              const input = request.input as { url: string };
              const url = new URL(input.url);
              url.searchParams.delete("custom_credential");
              const key = JSON.stringify([request.protocol, url.toString(), scope]);
              keys.push(key);
              return key;
            },
          },
        },
        {
          async execute(request) {
            networkCalls++;
            if (location === "query") {
              expect(new URL(request.url).searchParams.get("custom_credential")).toBe(credential);
            } else {
              expect(request.headers.custom_credential).toBe(credential);
            }
            return {
              status: 200,
              headers: { "content-type": "application/json" },
              body: new TextEncoder().encode(JSON.stringify({ identity })),
            };
          },
        },
      );

      try {
        const url = "https://api.example.test/me";
        expect(await authClient.get(url)).toEqual({ identity: "user:one" });
        expect(await authClient.get(url)).toEqual({ identity: "user:one" });
        expect(networkCalls).toBe(1);

        identity = "user:two";
        credential = "secret-two";
        expect(await authClient.get(url)).toEqual({ identity: "user:two" });
        expect(networkCalls).toBe(2);

        identity = "user:one";
        credential = "rotated-secret";
        expect(await authClient.get(url)).toEqual({ identity: "user:one" });
        expect(networkCalls).toBe(2);
        expect(keys.join(" ")).not.toMatch(/secret/);
      } finally {
        await authClient.destroy();
      }
    },
  );

  it("bypasses default caching for configured Bearer authentication without a safe key", async () => {
    let networkCalls = 0;
    const authClient = new HyperClient(
      {
        auth: {
          allowedOrigins: ["https://api.example.test"],
          bearer: { getToken: () => "secret-token" },
        },
        inflight: { enabled: false },
      },
      {
        async execute(request) {
          expect(request.headers.authorization).toBe("Bearer secret-token");
          networkCalls++;
          return {
            status: 200,
            headers: { "content-type": "text/plain" },
            body: new TextEncoder().encode("ok"),
          };
        },
      },
    );

    try {
      await authClient.get("https://api.example.test/me");
      await authClient.get("https://api.example.test/me");
      expect(networkCalls).toBe(2);
    } finally {
      await authClient.destroy();
    }
  });

  it.each(["bearer", "query", "header"] as const)(
    "isolates concurrent %s auth identities while deduplicating the same identity",
    async (kind) => {
      const sessions = new AsyncLocalStorage<{ identity: string; credential: string }>();
      const session = () => {
        const value = sessions.getStore();
        if (!value) throw new Error("Missing test session");
        return value;
      };
      let networkCalls = 0;
      let keyedRequests = 0;
      let markAllKeyed!: () => void;
      let releaseRequests!: () => void;
      const allKeyed = new Promise<void>((resolve) => {
        markAllKeyed = resolve;
      });
      const release = new Promise<void>((resolve) => {
        releaseRequests = resolve;
      });
      const keys: string[] = [];
      const authClient = new HyperClient(
        {
          auth: {
            allowedOrigins: ["https://api.example.test"],
            getCacheKey: () => session().identity,
            rest:
              kind === "bearer"
                ? { type: "bearer", getToken: () => session().credential }
                : {
                    type: "api-key",
                    location: kind,
                    name: "custom_credential",
                    getValue: () => session().credential,
                  },
          },
          cache: { enabled: false },
          inflight: {
            keyExtractor(request) {
              const input = request.input as { url: string };
              const url = new URL(input.url);
              url.searchParams.delete("custom_credential");
              const key = url.toString();
              keys.push(key);
              if (++keyedRequests === 3) markAllKeyed();
              return key;
            },
          },
        },
        {
          async execute(request) {
            networkCalls++;
            const credential =
              kind === "bearer"
                ? request.headers.authorization
                : kind === "query"
                  ? new URL(request.url).searchParams.get("custom_credential")
                  : request.headers.custom_credential;
            const expected = session().credential;
            expect(credential).toBe(kind === "bearer" ? `Bearer ${expected}` : expected);
            const identity = session().identity;
            await release;
            return {
              status: 200,
              headers: { "content-type": "application/json" },
              body: new TextEncoder().encode(JSON.stringify({ identity })),
            };
          },
        },
      );
      const send = (identity: string, credential: string) =>
        sessions.run({ identity, credential }, () => authClient.get("https://api.example.test/me"));
      const requests = Promise.all([
        send("user:one", "secret-one"),
        send("user:one", "secret-one"),
        send("user:two", "secret-two"),
      ]);

      try {
        await allKeyed;
        releaseRequests();
        expect(await requests).toEqual([
          { identity: "user:one" },
          { identity: "user:one" },
          { identity: "user:two" },
        ]);
        expect(networkCalls).toBe(2);
        expect(keys).toHaveLength(3);
        expect(keys.join(" ")).not.toMatch(/secret/);
      } finally {
        releaseRequests();
        await requests.catch(() => {});
        await authClient.destroy();
      }
    },
  );

  it("adds a SHA-256 Content-Digest header for requests with a body", async () => {
    let digest: string | string[] | undefined;
    const cryptoClient = new HyperClient(
      {},
      {
        async execute(request) {
          digest = request.headers["content-digest"];
          expect(request.headers.digest).toBeUndefined();
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
        expect(receivedBody).toBeInstanceOf(Uint8Array);
        expect(new TextDecoder().decode(receivedBody as Uint8Array)).toBe(JSON.stringify(body));
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

  it("creates distinct built-in retry instances for independent and derived clients", async () => {
    const parent = new HyperClient({}, successfulTransport());
    const independent = new HyperClient({}, successfulTransport());
    const child = parent.extend({});
    try {
      expect(await parent.get("https://example.test/parent")).toBeDefined();
      expect(await independent.get("https://example.test/independent")).toBeDefined();
      expect(await child.get("https://example.test/child")).toBeDefined();
    } finally {
      await child.destroy();
      await independent.destroy();
      await parent.destroy();
    }
  });

  it("preserves a configured plain transport identity and closes it once across extend", async () => {
    let closes = 0;
    const transport = {
      ...successfulTransport(),
      close: async () => {
        closes++;
      },
    };
    const parent = new HyperClient({ builtInPlugins: false, customTransport: transport });
    const child = parent.extend({});
    expect(parent["_config"].customTransport).toBe(transport);
    expect(child["_config"].customTransport).toBe(transport);
    await parent.get("https://example.test/parent");
    await child.get("https://example.test/child");
    await child.destroy();
    expect(closes).toBe(0);
    await parent.destroy();
    expect(closes).toBe(1);
  });

  it("recreates user plugin factories when extending without repeating plugin setup", async () => {
    let setups = 0;
    const parent = new HyperClient({
      builtInPlugins: false,
      pluginFactories: [
        () => ({
          name: "fresh",
          setup() {
            setups++;
          },
        }),
      ],
    });
    const child = parent.extend({});
    expect(setups).toBe(2);
    await child.destroy();
    await parent.destroy();
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
