import { describe, expect, it, vi } from "vitest";
import type { TransportListenOptions, TransportRequest } from "@hyperttp/types";
import { HyperCore } from "@hyperttp/core";
import { HyperClient } from "../src/index.js";
import { createServer } from "../src/Hyperttp/Server/HyperServer.js";

function fixture() {
  let receive: TransportListenOptions["onRequest"] | undefined;
  const close = vi.fn(async () => {});
  const listen = vi.fn(async (options: TransportListenOptions) => {
    receive = options.onRequest;
    return { close };
  });
  const core = new HyperClient(
    { builtInPlugins: false },
    {
      execute: async () => {
        throw new Error("unexpected client request");
      },
      listen,
    },
  );
  const request = (url: string, method = "GET") => {
    if (!receive) throw new Error("not started");
    return Promise.resolve(
      receive({ protocol: "rest", url, method, headers: {} } as TransportRequest),
    );
  };
  return { core, listen, close, request };
}

describe("optional server facade", () => {
  it("defers startup, shares concurrent startup and routes typed services and decoded params", async () => {
    const { core, listen, close, request } = fixture();
    const find = vi.fn((id: string) => ({ id }));
    const server = core.server(3000, { services: { users: { find } } });
    server.rest.get("/users/:id", ({ params, services, query }) => {
      expect(query.q).toEqual(["a", "b"]);
      return { body: services.users.find(params.id) };
    });
    expect(listen).not.toHaveBeenCalled();
    const first = server.start();
    expect(server.start()).toBe(first);
    await first;
    expect(listen).toHaveBeenCalledTimes(1);
    const response = await request("/users/a%20b?q=a&q=b");
    expect(response.status).toBe(200);
    expect(find).toHaveBeenCalledWith("a b");
    await server.close();
    await core.destroy();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("matches static routes first and distinguishes 404, 405 and invalid encoding", async () => {
    const { core, request } = fixture();
    const server = core.server(0);
    server.rest.get("/users/:id", () => ({ body: "dynamic" }));
    server.rest.post("/users/me", () => ({ body: "static" }));
    await server.start();
    expect((await request("/missing")).status).toBe(404);
    const disallowed = await request("/users/me");
    expect(disallowed.status).toBe(405);
    expect(disallowed.headers.Allow).toBe("POST");
    expect((await request("/users/%ZZ")).status).toBe(400);
    expect((await request("/users/x", "HEAD")).status).toBe(405);
    await core.destroy();
  });

  it("supports incoming and outgoing middleware and short circuit", async () => {
    const { core, request } = fixture();
    const server = core.server(0);
    const events: string[] = [];
    server.use(async (_ctx, next) => {
      events.push("in");
      const response = await next();
      events.push("out");
      return { ...response, headers: { "x-test": "yes" } };
    });
    server.rest.get("/", () => {
      events.push("handler");
      return { status: 201 };
    });
    await server.start();
    expect((await request("/")).headers["x-test"]).toBe("yes");
    expect(events).toEqual(["in", "handler", "out"]);
    expect(() => server.rest.get("/late", () => ({}))).toThrow("Registration is closed");
    await core.destroy();

    const second = fixture();
    const blocked = second.core.server(0);
    const handler = vi.fn(() => ({}));
    blocked.use(() => ({ status: 403 }));
    blocked.rest.get("/", handler);
    await blocked.start();
    expect((await second.request("/")).status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    await second.core.destroy();
  });

  it("rejects duplicate patterns and unsafe parameter syntax without rejecting prototype names", async () => {
    const { core, request } = fixture();
    const server = core.server(0);
    server.rest.get("/:constructor/:__proto__", ({ params }) => {
      expect(Object.getPrototypeOf(params)).toBeNull();
      return { body: [params.constructor, params.__proto__] };
    });
    expect(() => server.rest.get("/:a/:b", () => ({}))).toThrow("Duplicate route");
    expect(() => server.rest.get("/:a/:a", () => ({}))).toThrow("parameter");
    expect(() => server.rest.get("relative", () => ({}))).toThrow("pathname");
    await server.start();
    expect((await request("/one/two")).status).toBe(200);
    await core.destroy();
  });

  it("close waits for pending startup and is idempotent", async () => {
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const close = vi.fn(async () => {});
    const core = new HyperCore(
      {},
      {
        execute: async () => {
          throw new Error("unused");
        },
        listen: async () => {
          await ready;
          return { close };
        },
      },
    );
    const server = createServer(core, { port: 0 });
    const startup = server.start();
    const closing = server.close();
    expect(server.close()).toBe(closing);
    await expect(server.start()).rejects.toThrow("closed");
    finish();
    await startup;
    await closing;
    await core.destroy();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("handles failed startup and closing before start", async () => {
    const core = new HyperClient({ builtInPlugins: false });
    const server = core.server(0);
    await server.close();
    await expect(server.start()).rejects.toThrow("closed");
    expect(() => core.server(NaN)).toThrow("Port");
    await core.destroy();
    const failed = core.server(0);
    await expect(failed.start()).rejects.toThrow();
    await failed.close();
  });

  it("routes through Core server response/error hooks without client hooks", async () => {
    const { core, request } = fixture();
    const client = vi.fn();
    const settled = vi.fn();
    core.use({
      name: "server-check",
      onRequest: client,
      onServerResponse: (response) => ({
        ...response,
        headers: { ...response.headers, "x-plugin": "yes" },
      }),
      onServerError: () => ({ status: 503, headers: {}, body: "recovered" }),
      onServerSettled: settled,
    });
    const server = core.server(0);
    server.rest.get("/ok", () => ({ body: "ok" }));
    server.rest.get("/error", () => {
      throw new Error("handler failed");
    });
    await server.start();
    expect((await request("/ok")).headers["x-plugin"]).toBe("yes");
    const recovered = await request("/error");
    expect(recovered.status).toBe(503);
    expect(recovered.headers["x-plugin"]).toBe("yes");
    expect(client).not.toHaveBeenCalled();
    expect(settled).toHaveBeenCalledTimes(2);
    await core.destroy();
  });

  it("rejects repeated next and propagates handler failure through server hooks", async () => {
    const { core, request } = fixture();
    const server = core.server(0);
    server.use(async (_ctx, next) => {
      await next();
      return next();
    });
    server.rest.get("/", () => ({}));
    await server.start();
    await expect(request("/")).rejects.toThrow("next()");
    await core.destroy();
  });
});

// Compile-time checks are deliberately not executed.
function typeContracts(core: HyperClient) {
  const server = core.server(0, { services: { users: { find: (id: string) => id } } });
  server.rest.get("/users/:id", ({ params, services, body }) => {
    services.users.find(params.id);
    // @ts-expect-error Path has no missing parameter.
    void params.missing;
    // @ts-expect-error Unvalidated body remains unknown.
    void body.value;
    // @ts-expect-error Services are inferred, not a string dictionary.
    void services.missing;
    return { status: 204 };
  });
}
void typeContracts;
