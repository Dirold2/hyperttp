import { HyperClient, Request, UrlExtractor } from "../dist/index.js";

function check(value, message) {
  if (!value) throw new Error(message);
}

let calls = 0;
let closes = 0;
const transport = {
  async execute(request) {
    calls++;
    if (request.url.endsWith("/retry") && calls === 1) {
      return { status: 503, headers: {}, body: new Uint8Array() };
    }
    if (request.url.endsWith("/unicode")) {
      check(
        new TextDecoder().decode(request.body) === JSON.stringify({ text: "Привет 🌍" }),
        "UTF-8 body",
      );
    }
    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: new TextEncoder().encode('{"ok":true}'),
    };
  },
  async close() {
    closes++;
  },
};
const options = {
  retry: { maxRetries: 1, baseDelay: 0, jitter: false },
  cache: { enabled: false },
  inflight: { enabled: false },
};
const first = new HyperClient(options, transport);
const second = new HyperClient(options, transport);
try {
  check((await first.get("https://example.test/retry")).ok, "Retry response");
  check(calls === 2, "Retry must execute twice");
  check(
    (await second.post("https://example.test/unicode", { text: "Привет 🌍" })).ok,
    "Unicode POST",
  );
  const server = first.server(0, { services: { value: 42 } });
  server.rest.get("/health", ({ services }) => ({ body: services.value }));
  await server.close();
  check(typeof Request === "function" && typeof UrlExtractor === "function", "Public exports");
} finally {
  await first.destroy();
  await second.destroy();
}
check(closes === 1, "Shared transport closes once");
let rejected = false;
try {
  await first.get("https://example.test/after-destroy");
} catch {
  rejected = true;
}
check(rejected, "Send after destroy");
console.log("hyperttp: retry, Unicode POST, independent clients, server facade and shutdown OK");
