import type {
  HyperProtocolName,
  HyperServerListenOptions,
  HyperServerProtocols,
  ProtocolServerHost,
  RouteHandler,
  ServerMiddleware,
  ServerOptions,
  RouteContext,
  ServerRequestContext,
  TransportServer,
} from "@hyperttp/types";
import type { HyperCore } from "@hyperttp/core";
import type { HttpMethod, RestServerInput, RestServerResponse } from "@hyperttp/protocol-rest";

export type {
  RouteParams,
  RouteContext,
  RouteHandler,
  ServerMiddleware,
  ServerOptions,
} from "@hyperttp/types";

type Segment = { literal: string } | { param: string };
type Route<Services> = {
  method: HttpMethod;
  segments: Segment[];
  handler: RouteHandler<Services>;
};

function parsePath(path: string): Segment[] {
  if (!path.startsWith("/") || /[?#]/.test(path)) {
    throw new Error("[HyperServer] Route must be an absolute pathname without query or fragment.");
  }
  const names = new Set<string>();
  return path
    .split("/")
    .slice(1)
    .map((part): Segment => {
      if (!part.startsWith(":")) return { literal: part };
      const param = part.slice(1);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(param) || names.has(param)) {
        throw new Error("[HyperServer] Invalid or duplicate path parameter.");
      }
      names.add(param);
      return { param };
    });
}

export type HyperServer<Services = Record<never, never>> = HyperServerImplementation<Services> &
  HyperServerProtocols<Services, HyperServer<Services>>;

/** Optional protocol server facade. Constructing it never opens a port. */
class HyperServerImplementation<Services = Record<never, never>> {
  private protocolEndpoint?: () => Promise<TransportServer>;
  private readonly protocolFacades = new Map<string, object>();
  private readonly routes: Route<Services>[] = [];
  private readonly middleware: ServerMiddleware<Services>[] = [];
  private state: "configuring" | "starting" | "running" | "closing" | "closed" = "configuring";
  private startup?: Promise<TransportServer>;
  private closing?: Promise<void>;
  private readonly services: Services;
  private readonly options: ServerOptions<Services>;
  private readonly facade: HyperServer<Services>;

  constructor(
    private readonly core: HyperCore,
    options: ServerOptions<Services>,
  ) {
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
      throw new Error("[HyperServer] Port must be an integer between 0 and 65535.");
    }
    this.options = { ...options };
    this.services = options.services ?? (Object.freeze({}) as Services);
    // All fluent paths, including arrow functions, must return the public proxy.
    this.facade = new Proxy(this, {
      get: (target, key, receiver) => {
        if (Reflect.has(target, key) || typeof key !== "string")
          return Reflect.get(target, key, receiver);
        return (receiver as HyperServer<Services>).protocolFacade(key);
      },
    }) as unknown as HyperServer<Services>;
    return this.facade;
  }

  /** Lazily constructs protocol-owned namespaces from explicitly registered modules. */
  private protocolFacade(name: string): object | undefined {
    const cached = this.protocolFacades.get(name);
    if (cached) return cached;
    const factory = this.core.getProtocol(name)?.server;
    if (!factory) return undefined;
    const host: ProtocolServerHost<Services, HyperServer<Services>> = {
      services: this.services,
      configure: (options) => this.configureProtocol(options),
    };
    const facade = factory(host);
    this.protocolFacades.set(name, facade);
    return facade;
  }

  private configureProtocol<P extends HyperProtocolName>(
    options: Omit<HyperServerListenOptions<P>, "port" | "host" | "signal">,
  ): HyperServer<Services> {
    this.assertConfiguring();
    if (this.routes.length || this.middleware.length)
      throw new Error("[HyperServer] REST and external protocols require separate server facades.");
    if (this.protocolEndpoint)
      throw new Error("[HyperServer] Only one protocol endpoint per server is supported.");
    const listener = { ...options };
    this.protocolEndpoint = () =>
      this.core.listen({
        ...listener,
        port: this.options.port,
        host: this.options.host,
        signal: this.options.signal,
      });
    return this.facade;
  }

  readonly rest = {
    get: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("GET", path, handler),
    post: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("POST", path, handler),
    put: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("PUT", path, handler),
    patch: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("PATCH", path, handler),
    delete: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("DELETE", path, handler),
    head: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("HEAD", path, handler),
    options: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("OPTIONS", path, handler),
    query: <const P extends string>(
      path: P,
      handler: RouteHandler<Services, P>,
    ): HyperServer<Services> => this.route("QUERY", path, handler),
  };

  private assertConfiguring(): void {
    if (this.state !== "configuring")
      throw new Error("[HyperServer] Registration is closed after start or close.");
  }

  private route<P extends string>(
    method: HttpMethod,
    path: P,
    handler: RouteHandler<Services, P>,
  ): HyperServer<Services> {
    this.assertConfiguring();
    if (this.protocolEndpoint)
      throw new Error("[HyperServer] REST and external protocols require separate server facades.");
    const segments = parsePath(path);
    if (
      this.routes.some(
        (route) =>
          route.method === method &&
          route.segments.length === segments.length &&
          route.segments.every((segment, i) => {
            const other = segments[i]!;
            return "literal" in segment
              ? "literal" in other && segment.literal === other.literal
              : "param" in other;
          }),
      )
    ) {
      throw new Error("[HyperServer] Duplicate route pattern for this method.");
    }
    // The matcher constructs exactly the named parameters of this registered path.
    this.routes.push({ method, segments, handler: handler as RouteHandler<Services> });
    return this.facade;
  }

  use(middleware: ServerMiddleware<Services>): HyperServer<Services> {
    this.assertConfiguring();
    if (this.protocolEndpoint)
      throw new Error(
        "[HyperServer] REST middleware cannot be used with an external protocol facade.",
      );
    this.middleware.push(middleware);
    return this.facade;
  }

  private async handle(
    request: RestServerInput,
    context: ServerRequestContext,
  ): Promise<RestServerResponse> {
    const parts = request.path.split("/").slice(1);
    const matches = this.routes.filter(
      (route) =>
        route.segments.length === parts.length &&
        route.segments.every((segment, i) =>
          "param" in segment ? parts[i] !== "" : segment.literal === parts[i],
        ),
    );
    // Literal segments take precedence at the first differing segment, independent of registration order.
    matches.sort((a, b) => {
      for (let i = 0; i < a.segments.length; i++) {
        const difference =
          Number("literal" in b.segments[i]!) - Number("literal" in a.segments[i]!);
        if (difference) return difference;
      }
      return 0;
    });
    const best = matches[0];
    const samePath = best
      ? matches.filter((route) =>
          route.segments.every(
            (segment, i) => "literal" in segment === "literal" in best.segments[i]!,
          ),
        )
      : [];
    const route = samePath.find((candidate) => candidate.method === request.method);
    const params: Record<string, string> = Object.create(null);
    try {
      route?.segments.forEach((segment, i) => {
        if ("param" in segment) params[segment.param] = decodeURIComponent(parts[i]!);
      });
    } catch {
      return { status: 400, body: "Malformed path parameter" };
    }
    const routeContext: RouteContext<Services> = {
      ...request,
      params,
      services: this.services,
      context,
    };
    const terminal = (): RestServerResponse | Promise<RestServerResponse> => {
      if (route) return route.handler(routeContext);
      if (best)
        return {
          status: 405,
          headers: { Allow: [...new Set(samePath.map((r) => r.method))].sort().join(", ") },
        };
      return { status: 404 };
    };
    const dispatch = async (index: number): Promise<RestServerResponse> => {
      const middleware = this.middleware[index];
      if (!middleware) return terminal();
      let called = false;
      return middleware(routeContext, () => {
        if (called)
          return Promise.reject(new Error("[HyperServer] next() may only be called once."));
        called = true;
        return dispatch(index + 1);
      });
    };
    return dispatch(0);
  }

  /** Starts once; concurrent callers share startup. Failed startup closes this facade. */
  start(): Promise<TransportServer> {
    if (this.state === "closing" || this.state === "closed") {
      return Promise.reject(new Error("[HyperServer] Server is closed."));
    }
    if (this.startup) return this.startup;
    this.state = "starting";
    const startup = this.protocolEndpoint
      ? this.protocolEndpoint()
      : this.core.listen({
          protocol: "rest",
          port: this.options.port,
          host: this.options.host,
          signal: this.options.signal,
          handler: (request, context) => this.handle(request, context),
        });
    this.startup = startup.then(
      (handle) => {
        if (this.state === "starting") this.state = "running";
        return handle;
      },
      (error: unknown) => {
        if (this.state !== "closing") this.state = "closed";
        throw error;
      },
    );
    return this.startup;
  }

  /** Waits for pending startup and closes the Core-owned, idempotent handle. */
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.state = "closing";
    this.closing = (async () => {
      let handle: TransportServer | undefined;
      try {
        handle = await this.startup;
      } catch {
        /* Startup owns its error. */
      }
      try {
        await handle?.close();
      } finally {
        this.state = "closed";
      }
    })();
    return this.closing;
  }
}

/** The proxy supplies augmented namespaces; no class/interface merging is needed. */
export const HyperServer = HyperServerImplementation as {
  new <Services = Record<never, never>>(
    core: HyperCore,
    options: ServerOptions<Services>,
  ): HyperServer<Services>;
  readonly prototype: HyperServerImplementation;
};

/** Creates an optional server facade for an existing Core. */
export function createServer<S = Record<never, never>>(
  core: HyperCore,
  options: ServerOptions<S>,
): HyperServer<S> {
  return new HyperServer(core, options);
}
