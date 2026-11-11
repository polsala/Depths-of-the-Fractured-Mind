import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { evidenceMetadata } from './evidence-metadata.mjs';

const output = process.env.ARCHIVE_OUTPUT || 'artifacts/phase02/current';
const hardware = process.argv.includes('--hardware');
const channel = process.env.DUNGEON_BROWSER_CHANNEL || (hardware ? 'chromium' : undefined);
const args = hardware || process.env.DUNGEON_ENABLE_GPU === '1' ? ['--enable-gpu'] : [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const key = 'depths-of-the-fractured-mind.run.v1';
const rooms = ['entrance', 'indexing', 'compressed-aisle', 'filing-gallery', 'drum-chamber', 'retrieval', 'restricted-evidence', 'damaged-storage', 'secret', 'exit'];
const heroes = ['elias', 'miriam', 'subject13', 'anya'];
const report = { ...await evidenceMetadata(), capturedAt: new Date().toISOString(), browser: null, channel: channel || 'headless-shell', args, seed: 130013, dpr: 1,
  method: 'Archive room snapshots are isolated qa=1 fixtures; portrait selections and interactions use real UI. Motion starts from an isolated entrance and uses connected legal grid input. These fixtures do not prove normal campaign progression.',
  utilitySha256: hash(await readFile(import.meta.filename)), buildHashes: {}, captures: [], motion: [], resources: [], errors: [], failures: [] };
async function files(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat(); }
for (const path of await files('dist')) report.buildHashes[path] = hash(await readFile(path));
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4188, strictPort: true } });
const browser = await chromium.launch({ headless: true, channel, args }); report.browser = browser.version();
const url = `http://127.0.0.1:4188${server.config.base}?qa=1`;
function observe(page, label) {
  page.on('pageerror', e => report.errors.push({ label, type: 'page', message: e.message }));
  page.on('console', m => { if (m.type() === 'error') report.errors.push({ label, type: 'console', message: m.text() }); });
  page.on('response', r => { if (r.status() >= 400) report.errors.push({ label, type: 'http', status: r.status(), url: r.url() }); });
  page.on('requestfailed', r => report.errors.push({ label, type: 'network', url: r.url(), reason: r.failure()?.errorText }));
}
async function fixture(page, name) {
  const result = await page.evaluate(async name => { const h = window.__THREE_GAME_TEST_HOOKS__; h.setPausedForScreenshot(false); const result = await h.setState(name); h.hideDebugUi(); return result; }, name);
  if (result.state !== name) throw new Error(`Unacknowledged fixture ${name}`);
  if (name !== 'archive-combat') await page.locator('.dungeon-viewport[data-ready="true"]').waitFor();
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.presence-hands,.protagonist-portrait')].map(e => getComputedStyle(e).backgroundImage).filter(v => v.startsWith('url(')).map(async v => { const image = new Image(); image.src = v.slice(5, -2); await image.decode(); }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, kind = 'isolated-Archive-room', backend = 'webgl2') {
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true)); await settle(page);
  const full = `${name}.png`, world = `${name}-world.png`;
  await page.screenshot({ path: `${output}/${full}` });
  await page.locator('.presence-stage').first().screenshot({ path: `${output}/${world}` });
  const diagnostics = await page.evaluate(() => ({ world: window.__DUNGEON_DIAGNOSTICS__(), presence: window.__PRESENCE_DIAGNOSTICS__(), overflow: document.documentElement.scrollWidth > innerWidth,
    views: document.querySelectorAll('.physical-presence').length, worldViews: document.querySelectorAll('.dungeon-viewport').length }));
  const combat = kind.includes('combat');
  if (!combat && diagnostics.world.backend !== backend) throw new Error(`${name}: expected ${backend}, got ${diagnostics.world.backend}`);
  if (diagnostics.overflow || diagnostics.views !== 1) throw new Error(`${name}: invalid layout/presence ownership`);
  if (diagnostics.world.assetErrors?.length) throw new Error(`${name}: asset errors`);
  const png = PNG.sync.read(await readFile(`${output}/${world}`));
  let min=255, max=0, sum=0, count=0; const bins = new Set();
  for(let i=0;i<png.data.length;i+=16) { const l=.2126*png.data[i]+.7152*png.data[i+1]+.0722*png.data[i+2]; min=Math.min(min,l); max=Math.max(max,l); sum+=l; count++; bins.add(`${png.data[i]>>4},${png.data[i+1]>>4},${png.data[i+2]>>4}`); }
  if(max-min<20 || bins.size<12) throw new Error(`${name}: blank/flat canvas`);
  report.captures.push({ name, kind, viewport: page.viewportSize(), path: full, world, sha256: hash(await readFile(`${output}/${full}`)), metrics: { luminanceMin:min,luminanceMax:max,mean:sum/count,colorBins:bins.size }, diagnostics });
  console.log(JSON.stringify({ name, backend: diagnostics.world.backend, calls: diagnostics.world.calls }));
}
function mapSvg(map) {
  const size=14;
  const rects=map.tiles.flatMap((row,y)=>row.map((tile,x)=>`<rect x="${x*size}" y="${y*size}" width="14" height="14" fill="${!tile.passable?'#231e1a':tile.type==='stairsDown'?'#ce7464':tile.eventId?'#d2ad69':tile.featureId?'#4b6970':'#a99b7c'}"/>`)).join('');
  const labels=map.environment.rooms.map(room=>`<text x="${(room.x+.1)*size}" y="${(room.y+.7)*size}" fill="white" font-size="8">${room.id}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${map.width*size}" height="${map.height*size}" viewBox="0 0 ${map.width*size} ${map.height*size}"><rect width="100%" height="100%" fill="#161413"/>${rects}${labels}</svg>`;
}
async function motion(page, targetRoom) {
  const run=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key), start=run.state.location;
  const map=run.state.depthMaps.find(([depth])=>depth===2)[1], room=map.environment.rooms.find(r=>r.archetype===targetRoom);
  const tx=Math.floor(room.x+room.width/2),ty=room.y+room.height-2;
  const queue=[{x:start.x,y:start.y,path:[]}],seen=new Set([`${start.x},${start.y}`]); let route;
  for(const n of queue) {
    if(n.x===tx&&n.y===ty){route=n.path;break;}
    for(const [dx,dy,dir] of [[0,-1,'north'],[1,0,'east'],[0,1,'south'],[-1,0,'west']]) {
      const x=n.x+dx,y=n.y+dy,t=map.tiles[y]?.[x],k=`${x},${y}`;
      if(t?.passable&&!t.locked&&!t.eventId&&!t.type.startsWith('stairs')&&!seen.has(k)){seen.add(k);queue.push({x,y,path:[...n.path,dir]});}
    }
  }
  if(!route) throw new Error(`No event-free connected motion route to ${targetRoom}`);
  await page.evaluate(()=>window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
  const facing=['north','east','south','west'];
  for(const dir of route) {
    const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).state,key);
    if(before.mode!=='exploration') throw new Error(`Motion interrupted by ${before.mode}; no fixture skips permitted`);
    const turn=(facing.indexOf(dir)-facing.indexOf(before.location.direction)+4)%4;
    await page.keyboard.press(['w','d','s','a'][turn]);
    await page.waitForFunction(({key,before})=>{const l=JSON.parse(localStorage.getItem(key)).state.location;return l.x!==before.x||l.y!==before.y;},{key,before:before.location});
    await page.waitForFunction(()=>!window.__DUNGEON_DIAGNOSTICS__().moving);
  }
  return route.length;
}
try {
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
    const legacyContext=await browser.newContext({viewport,deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark'});
    const legacyRaw=await readFile('tests/fixtures/saves/v1/progressed.json','utf8');
    await legacyContext.addInitScript(({raw,key})=>{localStorage.setItem(key,raw);localStorage.setItem('depths-of-the-fractured-mind.preferences.v1',JSON.stringify({music:0,sfx:0,motion:'reduced',textScale:100}));},{raw:legacyRaw,key});
    const legacy=await legacyContext.newPage();observe(legacy,`legacy-${viewport.width}`);await legacy.goto(url);
    await legacy.getByRole('button',{name:/Continue · Depth 2/}).click();await legacy.locator('.dungeon-viewport[data-ready="true"]').waitFor();
    await capture(legacy,`${viewport.width}-legacy-depth2-before`,'immutable-v1-legacy-Depth2-save-fixture');await legacyContext.close();
    const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',colorScheme:'dark',isMobile:viewport.width<500,hasTouch:viewport.width<500,recordVideo:{dir:`${output}/video`,size:viewport}});
    await context.addInitScript(()=>localStorage.setItem('depths-of-the-fractured-mind.preferences.v1',JSON.stringify({music:0,sfx:0,motion:'full',textScale:100})));
    const page=await context.newPage(),video=page.video(); observe(page,viewport.width); await page.goto(url);
    for(const reduced of [false,true]) {
      await page.evaluate(reduced=>window.__THREE_GAME_TEST_HOOKS__.setReducedMotion(reduced),reduced);
      for(const room of rooms) {
        await fixture(page,`archive-${room}`); await capture(page,`${viewport.width}-${reduced?'reduced':'normal'}-${room}`);
      }
      await fixture(page,'archive-drum-chamber');
      if(!reduced) {
        const run=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),map=run.state.depthMaps.find(([depth])=>depth===2)[1];
        await writeFile(`${output}/archive-seed130013-map.svg`,mapSvg(map));
        await writeFile(`${output}/room-purpose-ledger.json`,JSON.stringify(map.environment,null,2));
        await writeFile(`${output}/progression-graph.mmd`,'graph TD\n'+map.environment.edges.map(e=>`  ${e.from}["${e.from}"] ${e.type==='main'?'-->':'-.->'} ${e.to}["${e.to}"]`).join('\n')+'\n');
      }
      for(const id of heroes) {
        await page.locator(`.compact-party-member[data-character="${id}"]`).click(); await capture(page,`${viewport.width}-${reduced?'reduced':'normal'}-${id}-drum`,'isolated-Archive-real-viewpoint-UI');
      }
      for(const id of heroes) {
        await fixture(page,'archive-interaction'); await page.locator(`.compact-party-member[data-character="${id}"]`).click();
        await page.evaluate(()=>window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
        await page.keyboard.press('f'); await page.waitForTimeout(180);
        await capture(page,`${viewport.width}-${reduced?'reduced':'normal'}-${id}-interaction`,'isolated-Archive-real-keyboard-interaction');
      }
    }
    await fixture(page,'archive-drum-chamber');
    await page.evaluate(()=>document.querySelector('#app').style.filter='grayscale(1)'); await capture(page,`${viewport.width}-grayscale-drum`,'isolated-Archive-grayscale');
    await page.evaluate(()=>document.querySelector('#app').style.filter='');
    await fixture(page,'archive-combat'); await capture(page,`${viewport.width}-combat`,'isolated-Archive-combat');
    await fixture(page,'archive-entrance'); await page.evaluate(()=>window.__THREE_GAME_TEST_HOOKS__.setReducedMotion(false));
    const steps=await motion(page,'indexing')+await motion(page,'drum-chamber')+await motion(page,'filing-gallery');
    await capture(page,`${viewport.width}-connected-motion-end`,'isolated-start-real-input-connected-rooms');
    const cdp=await context.newCDPSession(page); await cdp.send('Performance.enable'); const cycles=[];
    for(let n=0;n<6;n++) {
      await fixture(page,n%2?'archive-drum-chamber':'opening-room'); await cdp.send('HeapProfiler.collectGarbage');
      const heap=await cdp.send('Performance.getMetrics');
      cycles.push(await page.evaluate(()=>({world:window.__DUNGEON_DIAGNOSTICS__(),presence:window.__PRESENCE_DIAGNOSTICS__()})));
      cycles.at(-1).jsHeapUsedBytes=heap.metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
      if(cycles.at(-1).presence.lifecycle.active!==1||cycles.at(-1).world.lifecycle.active!==1) throw new Error('Depth fixture transition lifecycle leak');
    }
    report.resources.push({viewport,cycles,method:'isolated depth shell replacement, forced GC JS heap; no process/GPU memory certification'});
    await fixture(page,'archive-drum-chamber');
    await page.locator('.dungeon-viewport').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.locator('.dungeon-viewport[data-renderer="canvas-fallback"]').waitFor(); await capture(page,`${viewport.width}-canvas-fallback`,'isolated-Archive-context-loss-fallback','canvas-fallback');
    await context.close(); await video.saveAs(`${output}/${viewport.width}-archive-fixtures-and-connected-motion.webm`);
    report.motion.push({path:`${viewport.width}-archive-fixtures-and-connected-motion.webm`,viewport,connectedSteps:steps,method:'labeled fixtures followed by unpaused grid input through entrance/index/drum/gallery; muted'});
  }
} catch(error) {report.failures.push(error.stack||String(error));}
finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');}
if(report.errors.length||report.failures.length){console.error(JSON.stringify({errors:report.errors,failures:report.failures},null,2));process.exitCode=1;}
