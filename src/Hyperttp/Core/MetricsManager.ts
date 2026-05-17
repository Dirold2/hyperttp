import { LRUCache } from "lru-cache";
import type { CircuitState, RequestMetrics } from "../../Types/metrics";
import { MetricsOptions } from "../../Types/options";

export class MetricsManager {
  private readonly history: LRUCache<string, RequestMetrics>;
  private readonly hostStates = new Map<string, CircuitState>();

  private readonly scopeDepth: number;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly slowRequestMs: number;
  private readonly weights: Required<NonNullable<MetricsOptions["weights"]>>;

  private _totalBytesAccumulator = 0;

  constructor(config?: MetricsOptions) {
    this.history = new LRUCache({
      max: config?.maxHistory ?? 1000,
      ttl: config?.ttl ?? 1000 * 60 * 60,
      ttlAutopurge: true,
    });

    this.scopeDepth = Math.max(1, config?.scopeDepth ?? 1);
    this.failureThreshold = Math.max(1, config?.failureThreshold ?? 5);
    this.resetTimeout = Math.max(1, config?.resetTimeout ?? 30_000);
    this.slowRequestMs = Math.max(1, config?.slowRequestMs ?? 5_000);
    this.weights = {
      timeout: config?.weights?.timeout ?? 2,
      serverError: config?.weights?.serverError ?? 1,
      rateLimit: config?.weights?.rateLimit ?? 1.5,
      slowRequest: config?.weights?.slowRequest ?? 0.5,
      other: config?.weights?.other ?? 1,
    };
  }

  /**
   * @ru Извлекает scope (host + первый сегмент пути) для circuit breaker.
   * @en Extracts scope (host + first path segment) for circuit breaker.
   */
  private getScope(url: string): string {
    try {
      const u = new URL(url);
      const segments = u.pathname.split("/").filter(Boolean);
      const scopedPath = segments.slice(0, this.scopeDepth).join("/");
      return scopedPath ? `${u.host}/${scopedPath}` : u.host;
    } catch {
      return "unknown";
    }
  }

  private getOrCreateState(scope: string): CircuitState {
    let state = this.hostStates.get(scope);

    if (!state) {
      state = {
        state: "CLOSED",
        failureScore: 0,
        consecutiveFailures: 0,
        lastFailureTime: 0,
        lastTransitionTime: Date.now(),
        probeInFlight: false,
      };
      this.hostStates.set(scope, state);
    }

    return state;
  }

  /**
   * @ru Проверяет, открыт ли circuit breaker для URL.
   * @en Checks whether the circuit breaker is open for a URL.
   */
  isCircuitOpen(url: string): boolean {
    const scope = this.getScope(url);
    const state = this.getOrCreateState(scope);

    if (state.state === "CLOSED") {
      return false;
    }

    if (state.state === "OPEN") {
      const elapsed = Date.now() - state.lastTransitionTime;

      if (elapsed < this.resetTimeout) {
        return true;
      }

      state.state = "HALF_OPEN";
      state.probeInFlight = false;
      state.lastTransitionTime = Date.now();
    }

    if (state.state === "HALF_OPEN") {
      if (state.probeInFlight) {
        return true;
      }

      state.probeInFlight = true;
      return false;
    }

    return false;
  }

  /**
   * @ru Регистрирует метрику и обновляет состояние circuit breaker.
   * @en Records request metrics and updates circuit breaker state.
   */
  record(metrics: RequestMetrics & { cacheHit?: boolean }): void {
    this.storeMetrics(metrics);
    this.updateCircuit(metrics);
  }

  /**
   * @ru Получает метрику по ключу.
   * @en Retrieves a metric entry by key.
   */
  get(key: string): RequestMetrics | undefined {
    const exact = this.history.get(key);
    if (exact) {
      return exact;
    }

    let latest: RequestMetrics | undefined;
    let latestTs = -1;

    for (const [entryKey, metric] of this.history.entries()) {
      if (metric.url !== key) {
        continue;
      }

      const idx = entryKey.lastIndexOf(":");
      const ts = idx >= 0 ? Number(entryKey.slice(idx + 1)) : 0;

      if (ts >= latestTs) {
        latestTs = ts;
        latest = metric;
      }
    }

    return latest;
  }

  /**
   * @ru Возвращает все метрики.
   * @en Returns all stored metrics.
   */
  getAll(): RequestMetrics[] {
    return Array.from(this.history.values());
  }

  /**
   * @ru Увеличивает счётчик полученных байтов.
   * @en Increments total received bytes counter.
   */
  recordBytes(bytes: number): void {
    this._totalBytesAccumulator += Math.max(0, bytes);
  }

  /**
   * @ru Возвращает сводную статистику.
   * @en Returns performance summary statistics.
   */
  getSummary() {
    const all = this.getAll();
    const total = all.length;
    if (total === 0) return null;

    let successful = 0;
    let totalDuration = 0;
    let maxDur = 0;

    for (const m of all) {
      if ((m.statusCode ?? 0) < 400 && (m.statusCode ?? 0) !== 0) successful++;
      totalDuration += m.duration;
      if (m.duration > maxDur) maxDur = m.duration;
    }

    const durations = all.map((m) => m.duration);
    const p99 = this.percentile(durations, 99);

    return {
      totalRequests: total,
      successRate: (successful / total) * 100,
      avgDurationMs: Math.round(totalDuration / total),
      totalBytesReceived: this._totalBytesAccumulator,
      errorCount: total - successful,
      maxDurationMs: maxDur,
      p99DurationMs: p99,
      openCircuits: this.getOpenCircuitCount(),
    };
  }

  /**
   * @ru Очищает историю и состояния circuit breaker.
   * @en Clears metrics history and circuit breaker states.
   */
  clear(): void {
    this.history.clear();
    this.hostStates.clear();
    this._totalBytesAccumulator = 0;
  }

  private storeMetrics(metrics: RequestMetrics): void {
    const key = `${metrics.method}:${metrics.url}:${Date.now()}`;
    this.history.set(key, metrics);
  }

  private updateCircuit(metrics: RequestMetrics): void {
    const scope = this.getScope(metrics.url);
    const state = this.getOrCreateState(scope);

    const failureWeight = this.getFailureWeight(metrics);

    if (failureWeight > 0) {
      state.failureScore += failureWeight;
      state.consecutiveFailures += 1;
      state.lastFailureTime = Date.now();

      if (
        state.state === "HALF_OPEN" ||
        state.failureScore >= this.failureThreshold
      ) {
        state.state = "OPEN";
        state.probeInFlight = false;
        state.lastTransitionTime = Date.now();
      }

      return;
    }

    state.failureScore = 0;
    state.consecutiveFailures = 0;

    if (state.state === "HALF_OPEN" || state.state === "OPEN") {
      state.state = "CLOSED";
      state.probeInFlight = false;
      state.lastTransitionTime = Date.now();
    }
  }

  private getFailureWeight(metrics: RequestMetrics): number {
    const status = metrics.statusCode ?? 0;

    if (status === 0) {
      return this.weights.timeout;
    }

    if (status === 429) {
      return this.weights.rateLimit;
    }

    if (status >= 500) {
      return this.weights.serverError;
    }

    if (metrics.duration >= this.slowRequestMs) {
      return this.weights.slowRequest;
    }

    if (status >= 400) {
      return this.weights.other;
    }

    return 0;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;

    const sorted = [...arr].sort((a, b) => a - b);
    const rank = (p / 100) * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);

    if (low === high) return sorted[low];

    const weight = rank - low;
    return Math.round(sorted[low] * (1 - weight) + sorted[high] * weight);
  }

  private getOpenCircuitCount(): number {
    let count = 0;
    for (const state of this.hostStates.values()) {
      if (state.state === "OPEN") count++;
    }
    return count;
  }
}
