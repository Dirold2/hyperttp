import {
  RequestInterceptor,
  ResponseInterceptor,
} from "../../Types/interceptors";

/**
 * @class InterceptorManager
 * @en Manages registration and sequential execution of request and response interceptors.
 * @ru Управляет регистрацией и последовательным выполнением перехватчиков запроса и ответа.
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * @en Adds a request interceptor to the chain.
   * @ru Добавляет перехватчик запроса в цепочку.
   * @param interceptor Function that modifies request config before execution.
   */
  addRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * @en Adds a response interceptor to the chain.
   * @ru Добавляет перехватчик ответа в цепочку.
   * @param interceptor Function that modifies response after execution.
   */
  addResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * @en Sequentially applies all registered request interceptors.
   * @ru Последовательно применяет все перехватчики к конфигурации запроса.
   * @param config Initial request configuration.
   * @returns Modified request configuration after all interceptors.
   */
  async applyRequest(config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string | Buffer;
  }) {
    let result = config;

    for (const interceptor of this.requestInterceptors) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * @en Sequentially applies all registered response interceptors.
   * @ru Последовательно применяет все перехватчики к ответу.
   * @param response Raw HTTP response object.
   * @returns Modified response after all interceptors.
   */
  async applyResponse(response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
  }) {
    let result = response;

    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result);
    }

    return result;
  }

  /**
   * @en Removes all registered interceptors.
   * @ru Очищает все зарегистрированные перехватчики.
   */
  clear(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }
}
