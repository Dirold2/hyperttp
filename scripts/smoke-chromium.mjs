import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = new URL("../build/chromium-smoke/", import.meta.url);
await mkdir(output, { recursive: true });
const source = (await readFile(new URL("smoke-runtime.mjs", import.meta.url), "utf8"))
  .replaceAll("console.log(", "report(");
const lines = source.split("\n");
const imports = lines.filter((line) => line.startsWith("import ")).join("\n");
const body = lines.filter((line) => !line.startsWith("import ")).join("\n");
const bundle = await build({
  stdin: {
    contents: `${imports}
const report = message => { document.querySelector("pre").textContent += message + "\\n"; };
(async () => {
${body}
if (typeof globalThis.Buffer !== "undefined") throw new Error("Unexpected Buffer polyfill");
document.documentElement.dataset.result = "passed";
report("CHROMIUM_SMOKE_PASSED");
})().catch(error => {
  document.documentElement.dataset.result = "failed";
  report(error.stack ?? String(error));
});`,
    resolveDir: fileURLToPath(new URL("./", import.meta.url)),
    sourcefile: "chromium-smoke.mjs",
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  write: false,
  logLevel: "silent",
});
const html = `<!doctype html><html data-result="pending"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'">
</head><body><pre>Chromium built-package smoke (no externals)\n</pre><script>${bundle.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script></body></html>`;
await writeFile(new URL("index.html", output), html);
const result = spawnSync(
  process.env.CHROMIUM_PATH ?? "chromium",
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--dump-dom",
    "--timeout=15000",
    "--virtual-time-budget=10000",
    new URL("index.html", output).href,
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
);
await writeFile(new URL("result.html", output), result.stdout ?? "");
await writeFile(new URL("chromium.log", output), result.stderr ?? "");
console.log(result.stdout?.match(/<pre>[\s\S]*?<\/pre>/)?.[0] ?? "No browser report");
if (result.error || result.status !== 0 || !result.stdout.includes('data-result="passed"')) {
  throw result.error ?? new Error(`Chromium smoke failed; see ${fileURLToPath(output)}`);
}
