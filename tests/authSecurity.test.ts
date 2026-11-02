import { describe, expect, it } from "vitest";
import { HyperClient } from "../src/index.js";

const trustedOrigin = "https://api.example.test";

describe("authentication security boundaries", () => {
  it.each([
    "https://api.example.test.other.test/me",
    "https://api.example.test@other.test/me",
    "http://api.example.test/me",
    "https://api.example.test:8443/me",
  ])("does not attach credentials outside the exact trusted origin: %s", async (url) => {
    let tokenReads = 0;
    let receivedAuthorization: unknown;
    const client = new HyperClient(
      {
        auth: {
          allowedOrigins: [trustedOrigin],
          bearer: {
            getToken: () => {
              tokenReads++;
              return "synthetic-test-token";
            },
          },
        },
        cache: { enabled: false },
        inflight: { enabled: false },
      },
      {
        async execute(request) {
          receivedAuthorization = request.headers.authorization;
          return { status: 200, headers: {}, body: new Uint8Array() };
        },
      },
    );

    try {
      await client.get(url);
      expect(tokenReads).toBe(0);
      expect(receivedAuthorization).toBeUndefined();
    } finally {
      await client.destroy();
    }
  });

  it("does not resolve credentials for requests excluded by shouldAuthenticate", async () => {
    let tokenReads = 0;
    const client = new HyperClient(
      {
        auth: {
          allowedOrigins: [trustedOrigin],
          shouldAuthenticate: () => false,
          bearer: {
            getToken: () => {
              tokenReads++;
              return "synthetic-test-token";
            },
          },
        },
      },
      {
        async execute(request) {
          expect(request.headers.authorization).toBeUndefined();
          return { status: 200, headers: {}, body: new Uint8Array() };
        },
      },
    );

    try {
      await client.get(`${trustedOrigin}/public`);
      expect(tokenReads).toBe(0);
    } finally {
      await client.destroy();
    }
  });
});
