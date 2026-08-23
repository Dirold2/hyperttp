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

// Явно разбирает JSON независимо от заголовка Content-Type
const user = await client.request("https://api.example.com/users/1").json().send();

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

await client.get("/users"); // Парсинг на основе Content-Type
await client.request("/users").json().send();
await client.request("/users").post().jsonBody({ name: "John" }).json().send();
await client.request("/users/1").put().jsonBody({ name: "Alice" }).json().send();
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
    maxRetries: 3,
  },

  cache: {
    ttl: 60_000,
  },

  timeout: 30_000,
});
```

### Встроенные плагины

`HyperClient` автоматически регистрирует интерцепторы, сериализацию, метрики, дедупликацию запросов,
кэширование, ограничение частоты запросов, очередь и парсинг ответов.

Отключить только автоматический парсинг ответов:

```ts
const client = new HyperClient({
  responseConverter: false,
});
```

Отключить весь набор встроенных плагинов для минимального конвейера:

```ts
const client = new HyperClient({
  builtInPlugins: false,
});
```

REST-протокол остаётся доступным. Плагины из `plugins` и зарегистрированные через `client.use()`
продолжают работать. При `builtInPlugins: false` параметр `responseConverter` не влияет на поведение,
поскольку встроенный парсер не регистрируется.

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

В Node.js Hyperttp автоматически использует `@hyperttp/transport-undici`. Транспорт входит в пакет
`hyperttp`, поэтому отдельная установка и настройка клиента не требуются:

```ts
import { HyperClient } from "hyperttp";

const client = new HyperClient();
// В Node.js используется UndiciTransport.
```

В других средах доступен резервный транспорт на основе стандартного `globalThis.fetch`.
Специализированные транспортные пакеты можно установить отдельно, когда они доступны:

| Среда   | Пакет                        | Доступность                               |
| ------- | ---------------------------- | ----------------------------------------- |
| Node.js | `@hyperttp/transport-undici` | Включён и выбирается автоматически        |
| Bun     | `@hyperttp/transport-bun`    | Опциональный специализированный транспорт |
| Deno    | `@hyperttp/transport-deno`   | Опциональный специализированный транспорт |

---

## Экосистема

- `@hyperttp/core`
- `@hyperttp/types`
- `@hyperttp/interceptors`
- `@hyperttp/serializer`
- `@hyperttp/metrics`
- `@hyperttp/inflight`
- `@hyperttp/cache`
- `@hyperttp/ratelimit`
- `@hyperttp/queue`
- `@hyperttp/parser`
- `@hyperttp/transport-undici`

---

## Производительность

Результаты сравнивают полные клиентские стеки в одном локальном окружении и не гарантируют такую же производительность в production. Перед выбором клиента запустите бенчмарк со своей нагрузкой, параллелизмом, размером данных и сетевыми условиями. Исходники доступны в репозитории [IT-IF-OR/bench](https://github.com/IT-IF-OR/bench).

---

## Лицензия

MIT © dirold2
