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

---

## Buttons to Switch Language

[English](#english-version) | [Русский](#russian-version)

---

## Russian Version

### Описание

Расширенный HTTP клиент для Node.js с кэшированием, ограничением запросов, очередями запросов, автоматическими повторными попытками, управлением cookie и декомпрессией ответов.

### Возможности

- Автоматическое предотвращение дублирования запросов
- LRU кэширование с TTL
- Настраиваемое ограничение запросов
- Управление конкурентными запросами
- Экспоненциальная задержка с джиттером
- Поддержка cookie jar
- Автопарсинг JSON/XML
- Поддержка сжатия (gzip, deflate, brotli)

### Пример использования

```ts
import HttpClientImproved from "./src/Hyperttp/Core/HttpClientImproved";
import Request from "./src/Hyperttp/Request";

const client = new HttpClientImproved({
  timeout: 10000,
  maxConcurrent: 10,
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

const req = new Request({ scheme: "https", host: "example.com", port: 443 });
const data = await client.get(req);
console.log(data);
```

---

## English Version

### Description

Advanced HTTP client for Node.js with caching, rate limiting, request queuing, automatic retries, cookie management, and response decompression.

### Features

- Automatic request deduplication
- LRU caching with TTL
- Configurable rate limiting
- Concurrent request management
- Exponential backoff with jitter
- Cookie jar support
- Automatic response parsing (JSON/XML)
- Compression support (gzip, deflate, brotli)

### Usage Example

```ts
import HttpClientImproved from "./src/Hyperttp/Core/HttpClientImproved";
import Request from "./src/Hyperttp/Request";

const client = new HttpClientImproved({
  timeout: 10000,
  maxConcurrent: 10,
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

const req = new Request({ scheme: "https", host: "example.com", port: 443 });
const data = await client.get(req);
console.log(data);
```
