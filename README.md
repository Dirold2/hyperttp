# Hyperttp

Advanced HTTP client for Node.js with caching, rate limiting, request queuing, automatic retries, cookie management, and response decompression.

## Features

- Automatic request deduplication
- LRU caching with TTL
- Configurable rate limiting
- Concurrent request management
- Exponential backoff with jitter
- Cookie jar support
- Automatic response parsing (JSON/XML)
- Compression support (gzip, deflate, brotli)

## Usage Example

```ts
import { HttpClientImproved, Request } from "hyperttp";

const client = new HttpClientImproved({
  timeout: 10000,
  maxConcurrent: 10,
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

const req = new Request({ scheme: "https", host: "example.com", port: 443 });
const data = await client.get(req);
console.log(data);
```

## Other Languages

- [Русский](lang/ru/README.md)
