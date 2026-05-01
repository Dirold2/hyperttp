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
export declare class MetricsManager {
    private history;
    private hostStates;
    private readonly failureThreshold;
    private readonly resetTimeout;
    private _totalBytesAccumulator;
    constructor(config?: MetricsConfig);
    /**
     * @en Extracts a scope (host + base path) from a URL for granular circuit breaking.
     * @ru Извлекает область (хост + базовый путь) из URL для точечной работы предохранителя.
     */
    private getScope;
    /**
     * @en Records request metrics and updates host failure state.
     * @ru Записывает метрики запроса и обновляет состояние ошибок хоста.
     */
    record(metrics: RequestMetrics & {
        cacheHit?: boolean;
    }): void;
    /**
     * @en Gets a specific metric record by its generated key.
     * @ru Получает конкретную запись метрики по её сгенерированному ключу.
     */
    get(key: string): RequestMetrics | undefined;
    /**
     * @en Returns all metrics currently stored in history.
     * @ru Возвращает все метрики, хранящиеся в истории.
     */
    getAll(): RequestMetrics[];
    /**
     * @en Checks if the circuit is open for a given URL (prevents request execution).
     * @ru Проверяет, "разомкнута" ли цепь для данного URL (предотвращает выполнение запроса).
     */
    isCircuitOpen(url: string): boolean;
    /**
     * @en Increments total received bytes counter.
     * @ru Увеличивает счетчик общего объема полученных байтов.
     */
    recordBytes(bytes: number): void;
    /**
     * @en Calculates performance summary statistics (Avg, P99, Success Rate).
     * @ru Вычисляет сводную статистику производительности (Среднее, P99, % успеха).
     */
    getSummary(): {
        totalRequests: number;
        successRate: number;
        avgDurationMs: number;
        totalBytesReceived: number;
        errorCount: number;
        maxDurationMs: number;
        p99DurationMs: number;
    } | null;
    /**
     * @en Clears metrics history and host failure states.
     * @ru Очищает историю метрик и состояния ошибок хостов.
     */
    clear(): void;
}
//# sourceMappingURL=MetricsManager.d.ts.map