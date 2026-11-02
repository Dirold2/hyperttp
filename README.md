# Hyperttp

**A typed client/server facade over HyperCore with composable request policies and REST routing.**

> English | [Русский](https://github.com/dirold2/hyperttp/tree/main/lang/ru)

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

Hyperttp keeps familiar `get`, `post`, `put`, `patch`, and `delete` methods while adding response
parsing, caching, in-flight deduplication, rate limiting, concurrency queues, and interceptors
through one client.

```ts
import { HyperClient } from "hyperttp";

const http = new HyperClient({
  baseURL: "https://api.example.com",
});

const users = await http.get<User[]>("/users");

console.log(users);
```

Shortcuts return parsed data directly. No `response.data` step is required.

## Why Hyperttp?

A real API client often grows beyond `fetch()` or a basic request wrapper:

```text
HTTP request
├── serialization and parsing
├── caching
├── duplicate request prevention
├── rate limiting
├── concurrency control
├── cancellation and timeouts
└── interceptors
```

Hyperttp provides these policies through one composable client. It is most useful for SDKs,
backend services, bots, CLI tools, API integrations, and applications that would otherwise build
and maintain this infrastructure themselves.

Hyperttp is not universally better than every HTTP client. If you only need a small Fetch wrapper,
Ky or ofetch may be a better fit. For a Node-only client with HTTP/2 and pagination, Got is more
specialized. See [Choosing a client](#choosing-a-client) for an objective comparison.

## Installation

Node.js usage requires Node.js 22.19.0 or newer. Hyperttp uses Core 3, plugin 3.x releases
and `@hyperttp/types@^0.5.0`. Optimized transports are optional, not bundled.

```bash
npm install hyperttp
```

```bash
pnpm add hyperttp
```

```bash
bun add hyperttp
```

```bash
deno add npm:hyperttp
```

## Quick start

### Create a reusable client

```ts
import { HyperClient } from "hyperttp";

export const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",
});
```

Reuse the client across your application so transports, connection pools, cache entries, and
plugin state can be shared.

```ts
interface User {
  id: string;
  name: string;
  active: boolean;
}

const users = await api.get<User[]>("users");
const user = await api.get<User>("users/42");
```

### Send data

```ts
const created = await api.post<User>("users", {
  name: "Alice",
  active: true,
});

await api.put("users/42", {
  name: "Alice Cooper",
});

await api.patch("users/42", {
  active: false,
});

await api.delete("users/42");
```

Objects and arrays are serialized as JSON by the built-in serializer.

## Request options

### Query parameters

Hyperttp uses `query` where Axios uses `params`:

```ts
const users = await api.get<User[]>("users", {
  query: {
    page: 1,
    limit: 20,
    active: true,
    role: ["admin", "editor"],
  },
});
```

Array values become repeated query parameters. `null` and `undefined` values are omitted by the
fluent builder.

### Headers

```ts
const profile = await api.get<User>("profile", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Request-ID": requestId,
  },
});
```

Hyperttp currently has no top-level default `headers` option. Use request options or a request
interceptor when headers must be added globally.

### Timeout and cancellation

```ts
const controller = new AbortController();

const request = api.get("reports/large", {
  timeout: 10_000,
  signal: controller.signal,
});

controller.abort();

await request;
```

Timeouts, aborts, and transport failures reject the request. HTTP error status codes are handled
differently; see [Responses and HTTP errors](#responses-and-http-errors).

### Explicit response format

```ts
const text = await api.get<string>("health", "text");

const document = await api.get("document.xml", {
  responseType: "xml",
});
```

Supported response hints are `json`, `text`, `xml`, `html`, `buffer`, and `stream`.

## Understanding `baseURL`

Hyperttp resolves relative URLs with the standard `URL` rules:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",
});

await api.get("users"); // https://api.example.com/v1/users
await api.get("/users"); // https://api.example.com/users
```

A leading slash starts from the origin root. Omit it when the path should remain under the
`baseURL` pathname.

`baseURL` applies to HyperClient shortcuts, `head()`, `stream()`, and `RequestBuilder`. The directly
delegated `client.rest` namespace currently expects an absolute URL.

## Fluent requests

Use shortcuts for simple requests and `RequestBuilder` when a longer request reads better as a
chain:

```ts
const user = await api
  .request("users")
  .post()
  .headers({
    "X-Request-ID": requestId,
  })
  .query({ notify: true })
  .jsonBody({
    name: "Alice",
    active: true,
  })
  .json()
  .send<User>();
```

Available builder methods include:

- HTTP method: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `method`
- Request data: `headers`, `query`, `body`, `jsonBody`
- Control: `timeout`, `signal`
- Response hint: `json`, `text`, `xml`, `html`, `buffer`, `stream`
- Utility: `clone`, `send`

For live response streaming, use `client.stream()` rather than the builder response hint.

## Responses and HTTP errors

### Convenience methods return data

```ts
const users = await api.get<User[]>("users");
```

The return value is already the parsed response data. Status, headers, and other envelope fields
are intentionally omitted from shortcut results.

### Access the full response

Use the REST namespace when status and headers are needed:

```ts
const response = await api.rest.get<User[]>("https://api.example.com/v1/users");

console.log(response.ok);
console.log(response.status);
console.log(response.headers);
console.log(response.data);
```

The full response contains `protocol`, `ok`, `status`, `statusText`, `headers`, `url`, `data`, and
optional metadata/raw fields.

### HTTP statuses do not throw by default

A `4xx` or `5xx` response resolves normally. With shortcuts, the parsed error body is returned. With
the full response API, inspect `response.ok` or `response.status`:

```ts
const response = await api.rest.get<ErrorPayload>("https://api.example.com/v1/users/missing");

if (!response.ok) {
  console.error(response.status, response.data);
}
```

This differs from Axios, Ky, Got, and ofetch defaults, which commonly reject non-success responses.

## Built-in request policies

Built-in plugins are registered automatically. Policies that should be explicit, such as rate
limiting and queueing, can be enabled in client configuration:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",

  cache: {
    enabled: true,
    ttl: 60_000,
    maxSize: 1_000,
  },

  inflight: {
    enabled: true,
  },

  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60_000,
  },

  queue: {
    enabled: true,
    maxConcurrent: 20,
  },
});
```

| Policy                  | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| Cache                   | Reuse successful GET/HEAD responses according to cache policy |
| In-flight deduplication | Share compatible concurrent GET requests                      |
| Rate limiter            | Control request volume and react to server penalties          |
| Queue                   | Limit concurrent work per configured partition                |
| Serializer              | Encode object/array request bodies                            |
| Parser                  | Convert JSON, text, HTML, XML, buffer, and empty responses    |
| Interceptors            | Transform requests and responses                              |

Disable the entire built-in plugin preset when composing a custom pipeline:

```ts
const client = new HyperClient({
  builtInPlugins: false,
  plugins: [myPlugin],
});
```

The REST protocol and plugins explicitly supplied through `plugins` or `client.use()` remain
available.

### Retry, authentication and final settlement

Retries are enabled by the default preset. The external retry wrapper retries eligible idempotent
REST requests on selected transient failures/statuses; each attempt runs the full plugin pipeline.
Streams are not replayed automatically. Disable retries with `retry: { enabled: false }`.

```ts
const client = new HyperClient({
  retry: { maxRetries: 2, baseDelay: 100, maxDelay: 5_000, jitter: true },
});
```

Auth must explicitly allow trusted origins. Authenticated caching/deduplication requires safe,
non-secret identity/key configuration; do not put credentials into cache keys or metric labels.
Default metrics strip URL query, fragment and userinfo, not secrets embedded in path segments.

Core's stable request context and final settlement coordinate queue release, cache storage,
inflight followers and metrics after blocking response/recovery processing. Background hooks
and stream completion are outside that settlement boundary.

Stateful custom plugins belong to one Core. Prefer `pluginFactories: [() => makePlugin()]`
when deriving clients; do not reuse stateful instances across independent clients. Repeating
`use()` with the same instance is idempotent; conflicting plugin names are rejected.

## Streaming

`stream()` returns the complete response envelope. Its `data` is an async-iterable byte stream:

```ts
const response = await api.stream("events");
const decoder = new TextDecoder();

for await (const chunk of response.data) {
  console.log(decoder.decode(chunk, { stream: true }));
}
```

The concrete stream implementation depends on the active runtime transport.

## TypeScript

Public request, response, client, and transport types are exported from the package root:

```ts
import {
  HyperClient,
  type HyperClientOptions,
  type RestRequestOptions,
  type UniversalResponse,
} from "hyperttp";

interface User {
  id: string;
  name: string;
}

const options: RestRequestOptions = {
  query: { active: true },
  timeout: 5_000,
};

const users = await new HyperClient({
  baseURL: "https://api.example.com",
}).get<User[]>("/users", options);
```

Generics describe the expected response shape; they do not validate untrusted server data at
runtime.

## Lifecycle

A client may own connection pools and other transport resources. Destroy long-lived clients during
application shutdown, not after every request:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com",
});

try {
  await runApplication(api);
} finally {
  await api.destroy(true);
}
```

Pass `true` for graceful shutdown. `false` delegates forced interruption to the transport;
non-cooperative operations are not guaranteed to cancel immediately. New sends/listens are
rejected after shutdown starts. Client destruction also closes its tracked servers.

`extend()` and `create()` currently construct new high-level clients with merged configuration;
`create()` is an alias of `extend()`, not Core's isolated-create contract. Explicitly supplied
transports may remain shared. Built-in plugins are recreated; inherited custom stateful plugins
must be replaced or supplied through factories.

## Coming from Axios?

The request style is intentionally familiar, but Hyperttp is not a drop-in Axios replacement.

| Axios                           | Hyperttp                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `axios.create({ baseURL })`     | `new HyperClient({ baseURL })`                                |
| `axios.get(url, { params })`    | `client.get(url, { query })`                                  |
| `axios.post(url, data, config)` | `client.post(url, body, options)`                             |
| `response.data`                 | Returned directly by shortcut methods                         |
| `response.status`               | Use an absolute URL with `client.rest.*`                      |
| `signal`                        | `signal` in request options or the positional signal argument |
| Request/response interceptors   | Built-in interceptor plugin or custom plugins                 |
| Instance default headers        | Request options or an interceptor                             |

Legacy `Request` and `PreparedRequest` exports remain available for compatibility but are
deprecated. New code should use `client.request()` and `RequestBuilder`.

## Choosing a client

The goal of this table is not to declare a universal winner. It highlights when each client is a
natural fit based on its documented built-in features.

| Capability                 | Fetch           | Axios                     | Ky                       | ofetch                     | Got                              | Hyperttp                       |
| -------------------------- | --------------- | ------------------------- | ------------------------ | -------------------------- | -------------------------------- | ------------------------------ |
| Primary runtimes           | Runtime native  | Browser, Node             | Browser, Node, Bun, Deno | Node, browser, workers     | Node                             | Node plus Fetch-based runtimes |
| Parsed-data shortcut       | No              | Via `response.data`       | Via `.json()`            | Yes                        | JSON mode                        | Yes                            |
| Full response access       | Yes             | Yes                       | Yes                      | Yes (`.raw`)               | Yes                              | Yes (`client.rest`)            |
| Automatic retries          | No              | No built-in               | Yes                      | Yes                        | Yes                              | Yes, external retry plugin     |
| Application response cache | No              | No built-in               | No built-in              | No built-in                | Yes                              | Yes                            |
| In-flight deduplication    | No              | No built-in               | No built-in              | No built-in                | No built-in                      | Yes                            |
| Built-in rate limiting     | No              | No                        | No                       | No                         | No                               | Yes                            |
| Built-in concurrency queue | No              | No                        | No                       | No                         | No                               | Yes                            |
| Interceptors or hooks      | No              | Interceptors              | Hooks                    | Interceptors               | Hooks                            | Interceptors and plugins       |
| Notable strength           | Zero dependency | Ecosystem and familiarity | Small Fetch-based API    | Universal Fetch experience | Node streams, HTTP/2, pagination | Integrated request policies    |

### Choose Fetch when

- you need no dependency;
- platform APIs are enough;
- you are comfortable composing policies yourself.

### Choose Axios when

- your team already knows its API;
- its mature ecosystem matters more than built-in operational policies;
- browser and Node support are the main targets.

### Choose Ky when

- you want a small, modern Fetch wrapper;
- retries and lifecycle hooks cover your needs;
- a Fetch-compatible response model is desirable.

### Choose ofetch when

- you want automatic parsing and retries with a Fetch-oriented universal API;
- Node, browser, and worker portability matters;
- you do not need cache, deduplication, rate limiting, and queueing in the client itself.

### Choose Got when

- the application is Node-only;
- advanced streams, HTTP/2, pagination, timings, and RFC caching are important.

### Choose Hyperttp when

- you want Axios-like request methods that return parsed data directly;
- cache, deduplication, rate limiting, and concurrency control should share one pipeline;
- the client is part of an SDK, service, bot, CLI, scraper, or integration with operational limits;
- you prefer one extensible client over several unrelated wrappers.

Comparison references: [Axios](https://github.com/axios/axios),
[Ky](https://github.com/sindresorhus/ky), [ofetch](https://github.com/unjs/ofetch), and
[Got](https://github.com/sindresorhus/got). Features and runtime support can change between releases;
verify the requirements that matter to your application.

Ky, Axios, ofetch, and Got are comparison references only. They are not Hyperttp dependencies.

## Runtime transports

- Node/Bun/Deno try the corresponding optional `@hyperttp/transport-*` package.
- Without a compatible optional transport, REST uses the built-in Fetch transport.
- WebRTC, WebSocket and MQTT require compatible protocol and transport implementations;
  REST/Fetch is not their physical delivery mechanism.
- Supply a custom transport as the second constructor argument or through `customTransport`.

Use `await client.getTransportName()` to inspect selection. `baseURL` resolution belongs to
high-level shortcuts and `RequestBuilder`; `client.rest.*` delegates directly to Core, so use
absolute URLs there unless the transport explicitly supports relative URLs.

Built-package mock smoke tests pass on Node, Bun, Deno and Chromium without Node polyfills.
They do not certify every optional transport or real network deployment. Browser checks cover
client requests and facade configuration, not opening a listening socket in a browser.
The REST fallback server depends on `node:http` support.

## Development and runtime checks

```sh
bun install --frozen-lockfile
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:node
npm run smoke:bun
npm run smoke:deno
npm run smoke:browser
```

Browser smoke requires Chromium (`CHROMIUM_PATH` can override its executable). The browser
page blocks network access; smoke requests use mock transports. Build first: smoke checks `dist`.

## Ecosystem

Hyperttp is composed from focused packages:

- `@hyperttp/core`
- `@hyperttp/types`
- `@hyperttp/interceptors`
- `@hyperttp/serializer`
- `@hyperttp/metrics`
- `@hyperttp/inflight`
- `@hyperttp/cache`
- `@hyperttp/ratelimit`
- `@hyperttp/queue`
- `@hyperttp/parser`
- `@hyperttp/auth`
- `@hyperttp/crypto`
- `@hyperttp/retry`
- optional `@hyperttp/transport-*` packages

## REST server facade

REST routing and typed services live in the high-level `hyperttp` package, not in `@hyperttp/core`:

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();
const server = client.server(3000, {
  host: "127.0.0.1",
  services: { users: { find: async (id: string) => ({ id }) } },
});

server.use(async (_request, next) => {
  const response = await next();
  return { ...response, headers: { ...response.headers, "x-app": "example" } };
});

server.rest.get("/users/:id", async ({ params, services }) => ({
  body: await services.users.find(params.id),
}));

await server.start();
// await server.close(); // or await client.destroy()
```

For an existing Core, use `createServer(core, { port: 3000, services })` from `hyperttp`.
Construction never binds a port. Register routes and middleware before `start()`; registration is frozen after start/close. Concurrent starts share one startup, and close waits for pending startup. A closed or failed facade cannot restart; create another facade instead.

Handlers receive decoded path `params`, inferred `services`, the REST request fields and the stable server `context`. Query values remain `string | string[]`, and body remains `unknown` until application validation. Services are application-owned: the facade never creates or disposes them.

Routing is case-sensitive with exact trailing slashes; literal segments take precedence over parameters independent of registration order. Equal method/pattern registrations (including renamed parameters) are rejected. Unknown paths return 404; a known path with an unregistered method returns 405 with `Allow`. HEAD/OPTIONS must be registered explicitly; no implicit GET fallback or CORS policy is added. Middleware wraps the handler/404/405 response, can short-circuit, and may call `next()` once. Malformed matched path parameters return 400 before route middleware.

Core `onServerRequest`, `onServerResponse`, `onServerError` and `onServerSettled` hooks still wrap this facade. Client auth/cache hooks are not inbound authorization: use server middleware or dedicated server hooks. This first facade is REST-only; no WebRTC server operations are inferred from client methods.

## License

MIT
