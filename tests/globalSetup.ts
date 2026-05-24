import type { AddressInfo } from "node:net";
import { createBenchmarkServer } from "./benchmarkServer";

function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}

function waitForServerReady(url: string, timeoutMs = 3000): Promise<void> {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryFetch = async () => {
      try {
        const response = await fetch(url);

        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // ignore and retry until timeout
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timeout waiting for benchmark server at ${url}`));
        return;
      }

      setTimeout(tryFetch, 100);
    };

    void tryFetch();
  });
}

export default async function globalSetup() {
  const server = createBenchmarkServer();

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(3000, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address() as AddressInfo | null;
    const port = address?.port ?? 3000;

    console.log(`🧪 Test benchmark server started on http://127.0.0.1:${port}`);

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

      console.log("🧪 Test benchmark server stopped");
    };
  } catch (error) {
    if (!isAddressInUseError(error)) {
      throw error;
    }

    await waitForServerReady("http://127.0.0.1:3000/json");
    console.log(
      "🧪 Reusing existing benchmark server on http://127.0.0.1:3000",
    );

    return;
  }
}
