# Hyperttp

Продвинутый HTTP-клиент для Node.js с кешированием, ограничением скорости, очередями запросов, автоматическими повторными попытками, поддержкой cookie и парсингом JSON/XML.

## Возможности

- Автоматическое объединение одинаковых запросов (deduplication)
- LRU-кеширование с TTL
- Настраиваемое ограничение скорости (rate limiting)
- Управление конкурентными запросами
- Экспоненциальные задержки с джиттером при повторных попытках
- Поддержка cookie
- Автоматический парсинг ответов (JSON/XML/text/buffer)
- Автоматическая обработка редиректов
- Удобный Fluent API через RequestBuilder

## Установка

```bash
npm install hyperttp
```

## Пример использования

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved({
  timeout: 10000,
  maxConcurrent: 10,
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});

// Простой GET-запрос
const data = await client.get("https://api.example.com/data");
console.log(data);

// POST-запрос с JSON-телом
const postData = await client.post("https://api.example.com/items", {
  name: "Item 1",
});
console.log(postData);

// Использование Fluent RequestBuilder
const builderData = await client
  .request("https://api.example.com/search")
  .query({ q: "hyperttp", limit: 10 })
  .headers({ Authorization: "Bearer TOKEN" })
  .json()
  .send();

console.log(builderData);
```

### Fluent API через RequestBuilder

```typescript
client
  .request("https://api.example.com/data")
  .get() // по умолчанию GET
  .headers({ "X-Test": "123" })
  .query({ page: 1 })
  .json() // или .text(), .xml()
  .send()
  .then(console.log);
```

## Расширенные возможности

- Кеширование: Автоматически кеширует GET/HEAD запросы, с настраиваемым TTL и размером кеша

- Ограничение скорости: Предотвращает перегрузку сервера

- Повторные попытки: Автоматически повторяет запросы с кодами 408, 429, 500, 502, 503, 504 с экспоненциальной задержкой

- Cookie: Персистентный cookie-jar для каждого клиента

- Метрики: Сбор информации о времени выполнения, количестве байт, повторных попытках и попаданиях в кеш

## Документация

- [English](https://github.com/Dirold2/hyperttp/blob/main/README.md)
