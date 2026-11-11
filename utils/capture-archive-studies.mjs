import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evidenceMetadata } from './evidence-metadata.mjs';

// Additional art-direction studies use the existing fixtures followed by legal
// grid input. No camera, collision or production-game hook is added.
const output = process.env.ARCHIVE_STUDIES_OUTPUT || 'artifacts/phase02a/studies';
const source = process.env.ARCHIVE_STUDIES_SOURCE_REPORT;
const metadata = source ? JSON.parse(await readFile(source, 'utf8')) : await evidenceMetadata();
const report = { sourceHead: metadata.sourceHead, sourceTreeSha256: metadata.sourceTreeSha256,
  sourceHashes: metadata.sourceHashes, capturedAt: new Date().toISOString(), dpr: 1,
  method: 'Existing isolated room fixtures followed by real legal movement/turns; no proof of normal campaign progression.', captures: [], errors: [] };
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4196, strictPort: true } });
const browser = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu'] });
report.browser = browser.version();
const key = 'depths-of-the-fractured-mind.run.v1';
const directions = ['north', 'east', 'south', 'west'];
const roles = ['entrance','indexing','compressed-aisle','filing-gallery','drum-chamber','retrieval','restricted-evidence','damaged-storage','secret','exit'];
async function state(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, key); }
async function turn(page, direction) {
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
  let current = await state(page), turns = (directions.indexOf(direction) - directions.indexOf(current.location.direction) + 4) % 4;
  if (turns === 3) { await page.keyboard.press('q'); turns = 0; }
  for (let i=0;i<turns;i++) { await page.keyboard.press('e'); await page.waitForFunction(() => !window.__DUNGEON_DIAGNOSTICS__().moving); }
  await page.waitForFunction(() => !window.__DUNGEON_DIAGNOSTICS__().moving);
}
async function walk(page, target) {
  const current = await state(page), map = current.depthMaps.find(([d]) => d===2)[1];
  const queue = [{...current.location, path:[]}], seen = new Set([`${current.location.x},${current.location.y}`]);
  let route;
  for (const n of queue) {
    if(n.x===target.x && n.y===target.y){route=n.path;break;}
    for(const [dx,dy,dir] of [[0,-1,'north'],[1,0,'east'],[0,1,'south'],[-1,0,'west']]) {
      const x=n.x+dx,y=n.y+dy,t=map.tiles[y]?.[x],id=`${x},${y}`;
      if(t?.passable&&!t.locked&&!t.eventId&&!t.type.startsWith('stairs')&&!seen.has(id)){seen.add(id);queue.push({x,y,path:[...n.path,dir]});}
    }
  }
  if(!route) throw Error(`No safe study route to ${JSON.stringify(target)}`);
  for(const dir of route){
    await turn(page,dir); const before=(await state(page)).location;
    await page.keyboard.press('w');
    await page.waitForFunction(({key,before})=>{const l=JSON.parse(localStorage.getItem(key)).state.location;return l.x!==before.x||l.y!==before.y;},{key,before});
    await page.waitForFunction(()=>!window.__DUNGEON_DIAGNOSTICS__().moving);
  }
  await turn(page,target.direction);
}
async function fixture(page,seed,role,reduced=true){
  const ack=await page.evaluate(async ({seed,role,reduced})=>{const h=window.__THREE_GAME_TEST_HOOKS__;h.setReducedMotion(reduced);h.seed(seed);return h.setState(`archive-${role}`);},{seed,role,reduced});
  if(ack.state!==`archive-${role}`)throw Error('Unacknowledged state');
  await page.locator('.dungeon-viewport[data-ready="true"]').waitFor();
}
async function shot(page,name,seed,role,grayscale=false){
  await page.evaluate(grayscale=>{window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true);document.querySelector('#app').style.filter=grayscale?'grayscale(1)':'';},grayscale);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const path=`${name}.png`;await page.locator('.presence-stage').first().screenshot({path:`${output}/${path}`});
  const diagnostic=await page.evaluate(()=>({world:window.__DUNGEON_DIAGNOSTICS__(),presence:window.__PRESENCE_DIAGNOSTICS__()}));
  if(diagnostic.world.backend!=='webgl2'||diagnostic.world.assetErrors.length)throw Error('Invalid WebGL2 study');
  report.captures.push({name,path,seed,role,grayscale,viewport:page.viewportSize(),location:(await state(page)).location,sha256:createHash('sha256').update(await readFile(`${output}/${path}`)).digest('hex'),diagnostic});
  console.log(name);
}
try {
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:1,colorScheme:'dark',locale:'en-US',timezoneId:'UTC'}),page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto(`http://127.0.0.1:4196${server.config.base}?qa=1`);
    for(const role of roles){await fixture(page,130013,role);await shot(page,`${viewport.width}-gray-${role}`,130013,role,true);}
    await page.evaluate(()=>document.querySelector('#app').style.filter='');
    for(const seed of [130013,130014,73021])for(const role of ['filing-gallery','drum-chamber']){
      await fixture(page,seed,role);const current=await state(page),map=current.depthMaps.find(([d])=>d===2)[1],room=map.environment.rooms.find(r=>r.archetype===role),cx=Math.floor(room.x+room.width/2),cy=Math.floor(room.y+room.height/2);
      const targets=role==='drum-chamber'?[{x:cx,y:cy+2,direction:'north'},{x:cx-2,y:cy,direction:'east'},{x:cx,y:cy-2,direction:'south'},{x:cx+2,y:cy,direction:'west'}]:room.width>room.height?[{x:room.x,y:cy,direction:'east'},{x:room.x+room.width-1,y:cy,direction:'west'}]:[{x:cx,y:room.y,direction:'south'},{x:cx,y:room.y+room.height-1,direction:'north'}];
      for(let i=0;i<targets.length;i++){await walk(page,targets[i]);await shot(page,`${viewport.width}-${seed}-${role}-approach${i}`,seed,role);}
    }
    await context.close();
  }
} finally { await browser.close();await new Promise(r=>server.httpServer.close(r));await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n'); }
if(report.errors.length)process.exitCode=1;
