import "vitest";

declare module "vitest" {
  interface ProvidedContext {
    benchmarkBaseUrl: string;
  }
}
