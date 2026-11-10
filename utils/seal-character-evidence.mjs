import { readFile, readdir, writeFile, copyFile, cp, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const output = "docs/overhaul/evidence/phase01-art-approval";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => entry.isDirectory()
    ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))).flat();
}
const metadata = await evidenceMetadata();
const art = JSON.parse(await readFile("artifacts/phase01-art/current/report.json"));
const legacy = JSON.parse(await readFile("artifacts/phase01-art/legacy/report.json"));
const performance = JSON.parse(await readFile("artifacts/phase01-art/performance-hardware/report.json"));
if (art.sourceTreeSha256 !== metadata.sourceTreeSha256 || performance.sourceTreeSha256 !== metadata.sourceTreeSha256) throw new Error("Character/timing source differs from current source");
if (art.errors.length || art.failures.length || art.captures.length !== 28 || art.videos.length !== 2) throw new Error("Incomplete character evidence");
if (legacy.failures.length || legacy.captures.length !== 6 || Object.entries(metadata.sourceHashes).some(([path, digest]) => legacy.sourceHashes[path] !== digest)) throw new Error("Legacy baseline source/error mismatch");
if (performance.profiles.length !== 2 || performance.profiles.some((profile) => profile.errors.length
  || !profile.diagnostics.gpu.renderer.includes("Intel") || profile.diagnostics.samples < 1000
  || profile.waypointsReached.length < 5
  || profile.diagnostics.p95FrameMs > (profile.cpu === 1 ? 20 : 40))) throw new Error("Measured hardware frame gate failed; retain the report and document the failure");

const unchangedPaths = ["src/game", "public/data/events.json", "tests/fixtures/saves/v1", "src/assets/hero-atlas-contract.json",
  "source-assets/assets/sprites/characters", ...["elias", "miriam", "subject13", "anya"].map((id) => `public/assets/sprites/characters/${id}`)];
const protectedChanges = execFileSync("git", ["diff", "--name-only", "fbb383c", "--", ...unchangedPaths], { encoding: "utf8" }).trim();
if (protectedChanges) throw new Error(`Out-of-scope changes: ${protectedChanges}`);
await mkdir(output, { recursive: true });
await cp("artifacts/phase01-art/current", `${output}/captures`, { recursive: true, filter: (source) => !source.includes("/video") });
await cp("artifacts/phase01-art/legacy", `${output}/legacy`, { recursive: true });
for (const [source, dest] of [
  ["artifacts/phase01-art/performance-hardware/report.json", "performance-hardware.json"],
  ["artifacts/phase01-art/alpha-backgrounds.png", "alpha-backgrounds.png"],
  ["artifacts/phase01-art/keeper-motion-sampled.png", "keeper-motion-sampled.png"],
  ["artifacts/phase01-art/guard-motion-sampled.png", "guard-motion-sampled.png"],
  ["artifacts/phase01-art/review-overview-1280.png", "review-overview-1280.png"],
  ["artifacts/phase01-art/review-overview-390.png", "review-overview-390.png"],
]) await copyFile(source, `${output}/${dest}`);
for (const [source, dest] of [
  ["/tmp/depths-phase01a-unit.log", "unit.txt"], ["/tmp/depths-phase01a-browser.log", "browser.txt"],
  ["/tmp/depths-phase01a-character-capture.log", "character-capture.txt"],
  ["/tmp/depths-phase01a-character-check.log", "character-check.txt"],
  ["/tmp/depths-phase01a-baseline.log", "baseline.txt"], ["/tmp/depths-phase01a-combat-benchmark.log", "combat-benchmark.txt"],
  ["/tmp/depths-phase01a-performance-hardware.log", "performance-hardware.txt"],
  ["/tmp/depths-phase01a-provenance.log", "provenance.txt"], ["/tmp/depths-phase01a-rights-blocked.log", "rights-release-blocked.txt"],
  ["/tmp/depths-phase01a-final-art-browser.log", "final-art-browser.txt"],
]) {
  const log = (await readFile(source, "utf8")).split(/\r?\n/).map((line) => line.trimEnd()).join("\n").trimEnd() + "\n";
  await writeFile(`${output}/${dest}`, log);
}
const extra = [...await files("source-assets/characters/phase01a"), ...await files("tests"), ...await files("utils"),
  ...await files(".github/workflows"), "AGENTS.md", "playwright.config.ts", "docs/overhaul/ART_DIRECTION.md",
  "docs/overhaul/CHARACTER_ART_STANDARD.md", "docs/overhaul/QUALITY_GATES.md", "docs/overhaul/PROGRESS.md", "docs/overhaul/ASSET_PROVENANCE.json"];
const validationHashes = Object.fromEntries(await Promise.all(extra.sort().map(async (path) => [path, hash(await readFile(path))])));
const buildHashes = Object.fromEntries(await Promise.all((await files("dist")).sort().map(async (path) => [path, hash(await readFile(path))])));
await writeFile(`${output}/source-manifest.json`, JSON.stringify({ ...metadata, runtimeAssets: art.runtimeAssets,
  validationHashes, buildHashes, buildTreeSha256: hash(JSON.stringify(buildHashes)), protectedChanges,
  scope: "character art/animation/presentation only; existing heroes/rules/events/v1 saves unchanged",
  disposition: "human art acceptance pending; new pair provider-use provenance documented; legacy distribution rights unverified", logs: "content retained; trailing whitespace normalized" }, null, 2) + "\n");
const evidence = (await files(output)).filter((path) => !path.endsWith("/SHA256SUMS.json")).sort();
await writeFile(`${output}/SHA256SUMS.json`, JSON.stringify(Object.fromEntries(await Promise.all(evidence.map(async (path) => [path.slice(output.length + 1), hash(await readFile(path))]))), null, 2) + "\n");
console.log(JSON.stringify({ source: metadata.sourceTreeSha256, files: evidence.length,
  technicalEvidence: "retained", humanArtApproval: "pending", publicDistribution: "blocked" }));
