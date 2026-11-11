import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, cp } from 'node:fs/promises';
const root='artifacts/phase02a/final'; await mkdir(root,{recursive:true});
const hardware={DUNGEON_BROWSER_CHANNEL:'chromium',DUNGEON_ENABLE_GPU:'1'};
const jobs=[
 {name:'build',args:['run','build']},
 {name:'archive',args:['run','capture:archive'],env:{...hardware,ARCHIVE_OUTPUT:`${root}/captures`}},
 {name:'studies',bin:'node',args:['utils/capture-archive-studies.mjs'],env:{ARCHIVE_STUDIES_OUTPUT:`${root}/studies`}},
 {name:'typecheck',args:['run','typecheck']},
 {name:'units',args:['test']},
 {name:'seeds',args:['run','validate:archive']},
 {name:'provenance',args:['run','assets:provenance']},
 {name:'security',args:['run','audit:security']},
 {name:'smoke',args:['run','test:smoke'],env:{...hardware,RECORD_ARCHIVE:'1'}},
 {name:'baseline',args:['run','baseline:capture'],env:{...hardware,BASELINE_OUTPUT:`${root}/baseline`}},
 {name:'golden',args:['run','capture:golden'],env:{...hardware,GOLDEN_OUTPUT:`${root}/golden`}},
 {name:'characters',args:['run','capture:characters'],env:{...hardware,CHARACTER_OUTPUT:`${root}/characters`}},
 {name:'presence',args:['run','capture:presence'],env:{...hardware,PRESENCE_OUTPUT:`${root}/presence`}},
 {name:'performance-archive',args:['run','bench:dungeon'],env:{...hardware,DUNGEON_SCENE:'archive',DUNGEON_BENCH_OUTPUT:`${root}/performance-archive`}},
 {name:'performance-intake',args:['run','bench:dungeon'],env:{...hardware,DUNGEON_BENCH_OUTPUT:`${root}/performance-intake`}},
 {name:'combat',args:['run','bench:combat']},
];
const ledger=[];
for(const job of jobs){
 const startedAt=new Date().toISOString(),log=`${root}/${job.name}.log`,stream=createWriteStream(log);
 console.log(`Running ${job.name}`);
 const exitCode=await new Promise((resolve,reject)=>{const p=spawn(job.bin||'npm',job.args,{env:{...process.env,...job.env},stdio:['ignore','pipe','pipe']});p.stdout.pipe(stream,{end:false});p.stderr.pipe(stream,{end:false});p.on('error',reject);p.on('close',resolve);});
 await new Promise(r=>stream.end(r));
 ledger.push({...job,command:[job.bin||'npm',...job.args].join(' '),startedAt,completedAt:new Date().toISOString(),exitCode,log});
 await writeFile(`${root}/command-results.json`,JSON.stringify(ledger,null,2)+'\n');console.log(`Finished ${job.name}: ${exitCode}`);
 if(job.name==='smoke')await cp('test-results',`${root}/browser`,{recursive:true});
 if(job.name==='seeds')await cp('artifacts/phase02/seed-validation',`${root}/seeds`,{recursive:true});
}
if(ledger.some(j=>j.exitCode!==0))process.exitCode=1;
