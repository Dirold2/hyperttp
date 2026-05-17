# Hyperttp

Advanced HTTP client for Node.js with caching, rate limiting, request queuing, automatic retries, cookie management, and automatic JSON/XML parsing.

## Features

- Automatic request deduplication
- LRU caching with TTL
- Configurable rate limiting
- Concurrent request management
- Exponential backoff with jitter for retries
- Cookie jar support
- Automatic response parsing (JSON/XML/text/buffer)
- Automatic handling of redirects
- Fluent request builder API

## Installation

```bash
npm install hyperttp
```

---

## 🚀 Simple Usage

Get started in seconds — just import and make requests:

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved();

// Simple GET request
const data = await client.get("https://api.example.com/data");
console.log(data);

// POST request with JSON body
const postData = await client.post("https://api.example.com/items", {
  name: "Item 1",
});
console.log(postData);
```

**That's it!** Caching, request queuing, and retries are enabled by default.

---

## ⚙️ Advanced Configuration

Configure all components for your specific needs:

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved({
  // 🌐 Network settings
  network: {
    timeout: 10000,                    // Request timeout (ms)
    maxConcurrent: 50,                 // Max concurrent requests
    maxRedirects: 5,                   // Max redirects to follow
    followRedirects: true,             // Follow redirects automatically
    userAgent: "MyApp/1.0",            // User-Agent header
    allowHttp2: true,                  // Enable HTTP/2
    pipelining: 10,                    // Request pipelining
    keepAliveTimeout: 30000,           // Keep-alive timeout
    rejectUnauthorized: false,         // Skip SSL certificate validation
  },

  // 💾 Caching (LRU cache)
  cache: {
    enabled: true,                     // Enable caching
    ttl: 1000 * 60 * 5,                // Cache TTL (5 minutes)
    maxSize: 500,                      // Max cache size (entries)
  },

  // 🚦 Rate Limiting (Token Bucket)
  rateLimit: {
    enabled: true,                     // Enable rate limiting
    maxRequests: 100,                  // Max requests per window
    windowMs: 60000,                   // Time window (ms)
  },

  // 📊 Request Queue
  queue: {
    enabled: true,                     // Enable request queue
  },

  // 🔄 Retry Logic
  retry: {
    maxRetries: 3,                     // Max retry attempts
    baseDelay: 1000,                   // Base delay between retries (ms)
    maxDelay: 10000,                   // Max delay (ms)
    jitter: true,                      // Add randomization to delays
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
  },

  // 📈 Metrics
  metrics: {
    enabled: true,                     // Enable metrics collection
    maxHistory: 1000,                  // Metrics history size
  },

  // 🔍 Logging
  verbose: true,                       // Enable verbose logging
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});
```

### Using Advanced Features

```typescript
// Using Fluent RequestBuilder
const result = await client
  .request("https://api.example.com/search")
  .query({ q: "hyperttp", limit: 10 })
  .headers({ Authorization: "Bearer TOKEN" })
  .json()
  .send();

console.log(result);

// Get client statistics
const stats = client.getStats();
console.log({
  cacheSize: stats.cacheSize,           // Current cache size
  inflightRequests: stats.inflightRequests, // Active requests
  queuedRequests: stats.queuedRequests, // Requests waiting in queue
  activeRequests: stats.activeRequests, // Currently executing
  currentRateLimit: stats.currentRateLimit, // Used rate limit slots
});

// Work with metrics
const metrics = client.getMetrics("https://api.example.com/data");
console.log(metrics); // Timing, bytes, retries, cache hits

// Clear cache
client.clearCache();

// Clear metrics
client.clearMetrics();

// Graceful shutdown
await client.destroy();
```

---

## Fluent Builder API

```typescript
client
  .request("https://api.example.com/data")
  .get() // default
  .headers({ "X-Test": "123" })
  .query({ page: 1 })
  .json() // or .text(), .xml()
  .send()
  .then(console.log);
```

---

## Architecture Components

### 💾 CacheManager
LRU cache with TTL and metadata support (etag, lastModified):
- Automatically caches GET/HEAD responses
- Configurable size and TTL
- Methods: `get()`, `set()`, `getWithMetadata()`, `setWithMetadata()`

### 📊 QueueManager
Request queue management:
- Concurrency control (maxConcurrent)
- FIFO processing of pending requests
- Methods: `enqueue()`, `activeCount`, `queuedCount`

### 🚦 RateLimiter
Token bucket algorithm with wait queue:
- Smooth rate limiting
- FIFO waiting when limit exceeded
- Methods: `wait()`, `tryConsume()`, `remainingRequests`

### 📈 MetricsManager
Performance metrics collection and analysis:
- Request timing
- Bytes sent/received
- Cache hits/misses
- Retry counts

---

## Documentation

- [Русский](https://github.com/Dirold2/hyperttp/blob/main/lang/ru/README.md)