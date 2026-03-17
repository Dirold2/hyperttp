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

## Basic Usage

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved({
  timeout: 10000,
  maxConcurrent: 10,
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

// Simple GET request
const data = await client.get("https://api.example.com/data");
console.log(data);

// POST request with JSON body
const postData = await client.post("https://api.example.com/items", {
  name: "Item 1",
});
console.log(postData);

// Using fluent RequestBuilder
const builderData = await client
  .request("https://api.example.com/search")
  .query({ q: "hyperttp", limit: 10 })
  .headers({ Authorization: "Bearer TOKEN" })
  .json()
  .send();

console.log(builderData);
```

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

## Advanced Features

- Caching: Automatically caches GET/HEAD responses, configurable TTL and max size

- Rate limiting: Prevents overwhelming servers

- Retries: Automatic retries for 408, 429, 500, 502, 503, 504 with exponential backoff

- Cookies: Persistent cookie jar per client

- Metrics: Track request timings, bytes sent/received, retries, and cache hits

## Documentation

- [Русский](https://github.com/Dirold2/hyperttp/blob/main/lang/ru/README.md)
