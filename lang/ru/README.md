# Hyperttp

**HTTP-клиент с привычным Axios-like API и встроенными политиками выполнения запросов.**

> [English](https://github.com/dirold2/hyperttp) | Русский

[![npm version](https://img.shields.io/npm/v/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![npm downloads](https://img.shields.io/npm/dm/hyperttp)](https://www.npmjs.com/package/hyperttp)
[![license](https://img.shields.io/npm/l/hyperttp)](../../LICENSE)
[![typescript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

Hyperttp сохраняет знакомые методы `get`, `post`, `put`, `patch` и `delete`, но объединяет в одном
клиенте парсинг ответов, кэширование, дедупликацию параллельных запросов, rate limiting, очередь и
перехватчики.

```ts
import { HyperClient } from "hyperttp";

const http = new HyperClient({
  baseURL: "https://api.example.com",
});

const users = await http.get<User[]>("/users");

console.log(users);
```

Shortcut-методы сразу возвращают распарсенные данные. Дополнительный шаг `response.data` не нужен.

## Зачем Hyperttp?

Реальный API-клиент часто быстро становится сложнее обычного `fetch()`:

```text
HTTP-запрос
├── сериализация и парсинг
├── кэширование
├── защита от дублирующихся запросов
├── rate limiting
├── управление параллелизмом
├── отмена и таймауты
└── перехватчики
```

Hyperttp предоставляет эти политики через один расширяемый клиент. Он подходит для SDK, backend-
сервисов, ботов, CLI, API-интеграций и приложений, которым иначе пришлось бы самостоятельно
собирать и поддерживать этот слой.

Hyperttp не лучше любого клиента во всех сценариях. Если нужен только небольшой Fetch wrapper,
лучше могут подойти Ky или ofetch. Для Node-only приложения с HTTP/2 и pagination более
специализирован Got. Объективное сравнение находится в разделе
[Как выбрать клиент](#как-выбрать-клиент).

## Установка

```bash
npm install hyperttp
```

```bash
pnpm add hyperttp
```

```bash
bun add hyperttp
```

```bash
deno add npm:hyperttp
```

## Быстрый старт

### Создайте переиспользуемый клиент

```ts
import { HyperClient } from "hyperttp";

export const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",
});
```

Переиспользуйте клиент в приложении: так transport, connection pool, кэш и состояние плагинов не
создаются заново для каждого запроса.

```ts
interface User {
  id: string;
  name: string;
  active: boolean;
}

const users = await api.get<User[]>("users");
const user = await api.get<User>("users/42");
```

### Отправка данных

```ts
const created = await api.post<User>("users", {
  name: "Alice",
  active: true,
});

await api.put("users/42", {
  name: "Alice Cooper",
});

await api.patch("users/42", {
  active: false,
});

await api.delete("users/42");
```

Объекты и массивы сериализуются в JSON встроенным serializer-плагином.

## Опции запроса

### Query-параметры

В Hyperttp используется `query`, тогда как в Axios аналогичная опция называется `params`:

```ts
const users = await api.get<User[]>("users", {
  query: {
    page: 1,
    limit: 20,
    active: true,
    role: ["admin", "editor"],
  },
});
```

Массивы превращаются в повторяющиеся query-параметры. Fluent builder пропускает значения `null` и
`undefined`.

### Заголовки

```ts
const profile = await api.get<User>("profile", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-Request-ID": requestId,
  },
});
```

Сейчас у Hyperttp нет глобальной опции `headers` в конфигурации клиента. Для общих заголовков
используйте опции запроса или request interceptor.

### Таймаут и отмена

```ts
const controller = new AbortController();

const request = api.get("reports/large", {
  timeout: 10_000,
  signal: controller.signal,
});

controller.abort();

await request;
```

Таймаут, отмена и ошибки транспорта отклоняют Promise. HTTP-коды ошибок обрабатываются иначе — это
описано в разделе [Ответы и HTTP-ошибки](#ответы-и-http-ошибки).

### Явный формат ответа

```ts
const text = await api.get<string>("health", "text");

const document = await api.get("document.xml", {
  responseType: "xml",
});
```

Поддерживаются `json`, `text`, `xml`, `html`, `buffer` и `stream`.

## Как работает `baseURL`

Hyperttp объединяет URL по стандартным правилам `URL`:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",
});

await api.get("users"); // https://api.example.com/v1/users
await api.get("/users"); // https://api.example.com/users
```

Начальный `/` строит путь от корня origin. Не добавляйте его, если путь должен остаться внутри
pathname из `baseURL`.

`baseURL` применяется к shortcut-методам, `head()`, `stream()` и `RequestBuilder`. Напрямую
делегируемый namespace `client.rest` пока ожидает абсолютный URL.

## Fluent API

Для простых запросов используйте shortcuts, а для длинной читаемой цепочки — `RequestBuilder`:

```ts
const user = await api
  .request("users")
  .post()
  .headers({
    "X-Request-ID": requestId,
  })
  .query({ notify: true })
  .jsonBody({
    name: "Alice",
    active: true,
  })
  .json()
  .send<User>();
```

Доступные методы builder:

- HTTP-метод: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `method`
- Данные запроса: `headers`, `query`, `body`, `jsonBody`
- Управление: `timeout`, `signal`
- Формат ответа: `json`, `text`, `xml`, `html`, `buffer`, `stream`
- Утилиты: `clone`, `send`

Для потоковой загрузки используйте `client.stream()`, а не только response hint builder.

## Ответы и HTTP-ошибки

### Shortcut-методы возвращают данные

```ts
const users = await api.get<User[]>("users");
```

Результат уже содержит распарсенные данные. Status, headers и другие поля response envelope
намеренно не включаются в shortcut-результат.

### Полный ответ

Если нужны status и headers, используйте REST namespace:

```ts
const response = await api.rest.get<User[]>("https://api.example.com/v1/users");

console.log(response.ok);
console.log(response.status);
console.log(response.headers);
console.log(response.data);
```

Полный ответ содержит `protocol`, `ok`, `status`, `statusText`, `headers`, `url`, `data`, а также
опциональные metadata/raw поля.

### HTTP-статусы по умолчанию не бросают исключение

Ответы `4xx` и `5xx` разрешаются обычным образом. Shortcut вернёт распарсенное тело ошибки, а в
полном ответе можно проверить `response.ok` или `response.status`:

```ts
const response = await api.rest.get<ErrorPayload>("https://api.example.com/v1/users/missing");

if (!response.ok) {
  console.error(response.status, response.data);
}
```

Это отличается от стандартного поведения Axios, Ky, Got и ofetch, которые обычно отклоняют
неуспешные HTTP-ответы.

## Встроенные политики запросов

Встроенный набор плагинов регистрируется автоматически. Политики, требующие явного решения —
например rate limiting и очередь — можно включить в конфигурации:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com/v1/",

  cache: {
    enabled: true,
    ttl: 60_000,
    maxSize: 1_000,
  },

  inflight: {
    enabled: true,
  },

  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60_000,
  },

  queue: {
    enabled: true,
    maxConcurrent: 20,
  },
});
```

| Политика                | Назначение                                                    |
| ----------------------- | ------------------------------------------------------------- |
| Cache                   | Повторное использование успешных GET/HEAD ответов             |
| In-flight deduplication | Объединение совместимых параллельных GET-запросов             |
| Rate limiter            | Контроль частоты запросов и реакция на ограничения сервера    |
| Queue                   | Ограничение параллельной работы для каждой partition          |
| Serializer              | Кодирование object/array request body                         |
| Parser                  | Преобразование JSON, text, HTML, XML, buffer и пустых ответов |
| Interceptors            | Преобразование запросов и ответов                             |

Чтобы собрать собственный pipeline, отключите встроенный preset:

```ts
const client = new HyperClient({
  builtInPlugins: false,
  plugins: [myPlugin],
});
```

REST-протокол и плагины, явно переданные через `plugins` или `client.use()`, останутся доступны.

> Retry options присутствуют в текущих типах, но выполнение повторов пока не документируется как
> стабильная возможность ветки `0.5.x`. Поэтому retries не считаются активной возможностью в
> сравнении ниже.

## Потоковые ответы

`stream()` возвращает полный response envelope, а `data` является асинхронно итерируемым потоком
байтов:

```ts
const response = await api.stream("events");
const decoder = new TextDecoder();

for await (const chunk of response.data) {
  console.log(decoder.decode(chunk, { stream: true }));
}
```

Конкретная реализация потока зависит от активного runtime transport.

## TypeScript

Основные request, response, client и transport типы экспортируются из корня пакета:

```ts
import {
  HyperClient,
  type HyperClientOptions,
  type RestRequestOptions,
  type UniversalResponse,
} from "hyperttp";

interface User {
  id: string;
  name: string;
}

const options: RestRequestOptions = {
  query: { active: true },
  timeout: 5_000,
};

const users = await new HyperClient({
  baseURL: "https://api.example.com",
}).get<User[]>("/users", options);
```

Generics описывают ожидаемый тип ответа, но не валидируют недоверенные данные сервера во время
выполнения.

## Жизненный цикл

Клиент может владеть connection pool и другими ресурсами транспорта. Закрывайте долгоживущий клиент
при остановке приложения, а не после каждого запроса:

```ts
const api = new HyperClient({
  baseURL: "https://api.example.com",
});

try {
  await runApplication(api);
} finally {
  await api.destroy(true);
}
```

Передайте `true` для graceful shutdown или `false` для немедленного освобождения ресурсов.

## Переход с Axios

Стиль запросов намеренно знаком, но Hyperttp не является drop-in заменой Axios.

| Axios                           | Hyperttp                                             |
| ------------------------------- | ---------------------------------------------------- |
| `axios.create({ baseURL })`     | `new HyperClient({ baseURL })`                       |
| `axios.get(url, { params })`    | `client.get(url, { query })`                         |
| `axios.post(url, data, config)` | `client.post(url, body, options)`                    |
| `response.data`                 | Shortcut сразу возвращает данные                     |
| `response.status`               | Абсолютный URL и `client.rest.*`                     |
| `signal`                        | `signal` в options или отдельный positional аргумент |
| Request/response interceptors   | Встроенный interceptor plugin или custom plugin      |
| Default headers экземпляра      | Опции запроса или interceptor                        |

Экспорты `Request` и `PreparedRequest` сохранены для совместимости, но deprecated. В новом коде
используйте `client.request()` и `RequestBuilder`.

## Как выбрать клиент

Эта таблица не объявляет универсального победителя. Она показывает сценарии, для которых каждый
клиент естественно подходит, опираясь на его документированные встроенные возможности.

| Возможность                  | Fetch             | Axios                     | Ky                       | ofetch                     | Got                         | Hyperttp                   |
| ---------------------------- | ----------------- | ------------------------- | ------------------------ | -------------------------- | --------------------------- | -------------------------- |
| Основные runtime             | Встроен в runtime | Browser, Node             | Browser, Node, Bun, Deno | Node, browser, workers     | Node                        | Node и Fetch-based runtime |
| Shortcut с готовыми данными  | Нет               | Через `response.data`     | Через `.json()`          | Да                         | JSON mode                   | Да                         |
| Полный response              | Да                | Да                        | Да                       | Да (`.raw`)                | Да                          | Да (`client.rest`)         |
| Автоматические retries       | Нет               | Нет встроенных            | Да                       | Да                         | Да                          | Пока не stable             |
| Application response cache   | Нет               | Нет встроенного           | Нет встроенного          | Нет встроенного            | Да                          | Да                         |
| In-flight deduplication      | Нет               | Нет встроенной            | Нет встроенной           | Нет встроенной             | Нет встроенной              | Да                         |
| Встроенный rate limiting     | Нет               | Нет                       | Нет                      | Нет                        | Нет                         | Да                         |
| Встроенная concurrency queue | Нет               | Нет                       | Нет                      | Нет                        | Нет                         | Да                         |
| Interceptors или hooks       | Нет               | Interceptors              | Hooks                    | Interceptors               | Hooks                       | Interceptors и plugins     |
| Сильная сторона              | Без зависимости   | Экосистема и знакомый API | Небольшой Fetch wrapper  | Universal Fetch experience | Streams, HTTP/2, pagination | Общий pipeline политик     |

### Выбирайте Fetch, если

- зависимость не нужна;
- достаточно API платформы;
- вы готовы самостоятельно собрать дополнительные политики.

### Выбирайте Axios, если

- команда уже знает его API;
- зрелая экосистема важнее встроенных operational policies;
- основные цели — browser и Node.

### Выбирайте Ky, если

- нужен небольшой современный Fetch wrapper;
- достаточно retries и lifecycle hooks;
- желательно сохранить Fetch-compatible response model.

### Выбирайте ofetch, если

- нужны автоматический parsing и retries с универсальным Fetch-oriented API;
- важны Node, browser и workers;
- cache, deduplication, rate limiting и queue не обязаны жить внутри клиента.

### Выбирайте Got, если

- приложение работает только в Node;
- важны продвинутые streams, HTTP/2, pagination, timings и RFC caching.

### Выбирайте Hyperttp, если

- нужны Axios-like методы, сразу возвращающие распарсенные данные;
- cache, deduplication, rate limiting и concurrency control должны работать в одном pipeline;
- клиент используется в SDK, сервисе, боте, CLI, scraper или API-интеграции с operational limits;
- один расширяемый клиент удобнее нескольких независимых wrappers.

Источники сравнения: [Axios](https://github.com/axios/axios),
[Ky](https://github.com/sindresorhus/ky), [ofetch](https://github.com/unjs/ofetch) и
[Got](https://github.com/sindresorhus/got). Возможности и поддерживаемые runtime меняются между
релизами — перепроверяйте критичные для приложения требования.

Ky, Axios, ofetch и Got используются только для сравнения и не являются зависимостями Hyperttp.

## Транспорты выполнения

- В Node.js автоматически выбирается включённый `@hyperttp/transport-undici`.
- Другие runtime могут использовать Fetch fallback при наличии `globalThis.fetch`.
- Опциональные Bun- и Deno-specific transport packages можно установить отдельно.
- Custom transport можно передать вторым аргументом конструктора или через `customTransport`.

Узнать выбранный транспорт можно через `await client.getTransportName()`.

Код содержит пути выполнения для Node.js, Bun, Deno и browser. Текущий test suite проверяет Node.js;
остальные runtime следует отдельно проверять в целевом окружении.

## Экосистема

Hyperttp состоит из сфокусированных пакетов:

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

## Лицензия

MIT
