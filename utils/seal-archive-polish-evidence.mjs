import { mkdir, readFile, writeFile, readdir, cp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { evidenceMetadata } from './evidence-metadata.mjs';

const root='artifacts/phase02a', final=`${root}/final`, target='docs/overhaul/evidence/phase02a';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const commands=await json(`${final}/command-results.json`),captures=await json(`${final}/captures/report.json`),studies=await json(`${final}/studies/report.json`);
if(commands.length!==16||commands.some(c=>c.exitCode!==0))throw Error('Required command set is incomplete or failed');
if(captures.captures.length!==82||captures.errors.length||captures.failures.length||studies.captures.length!==56||studies.errors.length)throw Error('Capture set incomplete or failed');
const current=await evidenceMetadata();if(current.sourceTreeSha256!==captures.sourceTreeSha256)throw Error('Source changed after final captures');
const archive=await json(`${final}/performance-archive/report.json`),intake=await json(`${final}/performance-intake/report.json`),seeds=await json(`${final}/seeds/seed-validation.json`),integration=await json(`${final}/integration-probe.json`);
if(seeds.count!==1000||seeds.failed!==0)throw Error('Extended seed sweep incomplete');
for(const report of [archive,intake])for(const profile of report.profiles){
 if(report.sourceTreeSha256!==current.sourceTreeSha256||profile.diagnostics.backend!=='webgl2'||profile.errors?.length||profile.diagnostics.assetErrors.length)throw Error('Invalid benchmark source/backend/errors');
 if(profile.diagnostics.p95FrameMs>(profile.cpu===1?20:40))throw Error('Unchanged frame budget exceeded');
}
if(integration.cycles.length!==10||integration.cycles.some(c=>c.world.lifecycle.active!==1||c.presence.lifecycle.active!==1))throw Error('Lifecycle check incomplete');
const pixelManifest=await json(`${final}/pixel-manifest.json`);
if(pixelManifest.captures.length!==20)throw Error('Pixel inspection coverage incomplete');
for(const pair of pixelManifest.captures){const r=await json(pair.report);if(!r.result?.ok||r.consoleErrorCount||r.pageErrorCount||r.sourceTreeSha256!==current.sourceTreeSha256)throw Error(`Invalid pixel report ${pair.report}`);}
const preserved=['src/game','src/graphics/presence','src/graphics/combat-presentation.ts','src/graphics/dungeon/CameraRig.ts','src/ui/presence-view.ts','src/ui/presence.css','src/assets','public/assets/sprites','source-assets/characters','tests/fixtures/saves/v1','docs/overhaul/evidence/phase01','docs/overhaul/evidence/phase01-art-approval','docs/overhaul/evidence/phase01b','docs/overhaul/evidence/phase02'];
execFileSync('git',['diff','--exit-code','a55290f','--',...preserved],{stdio:'pipe'});
const fixturePaths=execFileSync('git',['ls-files','tests/fixtures/saves/v1'],{encoding:'utf8'}).trim().split('\n');
const frozenFixtureHashes={};for(const path of fixturePaths){const bytes=await readFile(path);if(sha(bytes)!==sha(execFileSync('git',['show',`a55290f:${path}`])))throw Error(`Historical fixture changed ${path}`);frozenFixtureHashes[path]=sha(bytes);}
const files=[];
async function copyFile(from,to){await mkdir(to.slice(0,to.lastIndexOf('/')),{recursive:true});await cp(from,to);files.push({path:to.slice(target.length+1),sha256:sha(await readFile(to))});}
async function topFiles(from,to){for(const e of await readdir(from,{withFileTypes:true}))if(e.isFile())await copyFile(`${from}/${e.name}`,`${to}/${e.name}`);}
await topFiles(`${root}/before/captures`,`${target}/before/captures`);await topFiles(`${root}/before/studies`,`${target}/before/studies`);
await topFiles(`${final}/captures`,`${target}/after/captures`);await topFiles(`${final}/studies`,`${target}/after/studies`);await topFiles(`${root}/comparisons`,`${target}/comparisons`);
await topFiles(`${final}/inspection`,`${target}/inspection`);
const journey=(await readdir(`${final}/browser`)).find(p=>p.startsWith('archive-journey-normal-'));
await topFiles(`${final}/browser/${journey}`,`${target}/journey`);
for(const name of ['baseline','golden','characters','presence','performance-archive','performance-intake'])await copyFile(`${final}/${name}/report.json`,`${target}/reports/${name}.json`);
await topFiles(`${final}/pixel-inspector`,`${target}/pixel-inspector`);
for(const name of ['integration-probe','independent-visual-review','lead-inspection','quality-review','defect-resolution','pixel-manifest','command-results'])await copyFile(`${final}/${name}.json`,`${target}/reports/${name}.json`);
await topFiles(`${final}/seeds`,`${target}/seeds`);
// Raw bytes retain their content. .txt avoids the *.log pattern, but the
// repository also ignores directories named logs: explicitly force-add this
// milestone's logs directory during an authorized commit and check the manifest.
for(const entry of commands)await copyFile(entry.log,`${target}/logs/${entry.name}.txt`);
await copyFile(`${final}/pixel-and-lifecycle.log`,`${target}/logs/pixel-and-lifecycle.txt`);
for(const name of ['evidence-check','tooling-limitations'])await copyFile(`${final}/${name}.txt`,`${target}/logs/${name}.txt`);
for(const name of ['build','capture','studies'])await copyFile(`${root}/before/${name}.log`,`${target}/logs/before-${name}.txt`);
await copyFile(`${root}/defect-ledger.json`,`${target}/defect-ledger.json`);
for(const name of ['material-notes','lighting-notes','composition-notes'])await copyFile(`${root}/${name}.md`,`${target}/production/${name}.md`);
for(const name of ['verify','pixel-and-lifecycle','integration-probe'])await copyFile(`${root}/${name}.mjs`,`${target}/production/${name}.mjs`);
for(const [iteration,scene] of [['iteration1','entrance'],['iteration1','filing-gallery'],['iteration1','drum-chamber'],['review2','secret'],['review2','drum-chamber']])await copyFile(`${root}/${iteration}/captures/1280-normal-${scene}-world.png`,`${target}/rejected/${iteration}-${scene}.png`);
for(const name of ['iteration1','review2'])await copyFile(`${root}/${name}/captures/report.json`,`${target}/rejected/${name}-report.json`);
for(const name of ['generation.json','build-manifest.json','terms-support.json'])await copyFile(`source-assets/environments/archive-phase02a/${name}`,`${target}/materials/${name}`);
await copyFile(`${root}/material-build.json`,`${target}/materials/build-output.json`);
const portable={...pixelManifest,captures:pixelManifest.captures.map(c=>({...c,report:`${target}/pixel-inspector/${c.report.split('/').at(-1)}`}))};
await writeFile(`${target}/pixel-review-manifest.json`,JSON.stringify(portable,null,2)+'\n');
files.push({path:'pixel-review-manifest.json',sha256:sha(await readFile(`${target}/pixel-review-manifest.json`))});
const buildManifest=Object.entries(captures.buildHashes).sort(([a],[b])=>a.localeCompare(b));
const manifest={version:1,phase:'02A',baselineHead:'a55290ff3755ae802c547d630593870d59514934',initialBranch:'main',initialWorkingTree:'clean',sealedAt:new Date().toISOString(),...current,
 buildManifestSha256:sha(JSON.stringify(buildManifest)),buildHashes:captures.buildHashes,frozenFixtureHashes,preservedSourcePaths:preserved,
 captures:82,studies:56,matchedRoomPairs:40,matchedStudyPairs:56,pixelPairs:20,commandCount:commands.length,
 sealUtilitySha256:sha(await readFile(import.meta.filename)),files};
await writeFile(`${target}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:files.length,source:current.sourceTreeSha256,build:manifest.buildManifestSha256,fixtures:fixturePaths.length,commands:commands.length}));
