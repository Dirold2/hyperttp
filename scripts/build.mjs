import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const cwd = process.cwd();
const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));
await rm(join(cwd, "dist"), { recursive: true, force: true });
const compiler = spawnSync("tsc", [], { cwd, stdio: "inherit" });
if (compiler.error || compiler.status !== 0) {
  throw compiler.error ?? new Error(`TypeScript failed: ${compiler.status}`);
}
async function jsFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await jsFiles(path)));
    else if (entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}
const files = await jsFiles(join(cwd, "dist"));
if (files.length)
  await build({
    entryPoints: files,
    outdir: "dist",
    outbase: "dist",
    allowOverwrite: true,
    minify: true,
    keepNames: true,
    sourcemap: true,
    format: "esm",
  });
if (pkg.exports?.["."]?.require?.endsWith(".cjs"))
  await build({
    entryPoints: ["dist/index.js"],
    outfile: "dist/index.cjs",
    bundle: true,
    packages: "external",
    platform: "node",
    format: "cjs",
    minify: true,
    keepNames: true,
    sourcemap: true,
  });
console.log(`Built ${pkg.name}@${pkg.version}`);
