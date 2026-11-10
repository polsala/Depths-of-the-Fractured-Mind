import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const output = "docs/overhaul/evidence/phase01b";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const current = await evidenceMetadata();
async function retain(source, destination) {
  if (!source.endsWith(".log")) { await copyFile(source, destination); return; }
  const original = await readFile(source);
  // Keep exact tool bytes as well as a diff-clean readable representation.
  await writeFile(`${destination}.gz`, gzipSync(original));
  await writeFile(destination, original.toString("utf8").replace(/[\t ]+$/gm, "").trimEnd() + "\n");
}
const records = [
  ["artifacts/phase01b/palette-reviewed", "browser", true],
  ["artifacts/phase01b/motion-reviewed", "motion", false],
  ["artifacts/phase01b/portraits-final", "portraits", true],
  ["artifacts/phase01b/baseline-final", "baseline", false],
  ["artifacts/phase01b/performance-hardware", "performance", true],
];
await mkdir(output, { recursive: true });
const reuse = [];
for (const [source, target, exact] of records) {
  const report = JSON.parse(await readFile(`${source}/report.json`));
  if (report.errors?.length || report.failures?.length) throw new Error(`Cannot seal failed evidence: ${source}`);
  if (report.profiles?.some((profile) => profile.errors?.length || profile.diagnostics?.backend !== "webgl2")) throw new Error(`Failed benchmark profile: ${source}`);
  const expectedCount = { browser: ["captures", 60], motion: ["samples", 80], portraits: ["captures", 6], baseline: ["captures", 6], performance: ["profiles", 2] }[target];
  if (report[expectedCount[0]]?.length !== expectedCount[1]) throw new Error(`Incomplete capture set: ${source}`);
  const differences = Object.keys(current.sourceHashes).filter((path) => report.sourceHashes?.[path] !== current.sourceHashes[path]);
  if (exact && report.sourceTreeSha256 !== current.sourceTreeSha256) throw new Error(`Capture source mismatch: ${source}`);
  if (!exact && differences.length) {
    // Body motion does not import/render the Party vitals Canvas. Its only
    // permitted reuse delta is the later scoped color correction in that file.
    if (target !== "motion" || differences.some((path) => path !== "src/graphics/party-ui.ts")) throw new Error(`Unreviewed reuse delta: ${source}/${differences}`);
    reuse.push({ report: `${target}/report.json`, differences, scope: "Same hero atlases, clip selectors, WebGL/combat renderers and controls. Later Party vitals color-only correction is unused in isolated body-motion fixtures.", originalSourceTreeSha256: report.sourceTreeSha256 });
  }
  await mkdir(`${output}/${target}`, { recursive: true });
  for (const name of await readdir(source)) {
    if (/\.(png|webm|json)$/.test(name)) await copyFile(`${source}/${name}`, `${output}/${target}/${name}`);
  }
}
await mkdir(`${output}/validation`, { recursive: true });
for (const name of ["unit-reviewed.log", "smoke-hardware.log", "combat-benchmark.log", "audit-final.log", "provenance-final.log", "vitals-contrast.json"]) {
  await retain(`artifacts/phase01b/${name}`, `${output}/validation/${name}`);
}
for (const name of ["desktop.json", "desktop.png", "mobile.json", "mobile.png"]) {
  await mkdir(`${output}/inspector`, { recursive: true });
  await copyFile(`artifacts/phase01b/inspector/${name}`, `${output}/inspector/${name}`);
}
await copyFile("artifacts/phase01b/inspector-manifest.json", `${output}/inspector/manifest.json`);
for (const name of ["portrait-expression-review.png", "presence-preview.png", "hero-raster-report.json", "presence-asset-report.json", "forge-doctor.json"]) {
  await copyFile(`artifacts/phase01b/${name}`, `${output}/${name}`);
}
await mkdir(`${output}/rejected`, { recursive: true });
for (const [source, name] of [
  ["artifacts/phase01b/pass-1/report.json", "selector-label-failure.json"],
  ["artifacts/phase01b/portrait-states/report.json", "portrait-fixture-failure.json"],
  ["artifacts/phase01b/current/report.json", "interrupted-software-capture.json"],
  ["artifacts/phase01b/presence-elias-spill/sheet-qc.json", "raw-hand-spill.json"],
  ["artifacts/phase01b/smoke-reviewed.log", "parallel-smoke.log"],
  ["artifacts/phase01b/smoke-serial.log", "interrupted-serial-smoke.log"],
  ["artifacts/phase01b/inspector-bootstrap-failure.json", "inspector-bootstrap-failure.json"],
]) await retain(source, `${output}/rejected/${name}`);
await writeFile(`${output}/reuse-record.json`, JSON.stringify(reuse, null, 2) + "\n");
const changed = execFileSync("git", ["diff", "HEAD", "--name-only"], { encoding: "utf8" }).trim().split("\n");
const added = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }).trim().split("\n");
const paths = [...new Set([...changed, ...added])].filter((path) => path && !path.startsWith(`${output}/`)).sort();
const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(path))])));
await writeFile(`${output}/source-manifest.json`, JSON.stringify({ ...current, changedFileHashes: sourceHashes,
  immutableFixturesChanged: changed.some((path) => path.startsWith("tests/fixtures/saves/v1/")),
  note: "Pre-commit verification. Source HEAD records the initial parent; a later local development commit may retain this tree. Capture reports retain their exact tested source/build hashes." }, null, 2) + "\n");
if (changed.some((path) => path.startsWith("tests/fixtures/saves/v1/"))) throw new Error("Immutable save fixtures changed");
async function files(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))).flat(); }
const evidence = (await files(output)).filter((path) => !path.endsWith("/evidence-sha256.json"));
await writeFile(`${output}/evidence-sha256.json`, JSON.stringify(Object.fromEntries(await Promise.all(evidence.map(async (path) => [path.slice(output.length + 1), hash(await readFile(path))]))), null, 2) + "\n");
console.log(JSON.stringify({ files: evidence.length, sourceTreeSha256: current.sourceTreeSha256, scopedReuse: reuse, immutableFixturesChanged: false }));
