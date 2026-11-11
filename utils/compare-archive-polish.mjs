import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root=process.env.ARCHIVE_POLISH_ROOT||'artifacts/phase02a';
const before=JSON.parse(await readFile(`${root}/before/captures/report.json`));
const after=JSON.parse(await readFile(`${root}/final/captures/report.json`));
const roles=['entrance','indexing','compressed-aisle','filing-gallery','drum-chamber','retrieval','restricted-evidence','damaged-storage','secret','exit'];
const pairs=[];
for(const width of [1280,390])for(const motion of ['normal','reduced'])for(const role of roles){
 const name=`${width}-${motion}-${role}`,a=before.captures.find(c=>c.name===name),b=after.captures.find(c=>c.name===name);
 if(!a||!b)throw Error(`Missing matched room ${name}`);
 const identity=c=>JSON.stringify({camera:c.diagnostics.world.camera,location:c.diagnostics.world.authoritative,viewport:c.viewport,quality:c.diagnostics.world.quality,person:c.diagnostics.presence.person.id,reduced:c.diagnostics.presence.reducedMotion});
 if(identity(a)!==identity(b))throw Error(`Comparison conditions changed: ${name}`);
 if(a.diagnostics.world.backend!=='webgl2'||b.diagnostics.world.backend!=='webgl2')throw Error(`Wrong backend: ${name}`);
 pairs.push({name,role,width,motion,before:`before/captures/${a.world}`,after:`after/captures/${b.world}`,camera:b.diagnostics.world.camera,location:b.diagnostics.world.authoritative,viewport:b.viewport,quality:b.diagnostics.world.quality});
}
if(await readFile(`${root}/before/captures/room-purpose-ledger.json`,'utf8')!==await readFile(`${root}/final/captures/room-purpose-ledger.json`,'utf8'))throw Error('Saved semantic world identity changed');
const studyBefore=JSON.parse(await readFile(`${root}/before/studies/report.json`)),studyAfter=JSON.parse(await readFile(`${root}/final/studies/report.json`));
const studyPairs=studyBefore.captures.map(a=>{
 const b=studyAfter.captures.find(c=>c.name===a.name);
 const conditions=c=>JSON.stringify({camera:c.diagnostic.world.camera,location:c.location,viewport:c.viewport,seed:c.seed,quality:c.diagnostic.world.quality});
 if(!b||conditions(a)!==conditions(b))throw Error(`Study conditions changed: ${a.name}`);
 return {name:a.name,role:a.role,width:a.viewport.width,motion:a.grayscale?'grayscale':'study',before:`before/studies/${a.path}`,after:`after/studies/${b.path}`,location:b.location,seed:b.seed,quality:b.diagnostic.world.quality};
});
await mkdir(`${root}/comparisons`,{recursive:true});
await writeFile(`${root}/comparisons/matched-pairs.json`,JSON.stringify({seed:130013,dpr:1,conditions:'Exact camera, authoritative location, viewport, quality and protagonist checked; both actual hardware WebGL2. No image difference threshold is interpreted as artistic approval.',beforeSource:before.sourceTreeSha256,afterSource:after.sourceTreeSha256,pairs},null,2)+'\n');
await writeFile(`${root}/comparisons/study-pairs.json`,JSON.stringify({conditions:'Seed, camera, location, viewport and quality matched exactly',pairs:studyPairs},null,2)+'\n');
const rows=[...pairs,...studyPairs].map(p=>`<section data-role="${p.role}" data-width="${p.width}" data-motion="${p.motion}"><h2>${p.role} · ${p.width}px · ${p.motion}</h2><p>Seed${p.seed||130013} · DPR1 · (${p.location.x},${p.location.y}) ${p.location.direction} · ${p.quality}</p><div class="pair"><figure><img loading="lazy" src="../${p.before}" alt="Before: ${p.role}"><figcaption>Before · a55290f</figcaption></figure><figure><img loading="lazy" src="../${p.after}" alt="After: ${p.role}"><figcaption>After · uncommitted Phase02A candidate</figcaption></figure></div></section>`).join('\n');
await writeFile(`${root}/comparisons/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Archive matched visual review</title><style>body{margin:24px;background:#181b19;color:#d9d0b9;font:16px/1.5 system-ui}h1{font-size:24px}label{display:inline-block;margin:0 16px 16px 0}select{font:inherit;background:#2b3735;color:inherit;padding:8px}section{border-top:1px solid #59635a;padding:12px 0 24px}h2{font-size:18px}p{color:#c4b89c}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:6px 0}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><h1>The Archive · matched before/after</h1><p>Actual game renders. Human artistic approval: PENDING HUMAN REVIEW. Use native PNGs to inspect detail; this gallery does not certify quality.</p><label>Room <select id="role"><option value="all">All ten</option>${roles.map(r=>`<option>${r}</option>`).join('')}</select></label><label>Viewport <select id="width"><option>1280</option><option>390</option></select></label><label>Motion <select id="motion"><option>normal</option><option>reduced</option></select></label>${rows}<script>const selects=[...document.querySelectorAll('select')];function filter(){for(const s of document.querySelectorAll('section'))s.hidden=selects.some(el=>el.value!=='all'&&s.dataset[el.id]!==el.value)}for(const el of selects)el.onchange=filter;filter();</script></html>`);
// Add study modes without changing the declared regular room set.
const htmlPath=`${root}/comparisons/index.html`;
await writeFile(htmlPath,(await readFile(htmlPath,'utf8')).replace('<option>reduced</option>','<option>reduced</option><option>grayscale</option><option>study</option>'));
console.log(`${pairs.length} matched room pairs + ${studyPairs.length} study pairs; semantic world identity unchanged`);
