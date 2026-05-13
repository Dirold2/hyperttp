export interface RequestMetrics {
    /**
     * @ru Время начала запроса (timestamp)
     * @en Request start time (timestamp)
     */
    startTime: number;
    /**
     * @ru Время окончания запроса (timestamp)
     * @en Request end time (timestamp)
     */
    endTime: number;
    /**
     * @ru Длительность запроса (мс)
     * @en Request duration (ms)
     */
    duration: number;
    /**
     * @ru HTTP статус код ответа
     * @en HTTP status code of response
     */
    statusCode?: number;
    /**
     * @ru Количество полученных байт
     * @en Bytes received
     */
    bytesReceived: number;
    /**
     * @ru Количество отправленных байт
     * @en Bytes sent
     */
    bytesSent: number;
    /**
     * @ru Количество повторных попыток
     * @en Number of retries performed
     */
    retries: number;
    /**
     * @ru Ответ из кэша
     * @en Response served from cache
     */
    cached: boolean;
    /**
     * @ru URL запроса
     * @en Request URL
     */
    url: string;
    /**
     * @ru HTTP метод запроса
     * @en HTTP method
     */
    method: string;
    /**
     * @ru Хэш тела запроса (для кэширования)
     * @en Request body hash (for caching)
     */
    bodyHash?: string;
}
export type CircuitStateName = "CLOSED" | "OPEN" | "HALF_OPEN";
export type CircuitState = {
    state: CircuitStateName;
    failureScore: number;
    consecutiveFailures: number;
    lastFailureTime: number;
    lastTransitionTime: number;
    probeInFlight: boolean;
};
//# sourceMappingURL=metrics.d.ts.map