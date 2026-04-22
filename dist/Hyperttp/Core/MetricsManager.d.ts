import { RequestMetrics } from "../../Types";
export interface MetricsConfig {
    /** Максимальное количество записей в истории (default: 1000) */
    maxHistory?: number;
    /** Время хранения метрик в мс (default: 1 час) */
    ttl?: number;
}
export declare class MetricsManager {
    private history;
    private hostStates;
    private readonly failureThreshold;
    private readonly resetTimeout;
    constructor(config?: MetricsConfig);
    private getScope;
    record(metrics: RequestMetrics & {
        cacheHit?: boolean;
    }): void;
    get(key: string): RequestMetrics | undefined;
    getAll(): RequestMetrics[];
    isCircuitOpen(url: string): boolean;
    getSummary(): {
        totalRequests: number;
        successRate: number;
        avgDurationMs: number;
        totalBytesReceived: number;
        errorCount: number;
        maxDurationMs: number;
        p99DurationMs: number;
    } | null;
    clear(): void;
}
//# sourceMappingURL=MetricsManager.d.ts.map