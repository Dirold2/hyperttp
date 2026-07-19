/**
 * @ru Шаблон URL для извлечения параметров.
 * @en URL pattern for extracting parameters.
 *
 * @typeParam T - Типы имен групп (строковые литералы).
 * @typeParam T - Group names types (string literals).
 */
export interface UrlPattern<T extends string = string> {
    /**
     * @ru Название сущности (например, "video", "user").
     * @en Entity name (e.g., "video", "user").
     */
    entity: string;
    /**
     * @ru Регулярное выражение для сопоставления URL.
     * @en Regular expression for matching URLs.
     */
    regex: RegExp;
    /**
     * @ru Имена захваченных групп.
     * @en Captured group names.
     */
    groupNames: T[];
}
/**
 * @ru Интерфейс экстрактора URL для извлечения идентификаторов из URL различных платформ.
 * @en URL extractor interface for extracting IDs from URLs of different platforms.
 */
export interface UrlExtractorInterface {
    /**
     * @ru Регистрирует платформу с набором шаблонов URL.
     * @en Registers a platform with a set of URL patterns.
     *
     * @param platform - Platform name (e.g., "youtube", "twitter").
     * @param patterns - Array of URL patterns for this platform.
     */
    registerPlatform(platform: string, patterns: UrlPattern[]): void;
    /**
     * @ru Извлекает идентификаторы из URL для указанной сущности и платформы.
     * @en Extracts IDs from URL for the specified entity and platform.
     *
     * @typeParam T - ID type (string or number).
     * @param url - URL to extract from.
     * @param entity - Entity name to look for.
     * @param platform - Platform name.
     * @returns Object with extracted IDs mapped by group names.
     */
    extractId<T extends string | number>(url: string, entity: string, platform: string): Record<string, T>;
}
//# sourceMappingURL=url-extractor.d.ts.map