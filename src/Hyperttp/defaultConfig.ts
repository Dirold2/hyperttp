import { HttpClientOptions } from "@hyperttp/core";

export const defaultConfig: HttpClientOptions = {
  network: {
    timeout: 30000,
    maxConcurrent: 500,
    allowHttp2: true,
    pipelining: 10,
    keepAliveTimeout: 30000,
    followRedirects: true,
    maxRedirects: 5,
    rejectUnauthorized: true,
    userAgent: "Hyperttp/2.0",
  },

  retry: {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    jitter: true,
  },

  metrics: {
    enabled: true,
  },

  cache: {
    enabled: true,
    ttl: 60000,
  },

  interceptors: {
    enabled: true,
  },

  rateLimit: {
    enabled: true,
    maxRequests: 10000,
    windowMs: 1000,
  },

  queue: {
    enabled: true,
  },

  verbose: false,
};
