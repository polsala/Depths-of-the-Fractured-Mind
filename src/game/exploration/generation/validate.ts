import type { DepthMap } from "../map";
import type { ArchiveEnvironment } from "./world-definition";
import { ARCHIVE_TEMPLATES } from "./archive-rooms";
import { REQUIRED_BEATS } from "../../story";
export interface ArchiveValidation { valid: boolean; errors: string[]; traversable: number; reachable: number }

export function reachableArchive(map: DepthMap, openSeal = false): Set<string> {
  const seen=new Set<string>(), queue=[[map.startX,map.startY]];
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i], key=`${x},${y}`, tile=map.tiles[y]?.[x];
    if(seen.has(key)||!tile?.passable||(tile.locked&&!openSeal)) continue;
    seen.add(key); queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  return seen;
}

/** Defensive semantic-only validation; saved mutable tiles are never regenerated. */
export function isArchiveEnvironment(value: unknown, width:number,height:number): value is ArchiveEnvironment {
  if(!value||typeof value!=="object") return false;
  const e=value as ArchiveEnvironment;
  const uint=(v:unknown)=>Number.isInteger(v)&&(v as number)>0&&(v as number)<=0xffffffff;
  const point=(p:{x:number;y:number})=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<width&&p.y<height;
  if(e.schemaVersion!==1||e.generatorVersion!=="archive-v1"||!uint(e.seed)||!uint(e.decorationSeed)||!Number.isInteger(e.attempt)||e.attempt<0||e.attempt>3||!Array.isArray(e.rooms)||e.rooms.length!==10||!Array.isArray(e.edges)||e.edges.length!==10||!Array.isArray(e.requiredFeatureIds)||!e.requiredFeatureIds.every(id=>typeof id==="string"))return false;
  const required=["archive-index","archive-drum","archive-recording","archive-broken-floor","archive-onward"];
  if(e.requiredFeatureIds.length!==required.length||required.some(id=>!e.requiredFeatureIds.includes(id)))return false;
  const ids=new Set<string>();
  for(const r of e.rooms) {
    if(!r||typeof r.id!=="string"||ids.has(r.id)||!Object.hasOwn(ARCHIVE_TEMPLATES,r.archetype)||![r.x,r.y,r.width,r.height].every(Number.isInteger)||r.x<1||r.y<1||r.width<3||r.height<3||r.width>9||r.height>9||r.x+r.width>=width||r.y+r.height>=height||!uint(r.decorationSeed)||!Array.isArray(r.featureRefs)||!r.featureRefs.every(p=>point(p)&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&typeof p.id==="string")||!Array.isArray(r.propSockets)||!r.propSockets.every(p=>point(p)&&typeof p.id==="string"&&["filing-bank","retrieval-desk","index-machine","evidence-cage","removed-files","records-drum"].includes(p.kind))||!Array.isArray(r.lightingSockets)||!r.lightingSockets.every(p=>point(p)&&typeof p.id==="string"&&["task","strip","security"].includes(p.kind)&&Number.isFinite(p.height)&&p.height>0&&p.height<=5&&Number.isFinite(p.intensity)&&p.intensity>=0&&p.intensity<=10))return false;
    if([r.narrativeRole,r.purpose,r.formerUse,r.humanTrace,r.focalPoint].some(v=>typeof v!=="string"||v.length>1000)||typeof r.mandatory!=="boolean"||r.style!=="archive"||!["records","service","restricted"].includes(r.materialRole)||!["north","south","east","west"].includes(r.mainSightline)||!Array.isArray(r.requiredEvents)||!r.requiredEvents.every(id=>REQUIRED_BEATS[2]?.some(beat=>beat.id===id))||!r.constraints||typeof r.constraints.clearCenter!=="boolean"||!Array.isArray(r.constraints.entranceSides)||!r.constraints.entranceSides.every(side=>["north","south","east","west"].includes(side))||(r.landmark!==undefined&&r.landmark!=="missing-records-drum"))return false;
    if(r.featureRefs.some(p=>p.x<r.x||p.y<r.y||p.x>=r.x+r.width||p.y>=r.y+r.height))return false;
    ids.add(r.id);
  }
  if(new Set(e.rooms.map(r=>r.archetype)).size!==10)return false;
  const edgeIds=new Set<string>();
  for(const edge of e.edges) {
    if(!edge||typeof edge.id!=="string"||edgeIds.has(edge.id)||!ids.has(edge.from)||!ids.has(edge.to)||!Array.isArray(edge.path)||edge.path.length>width*height||!edge.path.every(p=>point(p)&&Number.isInteger(p.x)&&Number.isInteger(p.y))||!Array.isArray(edge.dependencies)||!edge.dependencies.every(id=>id==="archive-index")) return false;
    if(!["main","branch","loop","secret"].includes(edge.type)||edge.traversal!=="bidirectional"||edge.routing!=="orthogonal-clearance"||(edge.door!==undefined&&(!edge.door||edge.door.featureId!=="archive-evidence-door"||edge.door.requires!=="archive-index")))return false;
    edgeIds.add(edge.id);
  }
  return true;
}

/** Validate completed authoritative geometry, progression, identity and gate dependency. */
export function validateArchive(map:DepthMap):ArchiveValidation {
  const errors:string[]=[];
  const e=map.environment;
  if(map.depth!==2||!isArchiveEnvironment(e,map.width,map.height))return{valid:false,errors:["Invalid Archive semantic identity"],traversable:0,reachable:0};
  const opened=reachableArchive(map,true), closed=reachableArchive(map,false);
  const traversable=map.tiles.flat().filter(t=>t.passable).length;
  if(opened.size!==traversable) errors.push("Disconnected traversable geometry");
  if(map.tiles[map.startY]?.[map.startX]?.type!=="stairsUp") errors.push("Invalid Archive entrance");
  const features=new Map<string,{x:number;y:number}>();
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++) {
    const tile=map.tiles[y][x];
    if(tile.featureId) {
      if(features.has(tile.featureId))errors.push(`Duplicate feature ${tile.featureId}`);
      features.set(tile.featureId,{x,y});
    }
    const simultaneous=[tile.eventId,tile.chest,tile.itemId,tile.trap,tile.vendor,tile.npcId].filter(Boolean).length;
    if(simultaneous>1)errors.push(`Conflicting feature at ${x},${y}`);
    if(tile.eventId&&!REQUIRED_BEATS[2]?.some(beat=>beat.id===tile.eventId))errors.push(`Unknown story requirement ${tile.eventId}`);
  }
  for(const id of e.requiredFeatureIds) { const p=features.get(id); if(!p||!opened.has(`${p.x},${p.y}`))errors.push(`Required feature unreachable: ${id}`); }
  for(const beat of REQUIRED_BEATS[2]??[]) if(!map.tiles.flat().some(t=>t.eventId===beat.id))errors.push(`Missing mandatory beat ${beat.id}`);
  const exit=features.get("archive-onward");
  if(!exit||map.tiles[exit.y][exit.x].type!=="stairsDown"||!closed.has(`${exit.x},${exit.y}`))errors.push("Invalid or sealed main exit");
  const index=features.get("archive-index"), evidence=features.get("archive-evidence");
  if(!index||!closed.has(`${index.x},${index.y}`))errors.push("Evidence dependency is behind its seal");
  if(!evidence||!opened.has(`${evidence.x},${evidence.y}`))errors.push("Evidence reward is unreachable");
  if(evidence&&closed.has(`${evidence.x},${evidence.y}`))errors.push("Evidence seal can be bypassed");
  const allIds=[...e.rooms.map(r=>r.id),...e.edges.map(edge=>edge.id),...e.rooms.flatMap(r=>r.lightingSockets.map(p=>p.id)),...e.rooms.flatMap(r=>r.propSockets.map(p=>p.id))];
  if(new Set(allIds).size!==allIds.length)errors.push("Duplicate stable semantic IDs");
  for(let i=0;i<e.rooms.length;i++)for(let j=i+1;j<e.rooms.length;j++) {
    const a=e.rooms[i],b=e.rooms[j];
    if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y) errors.push("Room overlap");
  }
  const refs=e.rooms.flatMap(r=>r.featureRefs);
  if(new Set(refs.map(p=>p.id)).size!==refs.length)errors.push("Duplicate feature references");
  for(const ref of refs)if(map.tiles[ref.y]?.[ref.x]?.featureId!==ref.id)errors.push(`Mismatched feature reference ${ref.id}`);
  for(const room of e.rooms)for(const event of room.requiredEvents)if(!room.featureRefs.some(ref=>map.tiles[ref.y][ref.x].eventId===event))errors.push(`Room is missing its story beat ${room.id}`);
  for(const edge of e.edges) {
    if(edge.path.some(p=>!map.tiles[p.y]?.[p.x]?.passable))errors.push(`Corridor intersects forbidden geometry ${edge.id}`);
    if(edge.path.some((p,i)=>i>0&&Math.abs(p.x-edge.path[i-1].x)+Math.abs(p.y-edge.path[i-1].y)!==1))errors.push(`Invalid corridor ${edge.id}`);
    if(edge.dependencies.some(id=>!features.has(id)))errors.push(`Unavailable dependency ${edge.id}`);
  }
  return{valid:errors.length===0,errors,traversable,reachable:opened.size};
}
