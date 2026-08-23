# Hyperttp ⚡

**HTTP without boilerplate.**

> English | [Русский](https://github.com/dirold2/hyperttp/tree/main/lang/ru)

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

An HTTP client for **Node.js**, **Bun**, **Deno**, and the **Browser** that provides retries,
caching, rate limiting, metrics, parsing, serialization, and interceptors **out of the box**.

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Parse JSON explicitly, regardless of the response Content-Type
const user = await client.request("https://api.example.com/users/1").json().send();

console.log(user);
```

No manual setup.
No unnecessary code.
Just make requests.

---

## What is Hyperttp?

Most HTTP clients solve one problem:

> "Send an HTTP request."

But real applications need much more:

- retries
- rate limiting
- caching
- request deduplication
- parsing
- serialization
- metrics
- interceptors
- request queues
- timeouts

With most libraries, this turns into installing many additional packages and building your own wrappers.

Hyperttp provides these capabilities through a single client.

---

## Why Hyperttp?

Instead of building your own networking layer:

```text
fetch
 ├── retry
 ├── cache
 ├── parser
 ├── metrics
 ├── serializer
 ├── queue
 ├── timeout
 └── custom wrappers

```

Hyperttp provides a ready-to-use infrastructure:

```text
Hyperttp
 ├── Retry
 ├── Cache
 ├── Metrics
 ├── Parser
 ├── Serializer
 ├── Queue
 ├── Interceptors
 ├── Timeout
 └── Rate Limiter

```

Create a client.

Start making requests.

---

## Quick Start

### 1. Install Hyperttp

```bash
# Node.js
npm install hyperttp
pnpm add hyperttp

# Bun
bun add hyperttp

# Deno
deno add npm:hyperttp

```

### 2. Basic Usage

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient({
  baseURL: "https://api.example.com",
});

await client.get("/users"); // Parses based on Content-Type
await client.request("/users").json().send();
await client.request("/users").post().jsonBody({ name: "John" }).json().send();
await client.request("/users/1").put().jsonBody({ name: "Alice" }).json().send();
await client.delete("/users/1");
```

---

## Hyperttp vs Other HTTP Clients

| Feature                  | fetch | Axios  | Ky      | Hyperttp |
| ------------------------ | ----- | ------ | ------- | -------- |
| Promise API              | ✅    | ✅     | ✅      | ✅       |
| Retry                    | ❌    | Plugin | ✅      | ✅       |
| Cache                    | ❌    | ❌     | ❌      | ✅       |
| Metrics                  | ❌    | ❌     | ❌      | ✅       |
| Rate Limiter             | ❌    | ❌     | ❌      | ✅       |
| Queue                    | ❌    | ❌     | ❌      | ✅       |
| Parser                   | ❌    | ❌     | Partial | ✅       |
| Serializer               | ❌    | ❌     | ❌      | ✅       |
| Interceptors             | ❌    | ✅     | Hooks   | ✅       |
| Transport auto-detection | ❌    | ❌     | ❌      | ✅       |

---

## Who is Hyperttp for?

Perfect for:

- REST APIs & SDKs
- CLI applications & Discord bots
- Backend & Serverless services
- Web scraping
- Enterprise applications

---

## Advanced Configuration

```ts
const client = new HyperClient({
  baseURL: "https://api.example.com",

  retry: {
    maxRetries: 3,
  },

  cache: {
    ttl: 60_000,
  },

  timeout: 30_000,
});
```

### Built-in Plugins

`HyperClient` automatically registers interceptors, serialization, metrics, request deduplication,
caching, rate limiting, queueing, and response parsing.

Disable only automatic response parsing:

```ts
const client = new HyperClient({
  responseConverter: false,
});
```

Disable the entire built-in plugin set for a minimal pipeline:

```ts
const client = new HyperClient({
  builtInPlugins: false,
});
```

The REST protocol remains available when built-in plugins are disabled. Custom plugins supplied
through `plugins` or registered with `client.use()` continue to work. When `builtInPlugins` is
`false`, `responseConverter` has no effect because the built-in parser is not registered.

---

## Architecture

```text
Application
     │
     ▼
 HyperClient
     │
 Plugin Pipeline
     │
 Transport (Auto-detected)
     │
    HTTP

```

All components are independent and replaceable.

---

## Runtime Transports

Hyperttp uses `@hyperttp/transport-undici` automatically on Node.js. The transport is included with
the `hyperttp` package, so no additional installation or client configuration is required:

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();
// Uses UndiciTransport on Node.js.
```

Other runtimes can use the standard `globalThis.fetch` fallback. Runtime-specific transport packages
can be installed separately when available:

| Runtime | Package                      | Availability                        |
| ------- | ---------------------------- | ----------------------------------- |
| Node.js | `@hyperttp/transport-undici` | Included and selected automatically |
| Bun     | `@hyperttp/transport-bun`    | Optional runtime-specific transport |
| Deno    | `@hyperttp/transport-deno`   | Optional runtime-specific transport |

---

## Ecosystem

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
- `@hyperttp/transport-undici`

---

## Performance

The benchmark suite compares complete client stacks rather than isolated request primitives. Results
from a local environment are not a guarantee of production performance, so test with your own
workload, concurrency, payloads, and network conditions.

Benchmark sources and current results are available in
[IT-IF-OR/bench](https://github.com/IT-IF-OR/bench).

---

## License

MIT © dirold2
