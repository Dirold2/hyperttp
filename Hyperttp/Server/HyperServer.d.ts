import type { ServerRequestContext, TransportServer } from "@hyperttp/types";
import type { HyperCore } from "@hyperttp/core";
import type { RestServerInput, RestServerResponse } from "@hyperttp/core/rest";
/** Path parameters are decoded once, after matching path segments. */
export type RouteParams<Path extends string> = string extends Path ? Readonly<Record<string, string>> : Path extends `${string}:${infer Param}/${infer Rest}` ? Readonly<Record<Param, string>> & RouteParams<Rest> : Path extends `${string}:${infer Param}` ? Readonly<Record<Param, string>> : Readonly<Record<never, string>>;
export interface RouteContext<Services, Path extends string = string> extends RestServerInput {
    readonly params: RouteParams<Path>;
    readonly services: Services;
    readonly context: ServerRequestContext;
}
export type RouteHandler<Services, Path extends string = string> = (context: RouteContext<Services, Path>) => RestServerResponse | Promise<RestServerResponse>;
export type ServerMiddleware<Services> = (context: RouteContext<Services>, next: () => Promise<RestServerResponse>) => RestServerResponse | Promise<RestServerResponse>;
export interface ServerOptions<Services = Record<never, never>> {
    port: number;
    host?: string;
    signal?: AbortSignal;
    /** Application-owned objects; closing the server does not dispose them. */
    services?: Services;
}
/** Optional REST routing facade. Constructing it never opens a port. */
export declare class HyperServer<Services = Record<never, never>> {
    private readonly core;
    private readonly routes;
    private readonly middleware;
    private state;
    private startup?;
    private closing?;
    private readonly services;
    private readonly options;
    constructor(core: HyperCore, options: ServerOptions<Services>);
    readonly rest: {
        get: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        post: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        put: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        patch: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        delete: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        head: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        options: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
        query: <const P extends string>(path: P, handler: RouteHandler<Services, P>) => HyperServer<Services>;
    };
    private assertConfiguring;
    private route;
    use(middleware: ServerMiddleware<Services>): this;
    private handle;
    /** Starts once; concurrent callers share startup. Failed startup closes this facade. */
    start(): Promise<TransportServer>;
    /** Waits for pending startup and closes the Core-owned, idempotent handle. */
    close(): Promise<void>;
}
/** Creates an optional server facade for an existing Core. */
export declare function createServer<S = Record<never, never>>(core: HyperCore, options: ServerOptions<S>): HyperServer<S>;
//# sourceMappingURL=HyperServer.d.ts.map