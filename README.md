# Hyperttp ⚡

[English](https://github.com/Dirold2/hyperttp) • [Русский](https://github.com/Dirold2/hyperttp/tree/main/lang/ru)

An advanced, high-performance HTTP client for Node.js and Bun featuring built-in caching, rate limiting,
request queuing, inflight request deduplication, performance metrics, and a fluent chainable API.
Built as a feature-rich, production-ready extension over the optimized `@hyperttp/core` engine.

---

## 🔥 Key Features

- **🔀 Concurrency Management:** Built-in queue plugin (`withQueue`) to strictly enforce concurrent request limits.
- **💾 Smart LRU Caching:** Dedicated caching layer (`withCache`) with TTL support to prevent redundant network drift.
- **🚦 Rate Limiting:** Built-in Token Bucket algorithm to protect against external API blocks and rate limits.
- **🛡️ Inflight Deduplication:** Prevents duplicate simultaneous requests to the same endpoint if the first is pending.
- **📈 Real-Time Metrics:** Out-of-the-box telemetry tracking latencies, RPS, cache hits, and overall client health.
- **🔌 Modular Architecture:** Clean pipeline approach allowing custom plugins, serialization layers, and interceptors.
- **💎 Fluent Request Builder API:** Clean, chainable API syntax to compose and configure requests with ease.

---

## 🚀 Installation

```bash
npm install hyperttp

```

---

## 📦 Quick Start

Simply import `HyperClient` and start dispatched requests. Core features like caching, queue management,
and rate limiting are instantly preconfigured and active out of the box.

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Simple GET request (instantly resolves to the pre-parsed type-safe body)
const data = await client.get<MyDataType>("https://api.example.com/data");

// POST request specifying expected response type alongside body payload
const newItem = await client.post("https://api.example.com/items", "json", {
  name: "New Item Structure",
});
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

  // 🔌 Plugin Registration
  plugins: [], // Inline custom plugin instances or absolute module paths

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

## 🛠️ Advanced Features

### Fluent Builder API

Invoke the `.request(url)` chain to programmatically craft highly specific request structures on the fly:

```typescript
const result = await client
  .request("https://api.example.com/search")
  .post() // Specify HTTP Method (Defaults to GET)
  .query({ q: "hyperttp", p: 1 }) // Safely append and encode Query Parameters
  .headers({ Authorization: "Bearer TOKEN" })
  .jsonBody({ activeOnly: true }) // Automatically serializes and sets Content-Type header
  .json() // Asserts expected response format (.text(), .buffer(), .stream())
  .timeout(5000) // Instantiates a contextual, request-scoped AbortSignal timeout
  .send();
```

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
const streamResponse = await client.stream(
  "https://stream.example.com/audio.mp3",
);
const reader = streamResponse.body.getReader();
```

---

## 🏗️ Architecture Pipeline

`HyperClient` structures outbound and inbound requests across a sequential pipeline composed of granular plugins:

1. **withSerializer / withParser:** Manages automated runtime type transformations, payload normalization, and safe serialization.
2. **withCache:** Intercepts identical outgoing target operations, returning data directly from the LRU cache when matching.
3. **withInflight:** Identifies matching parallel operations and merges them into a single flight path, avoiding race conditions.
4. **withRateLimit & withQueue:** Sorts requests into a coordinated FIFO pattern,
enforcing strict window boundaries and capacity bounds.
5. **withInterceptors:** Exposes direct developer lifecycle hooks to capture requests and responses before execution steps.
6. **withMetrics:** Records execution metrics across the entire lifecycle to offer real-time health telemetry.

---

## 📄 License

MIT
