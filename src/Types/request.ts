/**
 * @ru Представляет HTTP заголовки запроса
 * @en Represents HTTP request headers
 */
export type RequestHeaders = Record<string, string>;

/**
 * @ru Представляет параметры URL query
 * @en Represents URL query parameters
 */
export type RequestQuery = Record<
  string,
  string | string[] | number | boolean | undefined | null
>;

/**
 * @ru Данные тела запроса
 * @en Request body data
 */
export type RequestBodyData = any | null | undefined;

/**
 * @ru Конфигурация для создания запроса
 * @en Configuration for request creation
 */
export type RequestConfig = {
  /**
   * @ru Схема протокола (http/https)
   * @en Protocol scheme (http/https)
   */
  scheme: string;
  /**
   * @ru Хост сервера
   * @en Server host
   */
  host: string;
  /**
   * @ru Порт сервера
   * @en Server port
   */
  port?: number;
  /**
   * @ru Путь ресурса
   * @en Resource path
   */
  path?: string;
  /**
   * @ru Заголовки запроса
   * @en Request headers
   */
  headers?: RequestHeaders;
  /**
   * @ru Параметры query строки
   * @en Query string parameters
   */
  query?: RequestQuery;
  /**
   * @ru Данные тела запроса
   * @en Request body data
   */
  bodyData?: RequestBodyData;
};

/**
 * @ru Основной интерфейс запроса
 * @en Main request interface
 */
export interface RequestInterface {
  /**
   * @ru Возвращает полный URL запроса
   * @en Returns full request URL
   * @returns constructed URL string
   */
  getURL(): string;

  /**
   * @ru Возвращает заголовки запроса
   * @en Returns request headers
   * @returns headers object
   */
  getHeaders(): RequestHeaders;

  /**
   * @ru Возвращает данные тела запроса
   * @en Returns request body data
   * @returns body data
   */
  getBodyData(): RequestBodyData;

  /**
   * @ru Устанавливает путь ресурса
   * @en Sets resource path
   * @param path - new path
   * @returns this for chaining
   */
  setPath?(path: string): RequestInterface;

  /**
   * @ru Устанавливает хост сервера
   * @en Sets server host
   * @param host - server host
   * @returns this for chaining
   */
  setHost?(host: string): RequestInterface;

  /**
   * @ru Устанавливает заголовки запроса
   * @en Sets request headers
   * @param headers - headers object
   * @returns this for chaining
   */
  setHeaders?(headers: RequestHeaders): RequestInterface;

  /**
   * @ru Добавляет заголовки к существующим
   * @en Adds headers to existing ones
   * @param headers - headers to add
   * @returns this for chaining
   */
  addHeaders?(headers: RequestHeaders): RequestInterface;

  /**
   * @ru Возвращает query параметры
   * @en Returns query parameters
   * @returns query object
   */
  getQuery?(): RequestQuery;

  /**
   * @ru Устанавливает query параметры
   * @en Sets query parameters
   * @param query - query object
   * @returns this for chaining
   */
  setQuery?(query: RequestQuery): RequestInterface;

  /**
   * @ru Добавляет query параметры
   * @en Adds query parameters
   * @param query - query to add
   * @returns this for chaining
   */
  addQuery?(query: RequestQuery): RequestInterface;

  /**
   * @ru Возвращает query строку
   * @en Returns query string
   * @returns encoded query string
   */
  getQueryAsString?(): string;

  /**
   * @ru Возвращает тело запроса как строку
   * @en Returns body data as string
   * @returns body string representation
   */
  getBodyDataString?(): string;

  /**
   * @ru Устанавливает данные тела запроса
   * @en Sets request body data
   * @param bodyData - body data
   * @returns this for chaining
   */
  setBodyData?(bodyData: RequestBodyData): RequestInterface;

  /**
   * @ru Добавляет данные к телу запроса
   * @en Adds data to request body
   * @param bodyData - data to add
   * @returns this for chaining
   */
  addBodyData?(bodyData: RequestBodyData): RequestInterface;

  /**
   * @ru Устанавливает AbortSignal для отмены
   * @en Sets AbortSignal for cancellation
   * @param signal - AbortSignal instance
   * @returns this for chaining
   */
  setSignal?(signal: AbortSignal): RequestInterface;

  /**
   * @ru Возвращает AbortSignal
   * @en Returns AbortSignal
   * @returns AbortSignal or undefined
   */
  getSignal?(): AbortSignal | undefined;
}

/**
 * @ru Метаданные для конвертации ответа
 * @en Response conversion metadata
 */
export interface ConversionMeta {
  /**
   * @ru Content-Type заголовок
   * @en Content-Type header
   */
  contentType?: string;
  /**
   * @ru Content-Encoding заголовок
   * @en Content-Encoding header
   */
  contentEncoding?: string;
  /**
   * @ru URL запроса
   * @en Request URL
   */
  url?: string;
}
