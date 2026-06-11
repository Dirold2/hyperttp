# Hyperttp ⚡

> English | [Русский](https://github.com/Dirold2/hyperttp/tree/main/lang/ru)

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## 🌐 Language

- 🇺🇸 English
- 🇷🇺 [Русский](https://github.com/Dirold2/hyperttp/tree/main/lang/ru)

---

## 🔗 Quick Links

- 🏢 **Organization:** [github.com/IT-IF-OR](https://github.com/IT-IF-OR)
- 👤 **Author:** [github.com/dirold2](https://github.com/dirold2)
- 📦 **npm:** [npmjs.com/org/hyperttp](https://www.npmjs.com/org/hyperttp)
- ⚙️ **Core engine:** [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core)

---

**Hyperttp** is a batteries-included, high-performance HTTP client for Node.js, Bun, Deno, and Browser environments.
It is a feature-rich, production-ready extension over the optimized [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core) engine,
shipping with caching, rate limiting, request queuing, inflight deduplication, performance metrics, and a fluent chainable API — all pre-wired and ready to use.

---

## 🔥 Key Features

- **🎯 Smart Response Parsing:** Automatically parses responses based on `responseType` (`json`, `text`, `xml`, `html`, `buffer`, `blob`, `stream`).
- **🔀 Concurrency Management:** Built-in queue plugin (`withQueue`) to strictly enforce concurrent request limits.
- **💾 Smart LRU Caching:** Dedicated caching layer (`withCache`) with TTL support to prevent redundant network drift.
- **🚦 Rate Limiting:** Built-in Token Bucket algorithm to protect against external API blocks and rate limits.
- **🛡️ Inflight Deduplication:** Prevents duplicate simultaneous requests to the same endpoint if the first is pending.
- **📈 Real-Time Metrics:** Out-of-the-box telemetry tracking latencies, RPS, cache hits, and overall client health.
- **🔌 Modular Architecture:** Clean pipeline approach allowing custom plugins, serialization layers, and interceptors.
- **💎 Fluent Request Builder API:** Clean, chainable API syntax to compose and configure requests with ease.
- **🗜️ Transparent Decompression:** Automatic handling of `gzip`, `deflate`, and `br` (Brotli) out of the box.

---

## 📦 Ecosystem Packages

| Package                                                                                  | Description                                  | Repository                                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| **`hyperttp`** (you are here)                                                            | High-level client with all plugins pre-wired | [GitHub](https://github.com/dirold2/hyperttp)                   |
| [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core)                         | Low-level core with transport pipeline       | [GitHub](https://github.com/IT-IF-OR/hyperttp-core)             |
| [`@hyperttp/types`](https://www.npmjs.com/package/@hyperttp/types)                       | Shared TypeScript type definitions           | [GitHub](https://github.com/dirold2/hyperttp-types)             |
| [`@hyperttp/transport-bun`](https://www.npmjs.com/package/@hyperttp/transport-bun)       | Native Bun transport                         | [GitHub](https://github.com/IT-IF-OR/hyperttp-transport-bun)    |
| [`@hyperttp/transport-undici`](https://www.npmjs.com/package/@hyperttp/transport-undici) | Undici transport for Node.js                 | [GitHub](https://github.com/IT-IF-OR/hyperttp-transport-undici) |
| [`@hyperttp/parser`](https://www.npmjs.com/package/@hyperttp/parser)                     | Response body parser (JSON/XML/HTML)         | [GitHub](https://github.com/IT-IF-OR/hyperttp-parser)           |
| [`@hyperttp/serializer`](https://www.npmjs.com/package/@hyperttp/serializer)             | Request body serializer                      | [GitHub](https://github.com/IT-IF-OR/hyperttp-serializer)       |
| [`@hyperttp/cache`](https://www.npmjs.com/package/@hyperttp/cache)                       | HTTP response caching                        | [GitHub](https://github.com/IT-IF-OR/hyperttp-cache)            |
| [`@hyperttp/queue`](https://www.npmjs.com/package/@hyperttp/queue)                       | Request queueing                             | [GitHub](https://github.com/IT-IF-OR/hyperttp-queue)            |
| [`@hyperttp/ratelimit`](https://www.npmjs.com/package/@hyperttp/ratelimit)               | Rate limiting                                | [GitHub](https://github.com/IT-IF-OR/hyperttp-ratelimit)        |
| [`@hyperttp/inflight`](https://www.npmjs.com/package/@hyperttp/inflight)                 | In-flight request deduplication              | [GitHub](https://github.com/IT-IF-OR/hyperttp-inflight)         |
| [`@hyperttp/interceptors`](https://www.npmjs.com/package/@hyperttp/interceptors)         | Request/response interceptors                | [GitHub](https://github.com/IT-IF-OR/hyperttp-interceptors)     |
| [`@hyperttp/metrics`](https://www.npmjs.com/package/@hyperttp/metrics)                   | Performance metrics                          | [GitHub](https://github.com/IT-IF-OR/hyperttp-metrics)          |

### Which package should I use?

- **Just need HTTP requests with caching, retries, and parsing?** → Use `hyperttp` (this package)
- **Need full control over the pipeline?** → Use `@hyperttp/core`
- **Building a custom transport or plugin?** → Use `@hyperttp/types`

---

## 🚀 Installation

```bash
npm install hyperttp

# Optional: install a specific transport
npm install @hyperttp/transport-bun    # for Bun
npm install @hyperttp/transport-undici # for Node.js
```

---

## 📦 Quick Start

Simply import `HyperClient` and start dispatching requests. Core features like caching, queue management,
and rate limiting are instantly preconfigured and active out of the box.

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Simple GET request (instantly resolves to the pre-parsed type-safe body)
const data = await client.get<MyDataType>("https://api.example.com/data");

// POST request specifying expected response type alongside body payload
const newItem = await client.post<Item>("https://api.example.com/items", "json", {
  name: "New Item Structure",
});

// Explicit response type
const html = await client.get<string>("https://example.com", "text");
const xml = await client.get<XmlDoc>("https://api.example.com/feed.xml", "xml");

// Streaming responses (e.g., LLM completions)
const chatStream = await client.stream("https://api.openai.com/v1/chat/completions");
const reader = chatStream.body.getReader();
```

---

## 💎 Fluent Builder API

Invoke the `.request(url)` chain to programmatically craft highly specific request structures on the fly:

```typescript
const user = await client
  .request("https://api.example.com/users")
  .post() // Specify HTTP Method (Defaults to GET)
  .query({ include: "profile" }) // Safely append and encode Query Parameters
  .headers({ "X-Request-ID": crypto.randomUUID() })
  .jsonBody({ name: "John", email: "john@example.com" }) // Automatically serializes and sets Content-Type header
  .json<User>() // Asserts expected response format (.text(), .buffer(), .stream())
  .timeout(5000) // Instantiates a contextual, request-scoped AbortSignal timeout
  .send();
```

---

## ⚙️ Advanced Configuration

Fine-tune every infrastructure layer by supplying a configuration object directly to the `HyperClient` constructor:

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient({
  // 🌐 Core Network Level Settings (NetworkOptions)
  network: {
    timeout: 10000, // Request timeout in milliseconds
    maxConcurrent: 50, // Maximum simultaneous active sockets (0 = unlimited)
    pipelining: 1, // Pipelined requests per connection limit
    keepAliveTimeout: 30000, // Keep-alive socket preservation time in ms
    rejectUnauthorized: true, // Reject untrusted or self-signed SSL certificates
    followRedirects: true, // Automatically follow HTTP redirects
    maxRedirects: 5, // Maximum follow threshold for redirects
    maxResponseBytes: 10 * 1024 * 1024, // Prevents OOM by capping response body size (10 MB)
    userAgent: "HyperClient/2.0", // Global fallback User-Agent header
    headers: {
      // Default baseline headers appended to every request
      "X-App-Client": "Backend",
    },
    validateStatus: (status) => status >= 200 && status < 300, // Status success validation rules
  },

  // 🔄 Automated Retry Logic (RetryOptions)
  retry: {
    maxRetries: 3, // Number of recovery attempts before failing
    baseDelay: 1000, // Initial delay baseline between retries (ms)
    maxDelay: 10000, // Maximum cap for retry delay intervals (ms)
    retryStatusCodes: [408, 429, 502, 503, 504], // Target status codes that trigger a retry
    jitter: true, // Randomized delay variations to avoid thundering herd crashes
  },

  // 📈 Telemetry and Engine Logging
  trackMetrics: true, // Enables global system performance collection
  verbose: false, // Toggles internal micro-logs output
  logger: (level, message, meta) => {
    // Custom logging implementation sink
    console.log(`[${level}] ${message}`, meta ?? "");
  },

  // 💾 Extended Plugin Configurations (Injected via HyperttpPluginsExtension)
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes cache lifespan
    maxSize: 500, // Max item limit for local LRU storage
  },
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000,
  },
  inflight: {
    enabled: true,
  },
});
```

---

## 🔌 Pre-Wired Plugins

When using `HyperClient`, the following plugins are automatically registered:

| Plugin             | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `withSerializer`   | Serializes request bodies (JSON, FormData, URLSearchParams) |
| `withParser`       | Parses response bodies based on `responseType`              |
| `withQueue`        | Queues requests when concurrency limit is reached           |
| `withRateLimit`    | Enforces rate limits                                        |
| `withInflight`     | Deduplicates in-flight requests                             |
| `withCache`        | Caches responses based on HTTP headers                      |
| `withInterceptors` | Request/response interceptors                               |
| `withMetrics`      | Collects performance metrics                                |

### Custom Plugins

Extend the client with your own hooks:

```typescript
client.use({
  name: "performance-logger",
  priority: 100, // Sorted execution priority (higher runs first)
  mode: "background", // Forces onResponse to run as a non-blocking side-effect

  setup: (ctx) => {
    ctx.config.logger?.info?.("Plugin active");
  },

  onRequest: async (req, ctx) => {
    req.meta.startTime = performance.now();
  },

  onResponse: async (res, req, ctx) => {
    const duration = performance.now() - (req.meta.startTime as number);
    console.log(`[${req.method}] ${req.url} -> ${res.status} (${duration.toFixed(2)}ms)`);
  },

  onError: async (error, req, ctx) => {
    console.error(`Request failed to ${req.url}: ${error.message}`);
    // Return a response object here to bypass/recover from the failure
  },
});
```

### Plugin Phases

| Phase       | Hook             | Description                                             |
| ----------- | ---------------- | ------------------------------------------------------- |
| **REQUEST** | `onRequest`      | Intercepts before execution. Supports short-circuiting. |
| **DATA**    | `onResponseData` | Transforms raw transport responses before mapping.      |
| **FORMAT**  | `onResponse`     | Modifies client-facing responses.                       |
| **ERROR**   | `onError`        | Catches and recovers from errors.                       |

---

## 🏗️ Architecture Pipeline

`HyperClient` structures outbound and inbound requests across a sequential pipeline composed of granular plugins:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HyperClient                              │
│   (Auto-wires: Serializer → Parser → Queue → RateLimit →        │
│    Inflight → Cache → Interceptors → Metrics)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HyperCore                               │
│                                                                 │
│  1. Request Pipeline (onRequest) ─── short-circuit capable      │
│                     │                                           │
│  2. Transport Execution (HyperTransport)                        │
│     ├─ BunTransport (native Bun fetch)                          │
│     ├─ UndiciTransport (Node.js)                                │
│     └─ NodeTransport (global fetch)                             │
│                     │                                           │
│  3. Response Data Pipeline (onResponseData)                     │
│                     │                                           │
│  4. Internal Processing (decompression, mapping)                │
│                     │                                           │
│  5. Response Pipeline (onResponse)                              │
│     ├─ Mutators (sync/async modification)                       │
│     └─ Side Effects (background, non-blocking)                  │
│                     │                                           │
│  6. Error Pipeline (onError) ─── recovery capable               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Advanced Features

### Statistics, Cache, and Metrics Engine

```typescript
// Inspect pipeline internals (active connections, active queue payloads)
const stats = client.getStats();
console.log(stats);

// Retrieve aggregated historical latency and performance metrics
const allMetrics = client.getAllMetrics();
console.log(allMetrics);

// Flush the entire local response cache programmatically
await client.clearCache();

// Identify the execution context's current driving transport layout
const transportName = await client.getTransportName();
console.log(`Current Active Transport Driver: ${transportName}`);

// Gracefully teardown the client instance, draining keep-alive pools and sockets
await client.destroy();
```

### Stream Handlers

```typescript
// Returns an HttpResponse interface carrying a custom ReadableStream with clone() support
const streamResponse = await client.stream("https://stream.example.com/audio.mp3");
const reader = streamResponse.body.getReader();
```

### Extending Configuration

Create derived clients with merged configuration:

```typescript
const authenticatedClient = client.extend({
  network: { headers: { Authorization: "Bearer token_abc" } },
});
```

---

## 🔄 Migration from axios

If you're migrating from axios, Hyperttp provides a familiar API:

```typescript
// axios
import axios from "axios";
const { data } = await axios.get("/users/123");

// hyperttp (drop-in replacement)
import { HyperClient } from "hyperttp";
const client = new HyperClient();
const data = await client.get("/users/123");
```

---

## 📊 Benchmarks

For detailed benchmarks across Bun and Node.js runtimes with various transports, see the [`@hyperttp/core` benchmarks](https://github.com/IT-IF-OR/hyperttp-core#-benchmarks).

**Key takeaways:**

- **Bun + BunTransport**: ~15.22K RPS with all plugins enabled
- **Node.js + UndiciTransport**: ~10.82K RPS with all plugins enabled
- **Plugin Overhead**: Only ~9-14% compared to the bare `@hyperttp/core`
- **Zero Error Rate**: 0% errors across all benchmark scenarios

---

## 📄 License

MIT

---

<p align="center">
  <a href="https://github.com/dirold2">dirold2</a>
</p>
