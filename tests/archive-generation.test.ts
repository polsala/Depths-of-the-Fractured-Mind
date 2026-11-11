import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../src/game/state";
import { createIntakeMap } from "../src/game/exploration/authored/depth1-intake";
import { createDefaultParty } from "../src/game/characters/party";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { ARCHIVE_TEMPLATES } from "../src/game/exploration/generation/archive-rooms";
import { generateArchive } from "../src/game/exploration/generation/archive";
import { validateArchive } from "../src/game/exploration/generation/validate";
import { deriveGenerationSeed, generationRandom } from "../src/game/exploration/generation/random";
import { getDepthMap } from "../src/game/exploration/map";
import { generateProceduralMap } from "../src/game/exploration/map-generator";
import { gameRandom, getRandomState, restoreRandomState, startRun } from "../src/game/random";
import { parseRun, serializeRun, SAVE_VERSION } from "../src/game/save";
import { GameController } from "../src/game/index";

beforeEach(()=>vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({version:"1",events:[]})}))));
afterEach(()=>vi.unstubAllGlobals());
const count=process.env.ARCHIVE_EXTENDED==="1"?1000:100;

describe("versioned graph-first Archive",()=>{
  it(`validates deterministic geometry, dependencies, required beats and identity across ${count} fixed seeds`,()=>{
    const seen=new Set<string>();
    const results:Array<{seed:number;attempt:number;traversable:number;rooms:number;edges:number}>=[];
    for(let i=0;i<count;i++) {
      const seed=i===0?130013:(Math.imul(i+1,2654435761)>>>0)||1;
      startRun(seed); const rng=getRandomState();
      const first=generateArchive(seed), second=generateArchive(seed);
      expect(first,`seed ${seed}`).toEqual(second);
      const validation=validateArchive(first);
      expect(validation,`seed ${seed}`).toMatchObject({valid:true,errors:[]});
      results.push({seed,attempt:first.environment!.attempt,traversable:validation.traversable,rooms:first.environment!.rooms.length,edges:first.environment!.edges.length});
      expect(getRandomState()).toBe(rng);
      expect(first.environment?.generatorVersion).toBe("archive-v1");
      seen.add(JSON.stringify(first.tiles));
      // Every swept seed preserves a changed seal, consumed cache and event state.
      const savedMap=structuredClone(first);
      for(const row of savedMap.tiles)for(const tile of row) {
        if(tile.featureId==="archive-evidence-door")tile.locked=false;
        if(tile.chest){tile.chest.opened=true;tile.chest.loot=[];}
      }
      const state=createInitialGameState(createIntakeMap());state.party=createDefaultParty();state.mode="exploration";
      state.generationPolicy={version:1,runSeed:seed};state.depthMaps!.set(2,savedMap);
      state.location={depth:2,x:savedMap.startX,y:savedMap.startY,direction:"north"};
      state.flags.riotRecordingPlayed=true;state.flags.completedEventIds?.add("riot_recording_event");
      const restored=parseRun(serializeRun({state,initialSeed:seed,randomState:seed,stepsSinceLastEvent:0,lastProceduralEventId:null,savedAt:"2026-11-10T00:00:00Z"}));
      expect(restored.state.depthMaps!.get(2)).toEqual(savedMap);
      expect(restored.randomState).toBe(seed);
      expect(restored.state.flags.completedEventIds?.has("riot_recording_event")).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(count*.95);
    if(process.env.ARCHIVE_REPORT) {
      const dir=process.env.ARCHIVE_REPORT;mkdirSync(dir,{recursive:true});
      writeFileSync(`${dir}/seed-validation.json`,JSON.stringify({scope:"Archive depth2 only",generatorVersion:"archive-v1",count,distinctMaps:seen.size,failed:0,checks:["determinism","all traversable connected with solvable seal","unsealed main exit","mandatory event identity and reachability","no gate bypass","no duplicate stable IDs","no room overlap","no conflicting features","unchanged gameplay RNG","per-seed mutated save/reload"],results},null,2));
      const sample=generateArchive(130013),env=sample.environment!;
      writeFileSync(`${dir}/archive-130013.json`,JSON.stringify(sample,null,2));
      writeFileSync(`${dir}/room-purpose-ledger.json`,JSON.stringify(ARCHIVE_TEMPLATES,null,2));
      const cell=18;
      let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${sample.width*cell}" height="${sample.height*cell+40}" viewBox="0 0 ${sample.width*cell} ${sample.height*cell+40}"><rect width="100%" height="100%" fill="#171918"/><text x="12" y="24" fill="#e4d5b7" font-size="16">Archive · seed 130013 · archive-v1 (grid truth)</text><g transform="translate(0 40)">`;
      for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++) {
        const t=sample.tiles[y][x];if(!t.passable)continue;
        const color=t.type==="stairsUp"?"#4b8970":t.type==="stairsDown"?"#cf745d":t.locked?"#6e6cad":t.eventId?"#d2ad69":t.chest?"#d4cda5":"#736b5a";
        svg+=`<rect x="${x*cell+1}" y="${y*cell+1}" width="16" height="16" fill="${color}"/>`;
      }
      for(const r of env.rooms) svg+=`<text x="${(r.x+r.width/2)*cell}" y="${r.y*cell-3}" fill="#e4d5b7" text-anchor="middle" font-family="sans-serif" font-size="10">${r.id}</text>`;
      writeFileSync(`${dir}/archive-130013.svg`,svg+"</g></svg>");
      writeFileSync(`${dir}/progression-130013.mmd`,"graph TD\n"+env.rooms.map(r=>`  ${r.id.replaceAll("-","_")}["${r.archetype}${r.mandatory?"":" (optional)"}"]`).join("\n")+"\n"+env.edges.map(edge=>`  ${edge.from.replaceAll("-","_")} ${edge.type==="main"?"-->":"-.->"}|${edge.door?"index seal":edge.type}| ${edge.to.replaceAll("-","_")}`).join("\n")+"\n");
    }
  },60000);
  it("pins the independent derivation and substream sequence",()=>{
    const seed=deriveGenerationSeed(130013,2,"archive-v1","layout");
    const random=generationRandom(seed);
    expect([seed,random(),random(),random()]).toMatchInlineSnapshot(`
      [
        1945603571,
        0.7948640713002533,
        0.9800556697882712,
        0.5522822295315564,
      ]
    `);
  });
  it("keeps layout and gameplay RNG independent of decoration changes and generation order",()=>{
    startRun(130013); const before=getRandomState();
    const first=generateArchive(130013), cosmetic=generateArchive(130013,{decorationSalt:"new-wear-pass"});
    expect(cosmetic.tiles).toEqual(first.tiles);
    expect(cosmetic.environment?.decorationSeed).not.toBe(first.environment?.decorationSeed);
    expect(cosmetic.environment?.rooms.map(({decorationSeed,...room})=>room)).toEqual(first.environment?.rooms.map(({decorationSeed,...room})=>room));
    generateArchive(54321);
    expect(generateArchive(130013)).toEqual(first);
    expect(getRandomState()).toBe(before);
    const cache=new Map();
    const saved=getDepthMap(2,cache,{version:1,runSeed:130013});
    saved.tiles[saved.startY][saved.startX].itemId="torch";
    expect(getDepthMap(2,cache,{version:1,runSeed:99999})).toBe(saved);
  });
  it("rejects disconnected geometry, duplicate features, missing beats and bypassed gates",()=>{
    const source=generateArchive(130013);
    const broken=structuredClone(source); broken.tiles[1][1]={type:"floor",passable:true};
    expect(validateArchive(broken).valid).toBe(false);
    const dup=structuredClone(source);dup.tiles[dup.startY][dup.startX].featureId="archive-index";
    expect(validateArchive(dup).errors.join(" ")).toMatch(/Duplicate/);
    const missing=structuredClone(source);for(const row of missing.tiles)for(const tile of row)delete tile.eventId;
    expect(validateArchive(missing).errors.join(" ")).toMatch(/Missing mandatory/);
    const bypass=structuredClone(source);for(const row of bypass.tiles)for(const tile of row)tile.locked=false;
    expect(validateArchive(bypass).errors.join(" ")).toMatch(/bypassed/);
  });
});

describe("generation continuation policy",()=>{
  it.each([1,2])("continues an ungenerated depth from legacy v%i using the exact old RNG stream",version=>{
    const raw=JSON.parse(readFileSync(new URL("./fixtures/saves/v1/exploration.json",import.meta.url),"utf8"));
    raw.version=version;raw.state.depthMaps=raw.state.depthMaps.filter(([d]:[number])=>d===1);
    const snapshot=parseRun(JSON.stringify(raw));
    expect(snapshot.state.generationPolicy).toBeUndefined();
    restoreRandomState(snapshot.randomState,snapshot.initialSeed);
    const expected=generateProceduralMap(2), next=gameRandom();
    const controller=new GameController(9);controller.restore(snapshot);
    const actual=getDepthMap(2,controller.getState().depthMaps,controller.getState().generationPolicy);
    expect(actual).toEqual(expected);expect(actual.environment).toBeUndefined();expect(gameRandom()).toBe(next);
    expect(parseRun(serializeRun(controller.snapshot())).state.generationPolicy).toBeUndefined();
  });
  it("keeps pre-Phase02 authored Intake v2 continuation on the legacy generator",()=>{
    const original=new GameController(130013);original.newGame(130013);original.getState().mode="exploration";
    const raw=JSON.parse(serializeRun(original.snapshot()));raw.version=2;
    // Even a field unknown to the old schema cannot silently opt an old save in.
    const saved=parseRun(JSON.stringify(raw));expect(saved.state.depthMaps?.get(1)?.layoutId).toBe("depth1-intake-v1");
    expect(saved.state.generationPolicy).toBeUndefined();
    restoreRandomState(saved.randomState,saved.initialSeed);const expected=generateProceduralMap(2),next=gameRandom();
    const resumed=new GameController(8);resumed.restore(saved);
    const map=getDepthMap(2,resumed.getState().depthMaps,resumed.getState().generationPolicy);
    expect(map).toEqual(expected);expect(map.width).toBe(75);expect(gameRandom()).toBe(next);
  });
  it("opts newGame into generation v1, keeps combat RNG still and round-trips all Archive mutations",()=>{
    const controller=new GameController(9);controller.newGame(130013);const state=controller.getState();state.mode="exploration";
    const before=getRandomState(),map=getDepthMap(2,state.depthMaps,state.generationPolicy);
    expect(getRandomState()).toBe(before);
    state.location={depth:2,x:map.startX,y:map.startY,direction:"north"};
    for(const row of map.tiles)for(const tile of row) { if(tile.featureId==="archive-evidence-door")tile.locked=false;if(tile.chest){tile.chest.opened=true;tile.chest.loot=[];} }
    state.flags.archiveIndexReleased=true;state.flags.riotRecordingPlayed=true;state.flags.completedEventIds?.add("riot_recording_event");
    state.flags.dialogue_keeper_intro_shown=true;state.party.members[0].stats.hp=13;
    const raw=serializeRun(controller.snapshot()),next=gameRandom();
    expect(JSON.parse(raw).version).toBe(SAVE_VERSION);
    const resumed=new GameController(8);resumed.restore(parseRun(raw));
    expect(resumed.getState()).toEqual(state);
    expect(getDepthMap(2,resumed.getState().depthMaps,resumed.getState().generationPolicy)).toEqual(map);
    expect(gameRandom()).toBe(next);
    expect(JSON.stringify(resumed.snapshot())).not.toMatch(/viewpoint|PresenceDirector|animationClock/);
  });
  it("rejects unsupported policy, mismatched seed and malformed semantic data without regenerating",()=>{
    const controller=new GameController(9);controller.newGame(130013);const state=controller.getState();state.mode="exploration";
    getDepthMap(2,state.depthMaps,state.generationPolicy);const raw=JSON.parse(serializeRun(controller.snapshot()));
    raw.state.generationPolicy.version=2;expect(()=>parseRun(JSON.stringify(raw))).toThrow(/policy/);
    raw.state.generationPolicy.version=1;raw.state.generationPolicy.runSeed=4;expect(()=>parseRun(JSON.stringify(raw))).toThrow(/seed/);
    raw.state.generationPolicy.runSeed=130013;raw.state.depthMaps[1][1].environment.rooms[0].width=999;expect(()=>parseRun(JSON.stringify(raw))).toThrow(/maps/);
    raw.state.depthMaps[1][1].environment.rooms[0].width=5;
    raw.state.depthMaps[1][1].environment.rooms[0].requiredEvents=null;expect(()=>parseRun(JSON.stringify(raw))).toThrow(/maps/);
  });
});
