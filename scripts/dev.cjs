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
function supportsSqlite(path) {
  return path && existsSync(path) &&
    spawnSync(path, ["-e", check], { stdio: "ignore" }).status === 0;
}
let node = [...binaries].find(supportsSqlite);
if (!node) {
  // An installed fnm version is outside PATH until the shell initializes fnm.
  const lookup = spawnSync("fnm", ["exec", "--using=24", "node", "-p", "process.execPath"], {
    encoding: "utf8",
  });
  const installed = lookup.stdout?.trim();
  if (lookup.status === 0 && supportsSqlite(installed)) node = installed;
}
if (!node) {
  console.error(`npm started with Node ${process.version} at ${process.execPath}. No SQLite-capable Node 24+ was found on PATH or via fnm. With fnm, run "fnm install 24", then "npm run dev".`);
  process.exit(1);
}
console.log("Starting Next.js with", node);
const result = spawnSync(node, [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
