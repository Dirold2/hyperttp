import type { HyperClientOptions } from "@hyperttp/types";

export const defaultConfig: HyperClientOptions = {
  retry: {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    jitter: true,
  },
  trackMetrics: true,
  verbose: false,
};
