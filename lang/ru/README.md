# Hyperttp

## Описание

Расширенный HTTP клиент для Node.js с кэшированием, ограничением запросов, очередями запросов, автоматическими повторными попытками, управлением cookie и декомпрессией ответов.

## Возможности

- Автоматическое предотвращение дублирования запросов
- LRU кэширование с TTL
- Настраиваемое ограничение запросов
- Управление конкурентными запросами
- Экспоненциальная задержка с джиттером
- Поддержка cookie jar
- Автопарсинг JSON/XML
- Поддержка сжатия (gzip, deflate, brotli)

## Пример использования

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

## Другие языки

- [English](../README.md)
