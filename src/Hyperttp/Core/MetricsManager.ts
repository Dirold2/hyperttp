import { LRUCache } from "lru-cache";
import { RequestMetrics } from "../../Types";

/**
 * @interface MetricsConfig
 * @en Configuration for the metrics and circuit breaker behavior.
 * @ru Конфигурация для метрик и поведения предохранителя (circuit breaker).
 */
export interface MetricsConfig {
  /** * @en Maximum number of entries in history.
   * @ru Максимальное количество записей в истории. (default: 1000)
   */
  maxHistory?: number;
  /** * @en Time to keep metrics in ms.
   * @ru Время хранения метрик в миллисекундах. (default: 1 hour)
   */
  ttl?: number;
}

/**
 * @class MetricsManager
 * @en Collects request statistics and manages Circuit Breaker states for hosts.
 * @ru Собирает статистику запросов и управляет состояниями Circuit Breaker для хостов.
 */
export class MetricsManager {
  private history: LRUCache<string, RequestMetrics>;
  private hostStates: Map<
    string,
    {
      consecutiveFailures: number;
      lastFailureTime: number;
    }
  > = new Map();

  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000;
  private _totalBytesAccumulator: number = 0;

  constructor(config?: MetricsConfig) {
    this.history = new LRUCache({
      max: config?.maxHistory ?? 1000,
      ttl: config?.ttl ?? 1000 * 60 * 60,
      ttlAutopurge: true,
    });
  }

  /**
   * @en Extracts a scope (host + base path) from a URL for granular circuit breaking.
   * @ru Извлекает область (хост + базовый путь) из URL для точечной работы предохранителя.
   */
  private getScope(url: string): string {
    try {
      const u = new URL(url);
      // Берём хост и первый сегмент пути, чтобы не блокировать весь домен из-за одной API-ручки
      return `${u.host}${u.pathname.split("/").slice(0, 2).join("/")}`;
    } catch {
      return "unknown";
    }
  }

  /**
   * @en Records request metrics and updates host failure state.
   * @ru Записывает метрики запроса и обновляет состояние ошибок хоста.
   */
  record(metrics: RequestMetrics & { cacheHit?: boolean }): void {
    const key = `${metrics.method}:${metrics.url}:${Date.now()}`;
    this.history.set(key, metrics);

    const host = this.getScope(metrics.url);
    let state = this.hostStates.get(host);

    if (!state) {
      state = { consecutiveFailures: 0, lastFailureTime: 0 };
      this.hostStates.set(host, state);
    }

    const isFailure =
      (metrics.statusCode && metrics.statusCode >= 500) ||
      metrics.duration > 5000;

    if (isFailure) {
      state.consecutiveFailures++;
      state.lastFailureTime = Date.now();
    } else {
      state.consecutiveFailures = 0; // Сброс при успешном запросе (сценарий "Half-Open")
    }
  }

  /**
   * @en Gets a specific metric record by its generated key.
   * @ru Получает конкретную запись метрики по её сгенерированному ключу.
   */
  get(key: string): RequestMetrics | undefined {
    return this.history.get(key);
  }

  /**
   * @en Returns all metrics currently stored in history.
   * @ru Возвращает все метрики, хранящиеся в истории.
   */
  getAll(): RequestMetrics[] {
    return Array.from(this.history.values());
  }

  /**
   * @en Checks if the circuit is open for a given URL (prevents request execution).
   * @ru Проверяет, "разомкнута" ли цепь для данного URL (предотвращает выполнение запроса).
   */
  isCircuitOpen(url: string): boolean {
    const host = this.getScope(url);
    const state = this.hostStates.get(host);

    if (!state) return false;

    if (state.consecutiveFailures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      // Если таймаут прошел, даем шанс (Half-Open), если нет — цепь разомкнута (Open)
      return timeSinceLastFailure < this.resetTimeout;
    }

    return false;
  }

  /**
   * @en Increments total received bytes counter.
   * @ru Увеличивает счетчик общего объема полученных байтов.
   */
  recordBytes(bytes: number): void {
    // Мы можем хранить общее количество байтов отдельно для глобальной статистики
    this._totalBytesAccumulator = (this._totalBytesAccumulator || 0) + bytes;
  }

  /**
   * @en Calculates performance summary statistics (Avg, P99, Success Rate).
   * @ru Вычисляет сводную статистику производительности (Среднее, P99, % успеха).
   */
  getSummary() {
    const all = this.getAll();
    const total = all.length;
    if (total === 0) return null;

    let successful = 0;
    let totalDuration = 0;
    let maxDur = 0;

    for (const m of all) {
      if (m.statusCode && m.statusCode < 400) successful++;
      totalDuration += m.duration;
      if (m.duration > maxDur) maxDur = m.duration;
    }

    const durations = all.map((m) => m.duration).sort((a, b) => a - b);
    const p99 =
      durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

    return {
      totalRequests: total,
      successRate: (successful / total) * 100,
      avgDurationMs: Math.round(totalDuration / total),
      totalBytesReceived: this._totalBytesAccumulator,
      errorCount: total - successful,
      maxDurationMs: maxDur,
      p99DurationMs: p99,
    };
  }

  /**
   * @en Clears metrics history and host failure states.
   * @ru Очищает историю метрик и состояния ошибок хостов.
   */
  clear(): void {
    this.history.clear();
    this.hostStates.clear();
    this._totalBytesAccumulator = 0;
  }
}
