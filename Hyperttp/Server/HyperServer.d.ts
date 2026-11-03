import type { HyperServerProtocols, RouteHandler, ServerMiddleware, ServerOptions, TransportServer } from "@hyperttp/types";
import type { HyperCore } from "@hyperttp/core";
export type { RouteParams, RouteContext, RouteHandler, ServerMiddleware, ServerOptions, } from "@hyperttp/types";
export type HyperServer<Services = Record<never, never>> = HyperServerImplementation<Services> & HyperServerProtocols<Services, HyperServer<Services>>;
/** Optional protocol server facade. Constructing it never opens a port. */
declare class HyperServerImplementation<Services = Record<never, never>> {
    private readonly core;
    private protocolEndpoint?;
    private readonly protocolFacades;
    private readonly routes;
    private readonly middleware;
    private state;
    private startup?;
    private closing?;
    private readonly services;
    private readonly options;
    private readonly facade;
    constructor(core: HyperCore, options: ServerOptions<Services>);
    /** Lazily constructs protocol-owned namespaces from explicitly registered modules. */
    private protocolFacade;
    private configureProtocol;
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
    use(middleware: ServerMiddleware<Services>): HyperServer<Services>;
    private handle;
    /** Starts once; concurrent callers share startup. Failed startup closes this facade. */
    start(): Promise<TransportServer>;
    /** Waits for pending startup and closes the Core-owned, idempotent handle. */
    close(): Promise<void>;
}
/** The proxy supplies augmented namespaces; no class/interface merging is needed. */
export declare const HyperServer: {
    new <Services = Record<never, never>>(core: HyperCore, options: ServerOptions<Services>): HyperServer<Services>;
    readonly prototype: HyperServerImplementation;
};
/** Creates an optional server facade for an existing Core. */
export declare function createServer<S = Record<never, never>>(core: HyperCore, options: ServerOptions<S>): HyperServer<S>;
//# sourceMappingURL=HyperServer.d.ts.map