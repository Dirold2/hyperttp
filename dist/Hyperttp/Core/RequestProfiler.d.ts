import type { RequestPerformanceProfile } from "../../Types/metrics.js";
type ProfiledResult<T> = {
    result: T;
    profile: RequestPerformanceProfile;
};
export declare class RequestProfiler {
    static profile<T>(executor: () => Promise<T>): Promise<ProfiledResult<T>>;
}
export type { ProfiledResult };
//# sourceMappingURL=RequestProfiler.d.ts.map