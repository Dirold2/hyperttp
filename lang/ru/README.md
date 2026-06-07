# Hyperttp ⚡

[Русский](https://github.com/Dirold2/hyperttp/tree/main/lang/ru) • [English](https://github.com/Dirold2/hyperttp)

Продвинутый HTTP-клиент для Node.js и Bun с поддержкой кэширования, ограничения частоты запросов (rate limiting),
очередей, предотвращения дублирования запросов (inflight), сбора метрик и удобным цепочечным Fluent API.
Построен как многофункциональная надстройка над оптимизированным ядром `@hyperttp/core`.

## 🔥 Ключевые особенности

- **🔀 Управление параллелизмом:** Встроенный плагин очередей (`withQueue`) для контроля над лимитами одновременных запросов.
- **💾 Умное LRU-кэширование:** Плагин `withCache` с поддержкой TTL для предотвращения избыточного сетевого трафика.
- **🚦 Ограничение частоты (Rate Limiting):** Защита от блокировок со стороны внешних API с помощью алгоритма Token Bucket.
- **🛡️ Предотвращение дублирования (Inflight):** Защита от создания повторных идентичных запросов, если первый еще выполняется.
- **📈 Сбор метрик производительности:** Мониторинг задержек, RPS и общего состояния работы клиента из коробки.
- **🔌 Модульная архитектура:** Возможность гибкой кастомизации за счет предустановленных плагинов и перехватчиков.
- **💎 Удобный Fluent Request Builder API:** Цепочечная сборка конфигурации любой сложности.

---

## 🚀 Установка

```bash
npm install hyperttp

```

---

## 📦 Быстрый старт

Просто импортируйте `HyperClient` и выполняйте запросы. Все ключевые плагины (кэширование, очереди, лимитеры)
активируются автоматически при инициализации.

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient();

// Простой GET-запрос (автоматически возвращает сразу распарсенное тело ответа)
const data = await client.get<MyDataType>("https://api.example.com/data");

// POST-запрос с указанием ожидаемого типа ответа и телом запроса
const newItem = await client.post("https://api.example.com/items", "json", {
  name: "Новый элемент",
});
```

---

## ⚙️ Расширенная конфигурация

Вы можете тонко настроить каждый компонент системы, передав параметры в конструктор `HyperClient`:

```typescript
import { HyperClient } from "hyperttp";

const client = new HyperClient({
  // 🌐 Сетевые настройки (NetworkOptions)
  network: {
    timeout: 10000, // Таймаут запроса в мс
    maxConcurrent: 50, // Лимит одновременных запросов (0 — без лимита)
    pipelining: 1, // Количество pipelined-запросов на одно соединение
    keepAliveTimeout: 30000, // Таймаут keep-alive для сокетов в мс
    rejectUnauthorized: true, // Отклонять недоверенные SSL-сертификаты
    followRedirects: true, // Автоматически следовать редиректам
    maxRedirects: 5, // Максимальное количество редиректов
    maxResponseBytes: 10 * 1024 * 1024, // Максимальный размер тела ответа (10 МБ)
    userAgent: "HyperClient/2.0", // Заголовок User-Agent по умолчанию
    headers: {
      // Базовые заголовки для всех запросов
      "X-App-Client": "Backend",
    },
    validateStatus: (status) => status >= 200 && status < 300, // Валидация HTTP-статусов
  },

  // 🔄 Логика автоматических повторов (RetryOptions)
  retry: {
    maxRetries: 3, // Количество попыток
    baseDelay: 1000, // Начальная задержка между повторами (мс)
    maxDelay: 10000, // Верхний лимит задержки (мс)
    retryStatusCodes: [408, 429, 502, 503, 504], // Статусы, триггерящие повтор
    jitter: true, // Случайный джиттер против "громового стада"
  },

  // 📈 Метрики и логирование
  trackMetrics: true, // Включить сбор метрик производительности
  verbose: false, // Включить подробный (детальный) вывод логов
  logger: (level, message, meta) => {
    // Кастомная функция логирования
    console.log(`[${level}] ${message}`, meta ?? "");
  },

  // 🔌 Управление плагинами
  pluginDirs: ["./plugins"], // Директории для автосканирования внешних плагинов
  plugins: [], // Дополнительные инстансы плагинов или пути к ним

  // 💾 Опции плагинов (расширяются через HyperttpPluginsExtension)
  cache: {
    enabled: true,
    ttl: 300000,
    maxSize: 500,
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

## 🛠️ Использование продвинутых функций

### Цепочечный построитель (Fluent Builder API)

Используйте метод `.request(url)` для быстрого и наглядного конфигурирования запросов любой сложности:

```typescript
const result = await client
  .request("https://api.example.com/search")
  .post() // Установка HTTP-метода (по умолчанию GET)
  .query({ q: "hyperttp", p: 1 }) // Добавление Query параметров в URL
  .headers({ Authorization: "Bearer TOKEN" })
  .jsonBody({ activeOnly: true }) // Автоматически выставит Content-Type: application/json
  .json() // Ожидаем ответ в формате JSON (.text(), .buffer(), .stream())
  .timeout(5000) // Встроенный автоматический AbortSignal.timeout
  .send();
```

### Статистика, кэш и метрики

```typescript
// Получение текущей статистики работы движка (очередь, активные запросы)
const stats = client.getStats();
console.log(stats);

// Сбор всех накопленных метрик производительности
const allMetrics = client.getAllMetrics();
console.log(allMetrics);

// Очистить кэш ответов на лету
await client.clearCache();

// Узнать имя текущего активного транспорта (например, UndiciTransport / BunTransport)
const transportName = await client.getTransportName();
console.log(`Используется транспорт: ${transportName}`);

// Корректное фоновое закрытие клиента и освобождение ресурсов (Keep-Alive пулов)
await client.destroy();
```

### Работа со стримами (Streaming)

```typescript
// Возвращает HttpResponse с ReadableStream в качестве body и поддержкой метода .clone()
const streamResponse = await client.stream(
  "https://stream.example.com/audio.mp3",
);
const reader = streamResponse.body.getReader();
```

---

## 🏗️ Компоненты архитектуры плагинов

`HyperClient` последовательно собирает пайплайн обработки запроса из следующих встроенных слоев:

1. **withSerializer / withParser:** Отвечают за автоматическое приведение типов, сериализацию объектов при отправке
   и интеллектуальный разбор ответов.
2. **withCache:** Перехватывает повторные запросы, отдавая данные из локального кэша без выполнения сетевого вызова.
3. **withInflight:** Объединяет идентичные параллельные запросы к одному эндпоинту, предотвращая состояние гонки.
4. **withRateLimit & withQueue:** Упорядочивают вызовы, распределяют нагрузку и выстраивают запросы в FIFO-очередь
   при превышении лимитов.
5. **withInterceptors:** Обеспечивает глобальный перехват стадий жизненного цикла запроса и ответа.
6. **withMetrics:** Контролирует сбор телеметрии выполнения сетевых операций в реальном времени.

---

## 📄 Лицензия

MIT
