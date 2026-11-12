type RequestQueryValue = string | number | boolean | null | undefined;
export type RequestQuery = Record<string, RequestQueryValue | RequestQueryValue[]>;
export declare function appendQueryToUrl(url: string, query: RequestQuery): string;
export {};
//# sourceMappingURL=query.d.ts.map