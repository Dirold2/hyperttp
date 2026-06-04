# Hyperttp

Продвинутый HTTP-клиент для Node.js с кешированием, ограничением скорости,
очередями запросов, автоматическими повторными попытками,
поддержкой cookie и парсингом JSON/XML.

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

---

## 🚀 Простой вариант использования

Начните работу за секунды — просто импортируйте и делайте запросы:

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved();

// Простой GET-запрос
const data = await client.get("https://api.example.com/data");
console.log(data);

// POST-запрос с JSON-телом
const postData = await client.post("https://api.example.com/items", {
  name: "Item 1",
});
console.log(postData);
```

**Всё!** Кэширование, очередь запросов и повторные попытки уже включены по умолчанию.

---

## ⚙️ Расширенный вариант с полной конфигурацией

Настройте все компоненты под ваши задачи:

```typescript
import HttpClientImproved from "hyperttp";

const client = new HttpClientImproved({
  // 🌐 Сетевые настройки
  network: {
    timeout: 10000, // Таймаут запроса (мс)
    maxConcurrent: 50, // Максимум одновременных запросов
    maxRedirects: 5, // Максимум редиректов
    followRedirects: true, // Следовать редиректам
    userAgent: "MyApp/1.0", // User-Agent
    allowHttp2: true, // Разрешить HTTP/2
    pipelining: 10, // Конвейеризация запросов
    keepAliveTimeout: 30000, // Keep-alive таймаут
    rejectUnauthorized: false, // Проверка SSL сертификатов
  },

  // 💾 Кеширование (LRU cache)
  cache: {
    enabled: true, // Включить кэш
    ttl: 1000 * 60 * 5, // Время жизни кэша (5 минут)
    maxSize: 500, // Максимальный размер кэша (записей)
  },

  // 🚦 Ограничение скорости (Token Bucket)
  rateLimit: {
    enabled: true, // Включить rate limiting
    maxRequests: 100, // Максимум запросов
    windowMs: 60000, // Окно времени (мс)
  },

  // 📊 Очередь запросов
  queue: {
    enabled: true, // Включить очередь
  },

  // 🔄 Повторные попытки
  retry: {
    maxRetries: 3, // Максимум попыток
    baseDelay: 1000, // Базовая задержка (мс)
    maxDelay: 10000, // Максимальная задержка (мс)
    jitter: true, // Добавить случайность
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
  },

  // 📈 Метрики
  metrics: {
    enabled: true, // Сбор метрик
    maxHistory: 1000, // История метрик
  },

  // 🔍 Логирование
  verbose: true, // Подробные логи
  logger: (level, msg) => console.log(`[${level}] ${msg}`),
});
```

### Пример использования с расширенными возможностями

```typescript
// Использование Fluent RequestBuilder
const result = await client
  .request("https://api.example.com/search")
  .query({ q: "hyperttp", limit: 10 })
  .headers({ Authorization: "Bearer TOKEN" })
  .json()
  .send();

console.log(result);

// Получение статистики клиента
const stats = client.getStats();
console.log({
  cacheSize: stats.cacheSize, // Размер кэша
  inflightRequests: stats.inflightRequests, // Активные запросы
  queuedRequests: stats.queuedRequests, // Запросов в очереди
  activeRequests: stats.activeRequests, // Выполняется сейчас
  currentRateLimit: stats.currentRateLimit, // Использовано лимита
});

// Работа с метриками
const metrics = client.getMetrics("https://api.example.com/data");
console.log(metrics); // Время выполнения, байты, ретраи, cache hits

// Очистка кэша
client.clearCache();

// Очистка метрик
client.clearMetrics();

// Корректное завершение работы
await client.destroy();
```

---

## Fluent API через RequestBuilder

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

---

## Компоненты архитектуры

### 💾 CacheManager

LRU-кэш с поддержкой TTL и метаданных (etag, lastModified):

- Автоматически кэширует GET/HEAD запросы
- Настраиваемый размер и время жизни
- Методы: `get()`, `set()`, `getWithMetadata()`, `setWithMetadata()`

### 📊 QueueManager

Управление очередью запросов:

- Контроль конкурентности (maxConcurrent)
- FIFO обработка ожидующих запросов
- Методы: `enqueue()`, `activeCount`, `queuedCount`

### 🚦 RateLimiter

Token bucket алгоритм с очередью ожидания:

- Плавное ограничение скорости
- FIFO ожидание при превышении лимита
- Методы: `wait()`, `tryConsume()`, `remainingRequests`

### 📈 MetricsManager

Сбор и анализ метрик производительности:

- Время выполнения запросов
- Количество байт отправлено/получено
- Cache hits/misses
- Количество повторных попыток

---

## Документация

- [English](https://github.com/Dirold2/hyperttp/blob/main/README.md)
