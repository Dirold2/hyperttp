"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptorManager = void 0;
/**
 * @class InterceptorManager
 * @en Manages registration and sequential execution of request and response interceptors.
 * @ru Управляет регистрацией и последовательным выполнением перехватчиков запроса и ответа.
 */
class InterceptorManager {
    requestInterceptors = [];
    responseInterceptors = [];
    /**
     * @en Adds a request interceptor to the chain.
     * @ru Добавляет перехватчик запроса в цепочку.
     * @param interceptor - Function that modifies the request config.
     */
    addRequest(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    /**
     * @en Adds a response interceptor to the chain.
     * @ru Добавляет перехватчик ответа в цепочку.
     * @param interceptor - Function that modifies the response data.
     */
    addResponse(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    /**
     * @en Sequentially applies all registered request interceptors.
     * @ru Последовательно применяет все зарегистрированные перехватчики к конфигурации запроса.
     * @param config - Current request configuration (url, method, headers, body).
     * @returns Modified request configuration.
     */
    async applyRequest(config) {
        let result = config;
        for (const interceptor of this.requestInterceptors) {
            result = await interceptor(result);
        }
        return result;
    }
    /**
     * @en Sequentially applies all registered response interceptors.
     * @ru Последовательно применяет все зарегистрированные перехватчики к полученному ответу.
     * @param response - Raw response object (status, headers, body, url).
     * @returns Modified response object.
     */
    async applyResponse(response) {
        let result = response;
        for (const interceptor of this.responseInterceptors) {
            result = await interceptor(result);
        }
        return result;
    }
    /**
     * @en Clears all registered interceptors.
     * @ru Полностью очищает все зарегистрированные перехватчики.
     */
    clear() {
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }
}
exports.InterceptorManager = InterceptorManager;
//# sourceMappingURL=InterceptorManager.js.map