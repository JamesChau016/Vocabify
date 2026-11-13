import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const output = new URL("./dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const require = createRequire(import.meta.url);
const compiler = require.resolve("typescript/bin/tsc");
const result = spawnSync(process.execPath, [compiler, "--project", fileURLToPath(new URL("./tsconfig.json", import.meta.url))], {
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);

await cp(new URL("./manifest.json", import.meta.url), new URL("manifest.json", output));
for (const file of ["popup.html", "popup.css"]) {
  await cp(new URL(`./src/${file}`, import.meta.url), new URL(file, output));
}

console.log("Built Vocabify Capture in extension/dist");
