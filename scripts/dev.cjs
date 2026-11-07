const { spawnSync } = require("node:child_process");
const { delimiter, join } = require("node:path");
const { existsSync } = require("node:fs");

// npm on Windows may start with its bundled Node even when another Node is on PATH.
const name = process.platform === "win32" ? "node.exe" : "node";
const binaries = new Set([
  process.execPath,
  ...(process.env.PATH || "").split(delimiter).filter(Boolean)
    .map((dir) => join(dir, name)),
]);
const check = "process.exit(Number(process.versions.node.split('.')[0]) >= 24 && typeof require('node:sqlite').DatabaseSync === 'function' ? 0 : 1)";
const node = [...binaries].find((path) => existsSync(path) &&
  spawnSync(path, ["-e", check], { stdio: "ignore" }).status === 0);
if (!node) {
  console.error("This app needs Node 24+ with node:sqlite. Install Node 24, reopen your terminal and run npm run dev again.");
  process.exit(1);
}
console.log("Starting Next.js with", node);
const result = spawnSync(node, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
