// An inventory check is not rights clearance. --release deliberately blocks
// distribution when the ledger lacks file-specific evidence.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
const media = (await Promise.all(["public", "source-assets", "src", "docs/art"].map(files))).flat()
  .filter((path) => /\.(png|webp|ogg|svg)$/.test(path)).sort();
const ledger = JSON.parse(await readFile("docs/overhaul/ASSET_PROVENANCE.json", "utf8"));
const failures = [];
const seen = new Set();
for (const path of media) {
  const entry = ledger.assets.find((asset) => asset.path === path);
  const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");
  if (!entry) failures.push(`Untracked media: ${path}`);
  else if (entry.sha256 !== sha256) failures.push(`Changed media needs provenance review: ${path}`);
}
for (const entry of ledger.assets) {
  if (seen.has(entry.path)) failures.push(`Duplicate ledger asset: ${entry.path}`);
  seen.add(entry.path);
  if (!media.includes(entry.path)) failures.push(`Missing ledger asset: ${entry.path}`);
  if (entry.distributed !== entry.path.startsWith("public/")) failures.push(`Distribution classification mismatch: ${entry.path}`);
  if (!["unverified", "cleared"].includes(entry.status)) failures.push(`Unknown clearance status: ${entry.path}`);
  if (entry.status === "cleared" && (!entry.author || !entry.license || !entry.evidence?.length)) failures.push(`Clearance evidence missing: ${entry.path}`);
  if (entry.status === "cleared") {
    for (const evidence of entry.evidence ?? []) {
      try { await readFile(evidence); }
      catch { failures.push(`Retained clearance record missing for ${entry.path}: ${evidence}`); }
    }
    for (const source of entry.derivedFrom ? [entry.derivedFrom].flat() : []) {
      if (ledger.assets.find((asset) => asset.path === source)?.status !== "cleared") failures.push(`Upstream source not cleared for ${entry.path}: ${source}`);
    }
  }
}
const unverified = ledger.assets.filter((entry) => entry.distributed && entry.status !== "cleared");
if (process.argv.includes("--release") && unverified.length) failures.push(`${unverified.length} distributed media files lack clearance`);
console.log(JSON.stringify({ inventoried: media.length, distributedUnverified: unverified.length,
  scope: "binary/vector media files; code-authored art and dependency notices also need release review", failures }, null, 2));
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
