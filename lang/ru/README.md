# Hyperttp ⚡

**HTTP без бойлерплейта.**

> [English](https://github.com/dirold2/hyperttp) | Русский

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](./LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

HTTP-клиент для **Node.js**, **Bun**, **Deno** и **браузера**,
который предоставляет повторные запросы, кэширование,
ограничение частоты запросов, метрики, парсинг, сериализацию и интерцепторы **из коробки**.

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Автоматически парсит ответ на основе второго аргумента
const user = await client.get("https://api.example.com/users/1", "json");

console.log(user);
```

Никакой ручной настройки.
Никакого лишнего кода.
Просто делайте запросы.

---

## Что такое Hyperttp?

Большинство HTTP-клиентов решают одну задачу:

> «Отправить HTTP-запрос».

Но реальным приложениям нужно гораздо больше:

- повторные запросы (retries)
- ограничение частоты запросов (rate limiting)
- кэширование
- дедупликация запросов
- парсинг
- сериализация
- метрики
- интерцепторы
- очереди запросов
- таймауты

С большинством библиотек это превращается в установку множества дополнительных пакетов и написание собственных обёрток.

Hyperttp предоставляет все эти возможности через один клиент.

---

## Почему Hyperttp?

Вместо создания собственного сетевого слоя:

```text
fetch
 ├── retry
 ├── cache
 ├── parser
 ├── metrics
 ├── serializer
 ├── queue
 ├── timeout
 └── custom wrappers

```

Hyperttp предоставляет готовую к использованию инфраструктуру:

```text
Hyperttp
 ├── Retry
 ├── Cache
 ├── Metrics
 ├── Parser
 ├── Serializer
 ├── Queue
 ├── Interceptors
 ├── Timeout
 └── Rate Limiter

```

Создайте клиент.

Начните делать запросы.

---

## Быстрый старт

### 1. Установка ядра

```bash
# Node.js
npm install hyperttp
pnpm add hyperttp

# Bun
bun add hyperttp

# Deno
deno add npm:hyperttp

```

### 2. Базовое использование

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient({
  baseURL: "https://api.example.com",
});

await client.get("/users", "json");
await client.post("/users", { name: "John" }, "json");
await client.put("/users/1", { name: "Alice" }, "json");
await client.delete("/users/1");
```

---

## Hyperttp в сравнении с другими HTTP-клиентами

| Возможность                        | fetch | Axios  | Ky       | Hyperttp |
| ---------------------------------- | ----- | ------ | -------- | -------- |
| Promise API                        | ✅    | ✅     | ✅       | ✅       |
| Повторные запросы (Retry)          | ❌    | Плагин | ✅       | ✅       |
| Кэш (Cache)                        | ❌    | ❌     | ❌       | ✅       |
| Метрики (Metrics)                  | ❌    | ❌     | ❌       | ✅       |
| Ограничение частоты (Rate Limiter) | ❌    | ❌     | ❌       | ✅       |
| Очередь (Queue)                    | ❌    | ❌     | ❌       | ✅       |
| Парсер (Parser)                    | ❌    | ❌     | Частично | ✅       |
| Сериализатор (Serializer)          | ❌    | ❌     | ❌       | ✅       |
| Интерцепторы (Interceptors)        | ❌    | ✅     | Hooks    | ✅       |
| Автоопределение транспорта         | ❌    | ❌     | ❌       | ✅       |

---

## Для кого создан Hyperttp?

Идеально подходит для:

- REST API и SDK
- CLI-приложений и Discord-ботов
- Бэкенда и Serverless-сервисов
- Веб-скрейпинга (парсинга сайтов)
- Корпоративных приложений (Enterprise)

---

## Расширенная конфигурация

```ts
const client = new HyperClient({
  baseURL: "https://api.example.com",

  retry: {
    retries: 3,
  },

  cache: {
    ttl: 60_000,
  },

  timeout: 30_000,
});
```

---

## Архитектура

```text
Приложение
     │
     ▼
 HyperClient
     │
 Конвейер плагинов (Plugin Pipeline)
     │
 Транспорт (Автоопределение)
     │
    HTTP

```

Все компоненты независимы и заменяемы.

---

## Транспорты для сред выполнения

Hyperttp работает **из коробки** в любой среде, используя стандартный `globalThis.fetch`.

Для максимальной производительности и
поддержки нативных возможностей вы можете опционально установить
оптимизированный пакет транспорта под конкретную среду выполнения:

| Среда   | Пакет                        | Описание                                                   |
| ------- | ---------------------------- | ---------------------------------------------------------- |
| Node.js | `@hyperttp/transport-undici` | Использует высокопроизводительный нативный клиент `undici` |
| Bun     | `@hyperttp/transport-bun`    | Использует оптимизации нативного `Bun.fetch`               |
| Deno    | `@hyperttp/transport-deno`   | Оптимизирован под нативный сетевой слой Deno               |

После установки дополнительная конфигурация не требуется:

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();
// Автоматически обнаруживает и использует UndiciTransport в Node.js, BunTransport в Bun и т. д.
```

---

## Экосистема

- hyperttp
- @hyperttp/core
- @hyperttp/types
- @hyperttp/parser
- @hyperttp/cache
- @hyperttp/retry
- @hyperttp/metrics
- @hyperttp/serializer
- @hyperttp/transport-undici
- @hyperttp/transport-bun
- @hyperttp/transport-deno

---

## Производительность

Hyperttp спроектирован с использованием конвейеров промежуточного ПО с нулевым выделением памяти (zero-allocation) и
минимальными накладными расходами.
Благодаря нативным транспортам для сред выполнения он достигает скорости,
близкой к «чистому» fetch, предоставляя при этом полный набор функций.

Подробные бенчмарки, сравнивающие потребление памяти и время выполнения запросов в разных средах выполнения,
доступны в репозитории [IT-IF-OR/bench](https://github.com/IT-IF-OR/bench).

---

## Лицензия

MIT
