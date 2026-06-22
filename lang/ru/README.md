# Hyperttp ⚡

> [English](https://github.com/Dirold2/hyperttp) | Русский

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## 🌐 Язык

- 🇺🇸 [English](https://github.com/Dirold2/hyperttp)
- 🇷🇺 Русский

---

## 🔗 Быстрые ссылки

- 🏢 **Организация:** [github.com/IT-IF-OR](https://github.com/IT-IF-OR)
- 👤 **Автор:** [github.com/dirold2](https://github.com/dirold2)
- 📦 **npm:** [npmjs.com/org/hyperttp](https://www.npmjs.com/org/hyperttp)
- ⚙️ **Ядро:** [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core)

---

**Hyperttp** — это высокопроизводительный HTTP-клиент с полным набором функций для сред Node.js, Bun, Deno и браузеров.
Это функционально богатое, готовое к production расширение оптимизированного движка [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core),
включающее кэширование, ограничение скорости, очереди запросов, дедупликацию inflight-запросов, метрики производительности и fluent-цепочечный API — всё уже подключено и готово к использованию.

---

## 🔥 Ключевые возможности

- **🎯 Умный парсинг ответов:** Автоматический парсинг ответов на основе `responseType` (`json`, `text`, `xml`, `html`, `buffer`, `blob`, `stream`).
- **🔀 Управление параллелизмом:** Встроенный плагин очереди (`withQueue`) для строгого соблюдения лимитов одновременных запросов.
- **💾 Умное LRU-кэширование:** Выделенный слой кэширования (`withCache`) с поддержкой TTL для предотвращения избыточных сетевых обращений.
- **🚦 Ограничение скорости:** Встроенный алгоритм Token Bucket для защиты от блокировок внешних API и rate limit'ов.
- **🛡️ Дедупликация inflight-запросов:** Предотвращает дублирование одновременных запросов к одному эндпоинту, если первый ещё выполняется.
- **📈 Метрики в реальном времени:** Телеметрия "из коробки" для отслеживания задержек, RPS, попаданий в кэш и общего состояния клиента.
- **🔌 Модульная архитектура:** Чистый подход на основе конвейеров, позволяющий использовать пользовательские плагины, слои сериализации и перехватчики.
- **💎 Fluent Request Builder API:** Чистый цепочечный синтаксис API для лёгкого составления и конфигурирования запросов.
- **🗜️ Прозрачная декомпрессия:** Автоматическая обработка `gzip`, `deflate` и `br` (Brotli) из коробки.

---

## 📦 Пакеты экосистемы

| Пакет                                                                                    | Описание                                      | Репозиторий                                                     |
| ---------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| **`hyperttp`** (вы здесь)                                                                | Высокоуровневый клиент со всеми плагинами     | [GitHub](https://github.com/dirold2/hyperttp)                   |
| [`@hyperttp/core`](https://www.npmjs.com/package/@hyperttp/core)                         | Низкоуровневое ядро с транспортным конвейером | [GitHub](https://github.com/IT-IF-OR/hyperttp-core)             |
| [`@hyperttp/types`](https://www.npmjs.com/package/@hyperttp/types)                       | Общие TypeScript-определения типов            | [GitHub](https://github.com/dirold2/hyperttp-types)             |
| [`@hyperttp/transport-bun`](https://www.npmjs.com/package/@hyperttp/transport-bun)       | Нативный транспорт для Bun                    | [GitHub](https://github.com/IT-IF-OR/hyperttp-transport-bun)    |
| [`@hyperttp/transport-undici`](https://www.npmjs.com/package/@hyperttp/transport-undici) | Транспорт Undici для Node.js                  | [GitHub](https://github.com/IT-IF-OR/hyperttp-transport-undici) |
| [`@hyperttp/parser`](https://www.npmjs.com/package/@hyperttp/parser)                     | Парсер тела ответа (JSON/XML/HTML)            | [GitHub](https://github.com/IT-IF-OR/hyperttp-parser)           |
| [`@hyperttp/serializer`](https://www.npmjs.com/package/@hyperttp/serializer)             | Сериализатор тела запроса                     | [GitHub](https://github.com/IT-IF-OR/hyperttp-serializer)       |
| [`@hyperttp/cache`](https://www.npmjs.com/package/@hyperttp/cache)                       | Кэширование HTTP-ответов                      | [GitHub](https://github.com/IT-IF-OR/hyperttp-cache)            |
| [`@hyperttp/queue`](https://www.npmjs.com/package/@hyperttp/queue)                       | Очереди запросов                              | [GitHub](https://github.com/IT-IF-OR/hyperttp-queue)            |
| [`@hyperttp/ratelimit`](https://www.npmjs.com/package/@hyperttp/ratelimit)               | Ограничение скорости                          | [GitHub](https://github.com/IT-IF-OR/hyperttp-ratelimit)        |
| [`@hyperttp/inflight`](https://www.npmjs.com/package/@hyperttp/inflight)                 | Дедупликация inflight-запросов                | [GitHub](https://github.com/IT-IF-OR/hyperttp-inflight)         |
| [`@hyperttp/interceptors`](https://www.npmjs.com/package/@hyperttp/interceptors)         | Перехватчики запросов/ответов                 | [GitHub](https://github.com/IT-IF-OR/hyperttp-interceptors)     |
| [`@hyperttp/metrics`](https://www.npmjs.com/package/@hyperttp/metrics)                   | Метрики производительности                    | [GitHub](https://github.com/IT-IF-OR/hyperttp-metrics)          |

### Какой пакет выбрать?

- **Нужны просто HTTP-запросы с кэшем, retry и парсингом?** → Используйте `hyperttp` (этот пакет)
- **Нужен полный контроль над конвейером?** → Используйте `@hyperttp/core`
- **Создаёте собственный транспорт или плагин?** → Используйте `@hyperttp/types`

---

## 🚀 Установка

```bash
npm install hyperttp

# Опционально: установите конкретный транспорт
npm install @hyperttp/transport-bun    # для Bun
npm install @hyperttp/transport-undici # для Node.js
```

---

## 📦 Быстрый старт

Просто импортируйте `HyperClient` и начните отправлять запросы. Основные функции, такие как кэширование, управление очередью
и ограничение скорости, мгновенно предварительно настроены и активны из коробки.

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Простой GET-запрос (мгновенно возвращает предварительно распарсенное типобезопасное тело)
const data = await client.get<MyDataType>("https://api.example.com/data");

// POST-запрос с указанием ожидаемого типа ответа и полезной нагрузкой
const newItem = await client.post<Item>("https://api.example.com/items", "json", {
  name: "New Item Structure",
});

// Явное указание типа ответа
const html = await client.get<string>("https://example.com", "text");
const xml = await client.get<XmlDoc>("https://api.example.com/feed.xml", "xml");

// Потоковые ответы (например, LLM completions)
const chatStream = await client.stream("https://api.openai.com/v1/chat/completions");
const reader = chatStream.body.getReader();
```

---

## 💎 Fluent Builder API

Используйте цепочку `.request(url)` для программного создания высоко специфичных структур запросов на лету:

```typescript
const user = await client
  .request("https://api.example.com/users")
  .post() // Указывает HTTP-метод (по умолчанию GET)
  .query({ include: "profile" }) // Безопасно добавляет и кодирует query-параметры
  .headers({ "X-Request-ID": crypto.randomUUID() })
  .jsonBody({ name: "John", email: "john@example.com" }) // Автоматически сериализует и устанавливает Content-Type
  .json<User>() // Указывает ожидаемый формат ответа (.text(), .buffer(), .stream())
  .timeout(5000) // Создаёт контекстный AbortSignal с таймаутом для запроса
  .send();
```

---

## ⚙️ Расширенная конфигурация

Тонкая настройка каждого инфраструктурного слоя через передачу объекта конфигурации непосредственно в конструктор `HyperClient`:

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient({
  // 🌐 Настройки сетевого уровня (NetworkOptions)
  network: {
    timeout: 10000, // Таймаут запроса в миллисекундах
    maxConcurrent: 50, // Максимум одновременных активных сокетов (0 = без лимита)
    pipelining: 1, // Лимит pipelined-запросов на соединение
    keepAliveTimeout: 30000, // Время сохранения keep-alive сокета в мс
    rejectUnauthorized: true, // Отклонять ненадёжные или самоподписанные SSL-сертификаты
    followRedirects: true, // Автоматически следовать HTTP-редиректам
    maxRedirects: 5, // Максимальный лимит следования редиректам
    maxResponseBytes: 10 * 1024 * 1024, // Предотвращает OOM, ограничивая размер тела ответа (10 МБ)
    userAgent: "HyperClient/2.0", // Глобальный User-Agent по умолчанию
    headers: {
      // Базовые заголовки по умолчанию, добавляемые к каждому запросу
      "X-App-Client": "Backend",
    },
    validateStatus: (status) => status >= 200 && status < 300, // Правила валидации статуса успеха
  },

  // 🔄 Автоматическая логика повторных попыток (RetryOptions)
  retry: {
    maxRetries: 3, // Количество попыток восстановления перед провалом
    baseDelay: 1000, // Базовая задержка между повторами (мс)
    maxDelay: 10000, // Максимальная верхняя граница задержки между повторами (мс)
    retryStatusCodes: [408, 429, 502, 503, 504], // Коды статуса, которые вызывают повтор
    jitter: true, // Рандомизированные вариации задержки для избежания thundering herd
  },

  // 📈 Телеметрия и логирование движка
  trackMetrics: true, // Включает глобальный сбор производительности
  verbose: false, // Переключает вывод внутренних микро-логов
  logger: (level, message, meta) => {
    // Пользовательская реализация логирования
    console.log(`[${level}] ${message}`, meta ?? "");
  },

  // 💾 Расширенные конфигурации плагинов (через HyperttpPluginsExtension)
  cache: {
    enabled: true,
    ttl: 300000, // Время жизни кэша 5 минут
    maxSize: 500, // Максимальный лимит элементов в локальном LRU-хранилище
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

## 🔌 Предварительно подключённые плагины

При использовании `HyperClient` автоматически регистрируются следующие плагины:

| Плагин             | Назначение                                                  |
| ------------------ | ----------------------------------------------------------- |
| `withParser`       | Парсит тела ответов на основе `responseType`                |
| `withQueue`        | Ставит запросы в очередь при достижении лимита параллелизма |
| `withRateLimit`    | Обеспечивает соблюдение rate limit'ов                       |
| `withInflight`     | Дедуплицирует inflight-запросы                              |
| `withCache`        | Кэширует ответы на основе HTTP-заголовков                   |
| `withInterceptors` | Перехватчики запросов/ответов                               |
| `withMetrics`      | Собирает метрики производительности                         |

### Пользовательские плагины

Расширьте клиент собственными хуками:

```typescript
client.use({
  name: "performance-logger",
  priority: 100, // Приоритет выполнения (выше = раньше)
  mode: "background", // Заставляет onResponse выполняться как неблокирующий побочный эффект

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
    // Верните объект response здесь, чтобы обойти/восстановиться после ошибки
  },
});
```

### Фазы плагинов

| Фаза        | Хук              | Описание                                                     |
| ----------- | ---------------- | ------------------------------------------------------------ |
| **REQUEST** | `onRequest`      | Перехватывает перед выполнением. Поддерживает short-circuit. |
| **DATA**    | `onResponseData` | Трансформирует сырые ответы транспорта перед маппингом.      |
| **FORMAT**  | `onResponse`     | Модифицирует ответы на стороне клиента.                      |
| **ERROR**   | `onError`        | Перехватывает и восстанавливает после ошибок.                |

---

## 🏗️ Архитектура конвейера

`HyperClient` структурирует исходящие и входящие запросы через последовательный конвейер, состоящий из гранулярных плагинов:

```
┌─────────────────────────────────────────────────────────────────┐
│                        HyperClient                              │
│   (Авто-подключение: Parser → Queue → RateLimit →              │
│    Inflight → Cache → Interceptors → Metrics)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         HyperCore                               │
│                                                                 │
│  1. Конвейер запросов (onRequest) ─── поддержка short-circuit  │
│                     │                                           │
│  2. Выполнение транспорта (HyperTransport)                      │
│     ├─ BunTransport (нативный Bun fetch)                        │
│     ├─ UndiciTransport (Node.js)                                │
│     └─ NodeTransport (глобальный fetch)                         │
│                     │                                           │
│  3. Конвейер данных ответа (onResponseData)                     │
│                     │                                           │
│  4. Внутренняя обработка (декомпрессия, маппинг)                │
│                     │                                           │
│  5. Конвейер ответа (onResponse)                                │
│     ├─ Мутаторы (синхронная/асинхронная модификация)            │
│     └─ Побочные эффекты (фоновые, неблокирующие)                │
│                     │                                           │
│  6. Конвейер ошибок (onError) ─── поддержка восстановления     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Расширенные возможности

### Движок статистики, кэша и метрик

```typescript
// Инспектируем внутренности конвейера (активные соединения, очередь)
const stats = client.getStats();
console.log(stats);

// Получаем агрегированные исторические метрики задержек и производительности
const allMetrics = client.getAllMetrics();
console.log(allMetrics);

// Программно очищаем весь локальный кэш ответов
await client.clearCache();

// Определяем текущий активный транспорт
const transportName = await client.getTransportName();
console.log(`Текущий активный транспорт: ${transportName}`);

// Корректно завершаем работу клиента, освобождая keep-alive пулы и сокеты
await client.destroy();
```

### Обработчики потоков

```typescript
// Возвращает HttpResponse с пользовательским ReadableStream и поддержкой clone()
const streamResponse = await client.stream("https://stream.example.com/audio.mp3");
const reader = streamResponse.body.getReader();
```

### Расширение конфигурации

Создавайте производные клиенты с объединённой конфигурацией:

```typescript
const authenticatedClient = client.extend({
  network: { headers: { Authorization: "Bearer token_abc" } },
});
```

---

## 🔄 Миграция с axios

Если вы мигрируете с axios, Hyperttp предоставляет знакомый API:

```typescript
// axios
import axios from "axios";
const { data } = await axios.get("/users/123");

// hyperttp (прямая замена)
import { HyperClient } from "hyperttp";
const client = new HyperClient();
const data = await client.get("/users/123");
```

---

## 📊 Бенчмарки

Подробные бенчмарки для сред Bun и Node.js с различными транспортами смотрите в [`@hyperttp/core` benchmarks](https://github.com/IT-IF-OR/hyperttp-core#-benchmarks).

**Ключевые выводы:**

- **Bun + BunTransport**: ~15.22K RPS со всеми подключёнными плагинами
- **Node.js + UndiciTransport**: ~10.82K RPS со всеми подключёнными плагинами
- **Overhead от плагинов**: всего ~9-14% по сравнению с голым `@hyperttp/core`
- **Нулевой уровень ошибок**: 0% ошибок во всех сценариях бенчмарков

---

## 📄 Лицензия

MIT

---

<p align="center">
   <a href="https://github.com/dirold2">dirold2</a>
</p>
