import { RequestInterceptor, ResponseInterceptor } from "../../Types";
/**
 * @class InterceptorManager
 * @en Manages registration and sequential execution of request and response interceptors.
 * @ru Управляет регистрацией и последовательным выполнением перехватчиков запроса и ответа.
 */
export declare class InterceptorManager {
    private requestInterceptors;
    private responseInterceptors;
    /**
     * @en Adds a request interceptor to the chain.
     * @ru Добавляет перехватчик запроса в цепочку.
     * @param interceptor - Function that modifies the request config.
     */
    addRequest(interceptor: RequestInterceptor): void;
    /**
     * @en Adds a response interceptor to the chain.
     * @ru Добавляет перехватчик ответа в цепочку.
     * @param interceptor - Function that modifies the response data.
     */
    addResponse(interceptor: ResponseInterceptor): void;
    /**
     * @en Sequentially applies all registered request interceptors.
     * @ru Последовательно применяет все зарегистрированные перехватчики к конфигурации запроса.
     * @param config - Current request configuration (url, method, headers, body).
     * @returns Modified request configuration.
     */
    applyRequest(config: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string | Buffer;
    }): Promise<{
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string | Buffer;
    }>;
    /**
     * @en Sequentially applies all registered response interceptors.
     * @ru Последовательно применяет все зарегистрированные перехватчики к полученному ответу.
     * @param response - Raw response object (status, headers, body, url).
     * @returns Modified response object.
     */
    applyResponse(response: {
        status: number;
        headers: Record<string, any>;
        body: Buffer;
        url: string;
    }): Promise<{
        status: number;
        headers: Record<string, any>;
        body: Buffer;
        url: string;
    }>;
    /**
     * @en Clears all registered interceptors.
     * @ru Полностью очищает все зарегистрированные перехватчики.
     */
    clear(): void;
}
//# sourceMappingURL=InterceptorManager.d.ts.map