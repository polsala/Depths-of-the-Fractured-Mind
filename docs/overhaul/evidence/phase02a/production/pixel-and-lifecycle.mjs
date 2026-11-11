import { preview } from 'vite';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const root='artifacts/phase02a/final';
const roles=['entrance','indexing','compressed-aisle','filing-gallery','drum-chamber','retrieval','restricted-evidence','damaged-storage','secret','exit'];
const manifest={version:1,runId:'phase02a-final',captures:['desktop','mobile'].flatMap(mode=>roles.map(role=>({mode,state:`archive-${role}`,report:`${root}/pixel-inspector/${mode}-${role}.json`})))};
await writeFile(`${root}/pixel-manifest.json`,JSON.stringify(manifest,null,2));
const server=await preview({preview:{host:'127.0.0.1',port:4192,strictPort:true}});
try { const code=await new Promise((resolve,reject)=>{const p=spawn('node',['utils/inspect-presence-canvas.mjs'],{env:{...process.env,CAST_QA_MANIFEST:`${root}/pixel-manifest.json`,CAST_QA_URL:`http://127.0.0.1:4192${server.config.base}?qa=1`},stdio:'inherit'});p.on('error',reject);p.on('close',resolve);});if(code)throw Error(`Pixel inspection exit ${code}`); }
finally{await new Promise(r=>server.httpServer.close(r));}
// Reuse the Phase02 lifecycle/reflow probe without changing its assertions.
let probe=await readFile('artifacts/phase02/integration-probe.mjs','utf8');
probe=probe.replaceAll("'../../utils/evidence-metadata.mjs'","'../../utils/evidence-metadata.mjs'")
 .replaceAll('artifacts/phase02/integration-probe.json',`${root}/integration-probe.json`);
await writeFile('artifacts/phase02a/integration-probe.mjs',probe);
const code=await new Promise((resolve,reject)=>{const p=spawn('node',['artifacts/phase02a/integration-probe.mjs'],{stdio:'inherit'});p.on('error',reject);p.on('close',resolve);});process.exitCode=code;
