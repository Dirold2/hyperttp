import { LogLevel, Method } from "./http";
import { ResponseConverterOptions } from "./response";

export interface RetryOptions {
  /**
   * @ru Максимальное количество повторных попыток
   * @en Maximum number of retry attempts
   */
  maxRetries?: number;

  /**
   * @ru Базовая задержка между попытками (мс)
   * @en Base delay between retries (ms)
   */
  baseDelay?: number;

  /**
   * @ru Максимальная задержка между попытками (мс)
   * @en Maximum retry delay (ms)
   */
  maxDelay?: number;

  /**
   * @ru Коды HTTP, при которых выполняется retry
   * @en HTTP status codes that trigger retry logic
   */
  retryStatusCodes?: readonly number[];

  /**
   * @ru Добавлять случайный jitter к задержке
   * @en Add randomness (jitter) to retry delay
   */
  jitter?: boolean;
}

export interface CacheOptions {
  /**
   * @ru Включить кэш
   * @en Enable cache
   */
  enabled?: boolean;
  /**
   * @ru Время жизни кэша (мс)
   * @en Cache time-to-live in milliseconds
   */
  ttl?: number;

  /**
   * @ru Максимальный размер кэша
   * @en Maximum cache size
   */
  maxSize?: number;

  /**
   * @ru HTTP методы, которые можно кэшировать
   * @en HTTP methods allowed to be cached
   */
  methods?: readonly Method[];
}

export interface RateLimitOptions {
  /**
   * @ru Включить rate limit
   * @en Enable rate limiting
   */
  enabled?: boolean;
  /**
   * @ru Максимальное число запросов
   * @en Maximum number of requests
   */
  maxRequests?: number;

  /**
   * @ru Окно времени (мс)
   * @en Time window in milliseconds
   */
  windowMs?: number;
}

export interface NetworkOptions {
  /**
   * @ru Таймаут запроса (мс)
   * @en Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * @ru Максимум одновременных запросов. 0 = без лимита
   * @en Maximum concurrent requests. 0 = unlimited
   */
  maxConcurrent?: number;

  /**
   * @ru Количество pipelined запросов на соединение
   * @en Number of pipelined requests per connection
   */
  pipelining?: number;

  /**
   * @ru Таймаут keep-alive соединения (мс)
   * @en Keep-alive connection timeout in milliseconds
   */
  keepAliveTimeout?: number;

  /**
   * @ru Отклонять недоверенные SSL сертификаты
   * @en Reject unauthorized SSL certificates
   */
  rejectUnauthorized?: boolean;

  /**
   * @ru Следовать за редиректами
   * @en Follow HTTP redirects
   */
  followRedirects?: boolean;

  /**
   * @ru Максимум редиректов
   * @en Maximum number of redirects to follow
   */
  maxRedirects?: number;

  /**
   * @ru Максимальный размер ответа (байты)
   * @en Maximum response body size in bytes
   */
  maxResponseBytes?: number;

  /**
   * @ru Переключение режима HTTP/2 и HTTP/1.1
   * @en Switching between HTTP/2 and HTTP/1.1 modes
   */
  allowHttp2?: boolean;

  /**
   * @ru User-Agent заголовок
   * @en User-Agent header string
   */
  userAgent?: string;

  /**
   * @ru Функция валидации HTTP статуса
   * @en Function to validate HTTP status code
   * @param status - HTTP status code
   * @returns `true` if status is valid
   */
  validateStatus?: (status: number) => boolean;
}

export interface MetricsOptions {
  /**
   * @ru Включить сбор метрик
   * @en Enable metrics collection
   */
  enabled?: boolean;

  /**
   * @ru Максимальное количество записей в истории.
   * @en Maximum number of entries in history.
   */
  maxHistory?: number;

  /**
   * @ru Время хранения метрик в миллисекундах.
   * @en Time to keep metrics in milliseconds.
   */
  ttl?: number;

  /**
   * @ru Глубина scope для circuit breaker: 1 = host + первый сегмент пути.
   * @en Scope depth for circuit breaker: 1 = host + first path segment.
   */
  scopeDepth?: number;

  /**
   * @ru Порог ошибки, после которого circuit breaker переходит в OPEN.
   * @en Failure score threshold that opens the circuit breaker.
   */
  failureThreshold?: number;

  /**
   * @ru Время охлаждения перед переходом в HALF_OPEN.
   * @en Cooldown time before switching to HALF_OPEN.
   */
  resetTimeout?: number;

  /**
   * @ru Порог "медленного" запроса в миллисекундах.
   * @en Slow request threshold in milliseconds.
   */
  slowRequestMs?: number;

  /**
   * @ru Веса ошибок для разных классов отказов.
   * @en Failure weights for different failure classes.
   */
  weights?: {
    timeout?: number;
    serverError?: number;
    rateLimit?: number;
    slowRequest?: number;
    other?: number;
  };
}

export interface QueueOptions {
  /**
   * @ru Включить очередь запросов
   * @en Enable request queue
   */
  enabled?: boolean;
}

export interface HttpClientOptions {
  /**
   * @ru Настройки сети
   * @en Network configuration
   */
  network?: Partial<NetworkOptions>;

  /**
   * @ru Настройки retry
   * @en Retry configuration
   */
  retry?: Partial<RetryOptions>;

  /**
   * @ru Настройки кэша
   * @en Cache configuration
   */
  cache?: Partial<CacheOptions>;

  /**
   * @ru Настройки rate limit
   * @en Rate limiting configuration
   */
  rateLimit?: Partial<RateLimitOptions>;

  /**
   * @ru Метрики
   * @en Metrics configuration
   */
  metrics?: Partial<MetricsOptions>;

  /**
   * @ru Очередь запросов
   * @en Request queue configuration
   */
  queue?: Partial<QueueOptions>;

  /**
   * @ru Конвертер ответа
   * @en Response converter configuration
   */
  responseConverter?: Partial<ResponseConverterOptions>;

  /**
   * @ru Логгер
   * @en Logger function
   * @param level - log level
   * @param message - log message
   * @param meta - additional metadata
   */
  logger?: (level: LogLevel, message: string, meta?: unknown) => void;

  /**
   * @ru Режим verbose логов
   * @en Enable verbose logging
   */
  verbose?: boolean;
}
