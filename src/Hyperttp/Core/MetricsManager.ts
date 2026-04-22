import { LRUCache } from "lru-cache";
import { RequestMetrics } from "../../Types";

export interface MetricsConfig {
  /** Максимальное количество записей в истории (default: 1000) */
  maxHistory?: number;
  /** Время хранения метрик в мс (default: 1 час) */
  ttl?: number;
}

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

  constructor(config?: MetricsConfig) {
    this.history = new LRUCache({
      max: config?.maxHistory ?? 1000,
      ttl: config?.ttl ?? 1000 * 60 * 60,
      ttlAutopurge: true,
    });
  }

  private getScope(url: string): string {
    try {
      const u = new URL(url);
      return `${u.host}${u.pathname.split("/").slice(0, 2).join("/")}`;
    } catch {
      return "unknown";
    }
  }

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
      state.consecutiveFailures = 0;
    }
  }

  get(key: string): RequestMetrics | undefined {
    return this.history.get(key);
  }

  getAll(): RequestMetrics[] {
    return Array.from(this.history.values());
  }

  isCircuitOpen(url: string): boolean {
    const host = this.getScope(url);
    const state = this.hostStates.get(host);

    if (!state) return false;

    if (state.consecutiveFailures >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      return timeSinceLastFailure < this.resetTimeout;
    }

    return false;
  }

  getSummary() {
    const all = this.getAll();
    const total = all.length;
    if (total === 0) return null;

    let successful = 0;
    let totalDuration = 0;
    let totalBytes = 0;
    let maxDur = 0;

    for (const m of all) {
      if (m.statusCode && m.statusCode < 400) successful++;
      totalDuration += m.duration;
      totalBytes += m.bytesReceived || 0;
      if (m.duration > maxDur) maxDur = m.duration;
    }

    const durations = all.map((m) => m.duration).sort((a, b) => a - b);
    const p99 =
      durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

    return {
      totalRequests: total,
      successRate: (successful / total) * 100,
      avgDurationMs: Math.round(totalDuration / total),
      totalBytesReceived: totalBytes,
      errorCount: total - successful,
      maxDurationMs: maxDur,
      p99DurationMs: p99,
    };
  }

  clear(): void {
    this.history.clear();
  }
}
