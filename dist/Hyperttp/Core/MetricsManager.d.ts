import type { RequestMetrics } from "../../Types/metrics";
import { MetricsOptions } from "../../Types/options";
export declare class MetricsManager {
    private readonly history;
    private readonly hostStates;
    private readonly scopeDepth;
    private readonly failureThreshold;
    private readonly resetTimeout;
    private readonly slowRequestMs;
    private readonly weights;
    private _totalBytesAccumulator;
    constructor(config?: MetricsOptions);
    /**
     * @ru Извлекает scope (host + первый сегмент пути) для circuit breaker.
     * @en Extracts scope (host + first path segment) for circuit breaker.
     */
    private getScope;
    private getOrCreateState;
    /**
     * @ru Проверяет, открыт ли circuit breaker для URL.
     * @en Checks whether the circuit breaker is open for a URL.
     */
    isCircuitOpen(url: string): boolean;
    /**
     * @ru Регистрирует метрику и обновляет состояние circuit breaker.
     * @en Records request metrics and updates circuit breaker state.
     */
    record(metrics: RequestMetrics & {
        cacheHit?: boolean;
    }): void;
    /**
     * @ru Получает метрику по ключу.
     * @en Retrieves a metric entry by key.
     */
    get(key: string): RequestMetrics | undefined;
    /**
     * @ru Возвращает все метрики.
     * @en Returns all stored metrics.
     */
    getAll(): RequestMetrics[];
    /**
     * @ru Увеличивает счётчик полученных байтов.
     * @en Increments total received bytes counter.
     */
    recordBytes(bytes: number): void;
    /**
     * @ru Возвращает сводную статистику.
     * @en Returns performance summary statistics.
     */
    getSummary(): {
        totalRequests: number;
        successRate: number;
        avgDurationMs: number;
        totalBytesReceived: number;
        errorCount: number;
        maxDurationMs: number;
        p99DurationMs: number;
        openCircuits: number;
    } | null;
    /**
     * @ru Очищает историю и состояния circuit breaker.
     * @en Clears metrics history and circuit breaker states.
     */
    clear(): void;
    private storeMetrics;
    private updateCircuit;
    private getFailureWeight;
    private percentile;
    private getOpenCircuitCount;
}
//# sourceMappingURL=MetricsManager.d.ts.map