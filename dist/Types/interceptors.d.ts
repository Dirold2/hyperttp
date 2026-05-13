export type RequestInterceptor = (config: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
}) => any | Promise<any>;
export type ResponseInterceptor = (response: {
    status: number;
    headers: Record<string, any>;
    body: Buffer;
    url: string;
}) => any | Promise<any>;
//# sourceMappingURL=interceptors.d.ts.map