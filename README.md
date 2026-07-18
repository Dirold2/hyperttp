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

// Automatically parses response based on the second argument
const user = await client.get("https://api.example.com/users/1", "json");

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

### 1. Install core package

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

await client.get("/users", "json");
await client.post("/users", { name: "John" }, "json");
await client.put("/users/1", { name: "Alice" }, "json");
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
    retries: 3,
  },

  cache: {
    ttl: 60_000,
  },

  timeout: 30_000,
});
```

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

Hyperttp works **out of the box** in any environment using standard `globalThis.fetch`.

For maximum performance and native features,
you can optionally install an optimized transport package tailored for your specific runtime:

| Runtime | Package                      | Description                                  |
| ------- | ---------------------------- | -------------------------------------------- |
| Node.js | `@hyperttp/transport-undici` | Uses high-performance native `undici` client |
| Bun     | `@hyperttp/transport-bun`    | Leverages native `Bun.fetch` optimizations   |
| Deno    | `@hyperttp/transport-deno`   | Optimized for native Deno network layer      |

Once installed, no additional configuration is required:

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();
// Automatically discovers and uses UndiciTransport on Node.js, BunTransport on Bun, etc.
```

---

## Ecosystem

- hyperttp
- @hyperttp/core
- @hyperttp/types
- @hyperttp/parser
- @hyperttp/cache
- @hyperttp/retry
- @hyperttp/metrics
- @hyperttp/serializer
- @hyperttp/transport-undici
- @hyperttp/transport-bun
- @hyperttp/transport-deno

---

## Performance

Hyperttp is designed with zero-allocation middleware pipelines and minimal overhead.
By using native runtime transports, it achieves near-raw-fetch speeds while providing a full feature set.

Detailed benchmarks comparing memory footprints and
request execution times across runtimes are available in the [IT-IF-OR/bench](https://github.com/IT-IF-OR/bench) repository.

---

## License

MIT
