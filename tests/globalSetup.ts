import type { AddressInfo } from "node:net";
import type { TestProject } from "vitest/node";
import { createBenchmarkServer } from "./benchmarkServer.js";

declare module "vitest" {
  export interface ProvidedContext {
    benchmarkBaseUrl: string;
  }
}

export default async function globalSetup(project: TestProject) {
  const server = createBenchmarkServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error("Benchmark server did not expose a listening address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  project.provide("benchmarkBaseUrl", baseUrl);
  console.log(`Test benchmark server started on ${baseUrl}`);

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    console.log("Test benchmark server stopped");
  };
}
