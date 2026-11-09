import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function files(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) =>
    entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
export async function evidenceMetadata() {
  const paths = [...await files("src"), "package.json", "package-lock.json", "vite.config.ts", "public/data/events.json"].sort();
  const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(path))])));
  return {
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceTreeSha256: hash(JSON.stringify(sourceHashes)), sourceHashes,
    environment: { node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
      os: platform(), kernel: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length,
      hostMemoryMiB: Math.round(totalmem() / 1048576) },
  };
}
