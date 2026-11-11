import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Preserve reviewed Phase02 evidence separately from repeat-run artifacts.
// Refuse stale source/build inputs instead of relabeling historical captures.
const destination = 'docs/overhaul/evidence/phase02';
const captureRoot = 'artifacts/phase02/final-verified';
const digest = data => createHash('sha256').update(data).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const source = await readJson(`${captureRoot}/report.json`);
if (source.errors.length || source.failures.length || source.captures.length !== 82) throw Error('Archive capture set is incomplete or failed');
for (const [path, expected] of Object.entries(source.sourceHashes)) {
  if (digest(await readFile(path)) !== expected) throw Error(`Stale capture source: ${path}`);
}
for (const [path, expected] of Object.entries(source.buildHashes)) {
  if (digest(await readFile(path)) !== expected) throw Error(`Stale capture build: ${path}`);
}
const ledger = await readJson('artifacts/phase02/remaining-command-results.json');
if (ledger.length !== 11 || ledger.some(job => job.exitCode !== 0)) throw Error('Required final verification jobs did not all pass');
const corpus = await readJson('tests/fixtures/saves/v1/manifest.json');
const frozenFixtureHashes = {};
for (const fixture of corpus.files) {
  const path = `tests/fixtures/saves/v1/${fixture.path}`;
  const actual = digest(await readFile(path));
  if (actual !== fixture.sha256) throw Error(`Immutable fixture changed: ${path}`);
  frozenFixtureHashes[path] = actual;
}
if (digest(await readFile('src/game/exploration/map-generator.ts')) !== digest(execFileSync('git', ['show', 'HEAD:src/game/exploration/map-generator.ts']))) throw Error('Legacy generator changed');
const integration = await readJson('artifacts/phase02/integration-probe.json');
if (integration.cycles.length !== 10 || integration.cycles.some(cycle => cycle.world.lifecycle.active !== 1 || cycle.presence.lifecycle.active !== 1) || !integration.background.saveUnchanged) throw Error('Integration diagnostics failed');
for (const name of ['desktop', 'mobile']) {
  const report = await readJson(`artifacts/phase02/pixel-inspector/${name}.json`);
  if (!report.result?.ok || report.consoleErrorCount || report.pageErrorCount) throw Error(`Pixel inspection failed: ${name}`);
}
const copied = {};
const rejectedEntry = `${destination}/rejected/underlit-entry.png`;
copied['rejected/underlit-entry.png'] = { sha256: digest(await readFile(rejectedEntry)), bytes: (await stat(rejectedEntry)).size };
async function retain(from, relative) {
  const to = `${destination}/${relative}`;
  await mkdir(to.slice(0, to.lastIndexOf('/')), { recursive: true });
  await copyFile(from, to);
  copied[relative] = { sha256: digest(await readFile(to)), bytes: (await stat(to)).size };
}
await retain(`${captureRoot}/report.json`, 'captures/report.json');
for (const capture of source.captures) {
  await retain(`${captureRoot}/${capture.path}`, `captures/${capture.path}`);
  await retain(`${captureRoot}/${capture.world}`, `captures/${capture.world}`);
}
for (const motion of source.motion) await retain(`${captureRoot}/${motion.path}`, `motion/${motion.path}`);
for (const file of ['archive-seed130013-map.svg', 'progression-graph.mmd', 'room-purpose-ledger.json']) await retain(`${captureRoot}/${file}`, `world/${file}`);
for (const file of await readdir('artifacts/phase02/seed-validation')) await retain(`artifacts/phase02/seed-validation/${file}`, `seeds/${file}`);
await retain('artifacts/phase02/remaining-command-results.json', 'command-results.json');
for (const job of ledger) await retain(job.log, `logs/${job.name}.log`);
await retain('artifacts/phase02/smoke-final.log', 'rejected/title-poll-browser-failure.log');
await retain('artifacts/phase02/presence-regression.log', 'logs/presence-regression.log');
await retain('artifacts/phase02/build-final.log', 'logs/standalone-build.log');
await retain('artifacts/phase02/provenance-final.log', 'logs/provenance.log');
await retain('artifacts/phase02/security-final.log', 'logs/security.log');
await retain('artifacts/phase02/security-sandbox-network.log', 'rejected/security-sandbox-network.log');
for (const name of ['baseline-verified', 'golden-verified', 'characters-verified', 'presence-verified', 'performance-intake', 'performance-archive']) {
  await retain(`artifacts/phase02/${name}/report.json`, `reports/${name}.json`);
}
await retain('artifacts/phase02/integration-probe.json', 'reports/integration-probe.json');
await retain('artifacts/phase02/integration-probe.log', 'logs/integration-probe.log');
await retain('artifacts/phase02/pixel-inspection.log', 'logs/pixel-inspection.log');
for (const file of await readdir('artifacts/phase02/rejected-inspector')) await retain(`artifacts/phase02/rejected-inspector/${file}`, `rejected/inspector/${file}`);
await retain('artifacts/phase02/pixel-manifest.json', 'reports/pixel-manifest.json');
for (const file of await readdir('artifacts/phase02/pixel-inspector')) await retain(`artifacts/phase02/pixel-inspector/${file}`, `pixel-inspector/${file}`);
const journey = 'test-results/archive-journey-normal-new-0237d-eserves-its-world-on-reload';
for (const file of await readdir(journey)) if (/\.(json|png|webm)$/.test(file)) await retain(`${journey}/${file}`, `journey/${file}`);
for (const file of ['generation-notes.md', 'environment-notes.md', 'qa-skill-notes.md']) await retain(`artifacts/phase02/${file}`, `production/${file}`);
const manifest = {
  schemaVersion: 1, sealedAt: new Date().toISOString(), sourceHead: source.sourceHead,
  sourceTreeSha256: source.sourceTreeSha256, sourceHashes: source.sourceHashes,
  buildHashes: source.buildHashes, buildManifestSha256: digest(JSON.stringify(Object.entries(source.buildHashes).sort())),
  frozenFixtureHashes,
  environment: source.environment, browser: source.browser, seed: 130013, dpr: 1,
  initialWorkingTree: 'clean main at 96a2d0aae7c3384379885624d6df687275e5db5f',
  sealUtilitySha256: digest(await readFile(import.meta.filename)),
  changedTrackedFiles: execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim().split('\n'),
  files: copied,
  limitations: 'Automation and sampled direct visual/motion-frame inspection do not certify human art approval, fun, physical phones, listening, screen readers, long-session process/GPU memory or legacy media rights. See README.md and PHASE02_VALIDATION.md.'
};
await writeFile(`${destination}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ destination, files: Object.keys(copied).length, sourceTreeSha256: manifest.sourceTreeSha256, buildManifestSha256: manifest.buildManifestSha256 }));
