import { Agent } from "undici";
import { InterceptorManager } from "./InterceptorManager";
import { RetryOptions } from "../../Types/options";
import { LogLevel } from "../../Types/http";
import { RequestMetrics } from "../../Types/metrics";
export declare class RequestExecutor {
    private agent;
    private interceptors;
    private options;
    private readonly redirectStatusCodes;
    constructor(agent: Agent, interceptors: InterceptorManager, options: {
        timeout: number;
        maxRetries: number;
        followRedirects: boolean;
        maxRedirects: number;
        retryOptions: RetryOptions;
        verbose?: boolean;
        logger?: (level: LogLevel, message: string, meta?: any) => void;
    });
    private calcDelay;
    private sleep;
    private drainBody;
    private executeCore;
    execute(method: string, url: string, headers: Record<string, string>, body: string | Buffer | undefined, metrics?: RequestMetrics, signal?: AbortSignal): Promise<{
        status: number;
        headers: Record<string, any>;
        body: any;
        url: string;
    }>;
}
//# sourceMappingURL=RequestExecutor.d.ts.map