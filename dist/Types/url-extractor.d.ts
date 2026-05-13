export interface UrlPattern<T extends string = string> {
    entity: string;
    regex: RegExp;
    groupNames: T[];
}
export interface UrlExtractorInterface {
    registerPlatform(platform: string, patterns: UrlPattern[]): void;
    extractId<T extends string | number>(url: string, entity: string, platform: string): Record<string, T>;
}
//# sourceMappingURL=url-extractor.d.ts.map