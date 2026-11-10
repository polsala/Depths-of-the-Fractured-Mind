// Explicit audit/update command, never part of an automatic build. Only the
// reviewed Phase-01B media chain can be added/replaced; legacy inputs stay as-is.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const base = "source-assets/characters/phase01b";
const ledgerPath = "docs/overhaul/ASSET_PROVENANCE.json";
const cast = JSON.parse(await readFile(`${base}/generation-record.json`));
const hands = JSON.parse(await readFile(`${base}/presence/generation.json`));
const ledger = JSON.parse(await readFile(ledgerPath));
const sha = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const records = new Map();
const assertHash = async (file, expected) => {
  if (await sha(file) !== expected) throw new Error(`Source record is stale: ${file}`);
};
for (const job of cast.jobs) {
  await assertHash(job.output, job.sha256);
  await assertHash(job.promptFile, job.promptFileSha256);
  for (const input of job.inputImages) await assertHash(input.path, input.sha256);
  records.set(job.output, job.inputImages.map((input) => input.path));
}
for (const entry of cast.derivatives) {
  await assertHash(entry.output, entry.sha256); await assertHash(entry.source, entry.sourceSha256);
  records.set(entry.output, [entry.source]);
}
for (const entry of hands.assets) {
  const source = `${base}/presence/${entry.source}`;
  await assertHash(source, entry.sha256);
  await assertHash(`${base}/presence/${entry.prompt}`, entry.promptSha256);
  const references = entry.references.map((input) => ({ ...input, path: path.posix.normalize(`${base}/presence/${input.path}`) }));
  for (const reference of references) await assertHash(reference.path, reference.sha256);
  records.set(source, references.map((input) => input.path));
  await assertHash(entry.runtime, entry.runtimeSha256);
  records.set(entry.runtime, [source]);
}
const heroAtlases = Object.keys(JSON.parse(await readFile("src/assets/hero-atlas-contract.json")).characters)
  .map((id) => `public/assets/sprites/characters/${id}/hero-atlas.png`);
records.set("docs/art/hero-reference-phase01b.png", heroAtlases);

async function pngs(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) output.push(...await pngs(file));
    else if (file.endsWith(".png")) output.push(file);
  }
  return output;
}
for (const file of await pngs(base)) if (!records.has(file)) throw new Error(`Unrecorded Phase-01B source PNG: ${file}`);
for (const [file, sources] of records) for (const source of sources) {
  if (!records.has(source) && ledger.assets.find((entry) => entry.path === source)?.status !== "cleared") {
    throw new Error(`Uncleared upstream source for ${file}: ${source}`);
  }
}
const evidence = [`${base}/generation-record.json`, `${base}/presence/generation.json`, `${base}/PROVENANCE.md`, `${base}/terms-support.json`, `${base}/metadata-observations.json`];
for (const file of evidence) await readFile(file);
let added = 0, replaced = 0;
for (const [file, sources] of [...records].sort(([a], [b]) => a.localeCompare(b))) {
  const old = ledger.assets.find((entry) => entry.path === file);
  const hash = await sha(file);
  const entry = { path: file, sha256: hash, distributed: file.startsWith("public/"), derivedFrom: sources,
    status: "cleared", author: "OpenAI built-in image_gen service; original project direction by repository owner/Codex",
    license: "OpenAI output ownership terms; project use/distribution under retained Europe Terms of Use / Services Agreement",
    evidence,
    note: "Recorded original-input source chain and current official provider output terms support project use/distribution to the extent permitted by law. No legacy media was submitted. Human artistic/acting acceptance remains open; backend model/seed/cost not exposed; no exclusivity or copyright-eligibility claim." };
  if (old) {
    const history = old.supersededRecords ?? [];
    if (old.sha256 !== hash) {
      const { supersededRecords, ...prior } = old;
      entry.supersededRecords = [...history, { ...prior, supersededAt: "2026-11-10", reason: "Replaced by the separately documented original-input Phase-01B derivative. Prior source/status is preserved, not retroactively cleared." }];
      replaced++;
    } else if (history.length) entry.supersededRecords = history;
    ledger.assets[ledger.assets.indexOf(old)] = entry;
  } else { ledger.assets.push(entry); added++; }
}
ledger.phase01bCharacterCandidates = { date: "2026-11-10", record: `${base}/generation-record.json`,
  presenceRecord: `${base}/presence/generation.json`, rightsRecord: `${base}/PROVENANCE.md`, termsRecord: `${base}/terms-support.json`,
  status: "Recorded original-input family and provider-use/distribution basis; human artistic/acting acceptance pending; backend model/seed/cost not exposed",
  legacyPolicy: "Retained legacy source media and contact sheet keep their prior unverified status. Replaced runtime atlas records retain the complete prior record in supersededRecords. Public release remains blocked by remaining unverified media." };
await writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
console.log(JSON.stringify({ reviewedPhase01bFiles: records.size, added, replaced, distributedUnverified: ledger.assets.filter((entry) => entry.distributed && entry.status !== "cleared").length }));
