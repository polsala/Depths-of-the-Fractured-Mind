import type { DepthMap, MapTile } from "../map";
import { ARCHIVE_TEMPLATES } from "./archive-rooms";
import { deriveGenerationSeed, generationRandom } from "./random";
import type { ArchiveArchetype, ArchiveEdge, ArchiveEnvironment, ArchiveRoom, WorldPoint } from "./world-definition";
import { validateArchive } from "./validate";

export const ARCHIVE_GENERATOR_VERSION = "archive-v1" as const;
const VERSION = ARCHIVE_GENERATOR_VERSION;
interface Beat { id: string; archetype: ArchiveArchetype; slot: [number, number]; mandatory: boolean; events: string[] }
/** Establish progression before allocating any geometry or feature randomness. */
function progressionGraph(loopToExit: boolean): { beats: Beat[]; edges: Omit<ArchiveEdge, "path">[] } {
  const beats: Beat[] = [
    { id: "transfer", archetype: "entrance", slot: [0, 2], mandatory: true, events: [] },
    { id: "index", archetype: "indexing", slot: [0, 1], mandatory: true, events: [] },
    { id: "compression", archetype: "compressed-aisle", slot: [0, 0], mandatory: true, events: [] },
    { id: "gallery", archetype: "filing-gallery", slot: [1, 0], mandatory: true, events: [] },
    { id: "drum", archetype: "drum-chamber", slot: [1, 1], mandatory: true, events: [] },
    { id: "retrieval", archetype: "retrieval", slot: [2, 1], mandatory: true, events: ["riot_recording_event"] },
    { id: "evidence", archetype: "restricted-evidence", slot: [2, 0], mandatory: false, events: [] },
    { id: "fracture", archetype: "damaged-storage", slot: [2, 2], mandatory: true, events: ["pit_fall_event"] },
    { id: "ward-transfer", archetype: "exit", slot: [1, 2], mandatory: true, events: [] },
    { id: "maintenance", archetype: "secret", slot: [3, 1], mandatory: false, events: [] },
  ];
  const connect = (from: string, to: string, type: ArchiveEdge["type"], gated = false): Omit<ArchiveEdge, "path"> => ({
    id: `${from}--${to}`, from, to, type, traversal: "bidirectional", routing: "orthogonal-clearance",
    dependencies: gated ? ["archive-index"] : [], ...(gated ? { door: { featureId: "archive-evidence-door", requires: "archive-index" as const } } : {}),
  });
  const main = ["transfer", "index", "compression", "gallery", "drum", "retrieval", "fracture", "ward-transfer"];
  const edges = main.slice(1).map((to, i) => connect(main[i], to, "main"));
  edges.push(connect("retrieval", "evidence", "branch", true));
  edges.push(connect("retrieval", "maintenance", "secret"));
  edges.push(connect("drum", loopToExit ? "ward-transfer" : "index", "loop"));
  return { beats, edges };
}

function center(room: ArchiveRoom): WorldPoint { return { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) }; }
function inRoom(point: WorldPoint, room: ArchiveRoom): boolean { return point.x >= room.x && point.y >= room.y && point.x < room.x + room.width && point.y < room.y + room.height; }
function route(from: ArchiveRoom, to: ArchiveRoom, rooms: ArchiveRoom[], width: number, height: number, random: () => number): WorldPoint[] | null {
  const start = center(from), goal = center(to);
  if (from.archetype === "drum-chamber") start.y += 2;
  if (to.archetype === "drum-chamber") goal.y += 2;
  const key = (p: WorldPoint) => p.y * width + p.x;
  const parents = new Map<number, number>();
  const queue = [start]; parents.set(key(start), -1);
  const directions = random() < .5 ? [[0,-1],[1,0],[0,1],[-1,0]] : [[1,0],[0,1],[-1,0],[0,-1]];
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    if (point.x === goal.x && point.y === goal.y) {
      const result: WorldPoint[] = [];
      for (let at = key(goal); at !== -1; at = parents.get(at)!) result.push({ x: at % width, y: Math.floor(at / width) });
      return result.reverse();
    }
    for (const [dx,dy] of directions) {
      const next = { x: point.x + dx, y: point.y + dy };
      if (next.x < 1 || next.y < 1 || next.x >= width - 1 || next.y >= height - 1 || parents.has(key(next))) continue;
      if (rooms.some((r) => r !== from && r !== to && next.x >= r.x - 1 && next.y >= r.y - 1 && next.x <= r.x + r.width && next.y <= r.y + r.height)) continue;
      // A solid central drum remains collision truth, even while routing.
      const drum = rooms.find((r) => r.archetype === "drum-chamber")!;
      const dc = center(drum);
      if (Math.abs(next.x - dc.x) <= 1 && Math.abs(next.y - dc.y) <= 1) continue;
      parents.set(key(next), key(point)); queue.push(next);
    }
  }
  return null;
}

export function generateArchive(runSeed: number, options: { decorationSalt?: string } = {}): DepthMap {
  const seed = deriveGenerationSeed(runSeed, 2, VERSION, "layout");
  for (let attempt = 0; attempt < 4; attempt++) {
    const random = generationRandom(deriveGenerationSeed(seed, 2, VERSION, `attempt:${attempt}`));
    const graph = progressionGraph(random() < .5);
    const reflect = random() < .5;
    const quarterTurn = Math.floor(random() * 4);
    const baseWidth = 41, baseHeight = 31;
    const width = quarterTurn % 2 ? baseHeight : baseWidth, height = quarterTurn % 2 ? baseWidth : baseHeight;
    const columns = [5, 15, 25, 35].map((n) => n + Math.floor(random() * 3) - 1);
    const rows = [5, 15, 25].map((n) => n + Math.floor(random() * 3) - 1);
    const transform = (p: WorldPoint): WorldPoint => {
      let { x, y } = p;
      if (reflect) x = baseWidth - 1 - x;
      if (quarterTurn === 1) return { x: baseHeight - 1 - y, y: x };
      if (quarterTurn === 2) return { x: baseWidth - 1 - x, y: baseHeight - 1 - y };
      if (quarterTurn === 3) return { x: y, y: baseWidth - 1 - x };
      return { x, y };
    };
    const decorationSeed = deriveGenerationSeed(runSeed, 2, VERSION, `decoration:${options.decorationSalt ?? "v1"}`);
    const rooms: ArchiveRoom[] = graph.beats.map((beat) => {
      const template = ARCHIVE_TEMPLATES[beat.archetype];
      let rw = template.width, rh = template.height;
      // Long rooms change orientation/proportion while retaining their authored role.
      if ((beat.archetype === "filing-gallery" || beat.archetype === "compressed-aisle") && random() < .5) [rw,rh] = [rh,rw];
      const cx = columns[beat.slot[0]], cy = rows[beat.slot[1]];
      const a = transform({ x: cx - Math.floor(rw / 2), y: cy - Math.floor(rh / 2) });
      const b = transform({ x: cx + Math.floor(rw / 2), y: cy + Math.floor(rh / 2) });
      const x = Math.min(a.x,b.x), y = Math.min(a.y,b.y), roomWidth = Math.abs(a.x-b.x)+1, roomHeight = Math.abs(a.y-b.y)+1;
      const middle = { x: x + Math.floor(roomWidth/2), y: y + Math.floor(roomHeight/2) };
      const room: ArchiveRoom = {
        id: beat.id, archetype: beat.archetype, narrativeRole: beat.events.length ? "evidence-choice" : beat.mandatory ? "orientation-and-progression" : "optional-reward",
        purpose: template.purpose, formerUse: template.formerUse, humanTrace: template.humanTrace, focalPoint: template.focalPoint,
        mainSightline: "north", mandatory: beat.mandatory, x,y,width:roomWidth,height:roomHeight,
        requiredEvents: beat.events, constraints: { clearCenter: beat.archetype !== "drum-chamber", entranceSides: ["north","east","south","west"] },
        style: "archive", materialRole: template.materialRole,
        decorationSeed: deriveGenerationSeed(decorationSeed,2,VERSION,beat.id),
        lightingSockets: [{ id: `${beat.id}-task`, ...middle, kind: beat.archetype === "restricted-evidence" ? "security" : beat.archetype === "compressed-aisle" ? "strip" : "task", height: 2.5, intensity: beat.archetype === "drum-chamber" ? 8 : 5 }],
        propSockets: [], featureRefs: [],
      };
      if (beat.archetype === "drum-chamber") { room.landmark = "missing-records-drum"; room.propSockets.push({ id:"records-drum",kind:"records-drum",...middle }); }
      return room;
    });
    const tiles: MapTile[][] = Array.from({length:height},()=>Array.from({length:width},()=>({type:"wall",passable:false})));
    const floor = (x: number,y: number) => { tiles[y][x] = {type:"floor",passable:true,discovered:false}; };
    for (const room of rooms) for (let y=room.y;y<room.y+room.height;y++) for(let x=room.x;x<room.x+room.width;x++) floor(x,y);
    const edges: ArchiveEdge[] = [];
    let failed = false;
    for (const edge of graph.edges) {
      const path = route(rooms.find(r=>r.id===edge.from)!,rooms.find(r=>r.id===edge.to)!,rooms,width,height,random);
      if (!path) { failed=true; break; }
      for(const p of path) floor(p.x,p.y);
      edges.push({...edge,path});
      const target=rooms.find(r=>r.id===edge.to)!;
      const approach=path.find(p=>inRoom(p,target))!;
      const tc=center(target);
      target.mainSightline=target.archetype==="drum-chamber" ? "north" : Math.abs(tc.x-approach.x)>Math.abs(tc.y-approach.y) ? (tc.x>approach.x?"east":"west") : (tc.y>approach.y?"south":"north");
    }
    if (failed) continue;
    const drum = rooms.find(r=>r.id==="drum")!, dc=center(drum);
    for(let y=dc.y-1;y<=dc.y+1;y++) for(let x=dc.x-1;x<=dc.x+1;x++) tiles[y][x]={type:"wall",passable:false};
    for(const room of rooms.filter(r=>r.archetype==="compressed-aisle")) {
      const c=center(room);
      for(let y=room.y;y<room.y+room.height;y++) for(let x=room.x;x<room.x+room.width;x++) {
        if((room.width>room.height ? y!==c.y&&x!==c.x&&x!==room.x&&x!==room.x+room.width-1 : x!==c.x&&y!==c.y&&y!==room.y&&y!==room.y+room.height-1)) tiles[y][x]={type:"wall",passable:false,featureId:`archive-shelving-${x}-${y}`};
      }
    }
    const featureRandom=generationRandom(deriveGenerationSeed(runSeed,2,VERSION,"features"));
    const retrievalRoom=rooms.find(r=>r.id==="retrieval")!;
    const retrievalOffset=featureRandom()<.5?-1:1;
    const feature = (roomId:string,id:string,offset:WorldPoint={x:0,y:0}) => {
      const room=rooms.find(r=>r.id===roomId)!, c=center(room), p={x:c.x+offset.x,y:c.y+offset.y};
      tiles[p.y][p.x].featureId=id; room.featureRefs.push({id,...p}); return tiles[p.y][p.x];
    };
    feature("index","archive-index");
    feature("drum","archive-drum",{x:0,y:2});
    feature("retrieval","archive-recording",retrievalRoom.width>retrievalRoom.height?{x:retrievalOffset,y:0}:{x:0,y:retrievalOffset}).eventId="riot_recording_event";
    feature("fracture","archive-broken-floor").eventId="pit_fall_event";
    feature("evidence","archive-evidence").chest={loot:[{itemId:"sanity_tonic",quantity:2},{itemId:"healing_potion",quantity:2}],opened:false};
    feature("maintenance","archive-secret").chest={loot:[{itemId:"medkit",quantity:1}],opened:false};
    feature("ward-transfer","archive-onward").type="stairsDown";
    const entrance=rooms.find(r=>r.id==="transfer")!, start=center(entrance);
    tiles[start.y][start.x].type="stairsUp";
    // A real one-cell indexed seal on the only entrance into the evidence room.
    const evidence=rooms.find(r=>r.id==="evidence")!, branch=edges.find(e=>e.door)!;
    const doorPoint=branch.path.find(p=>inRoom(p,evidence))!;
    const doorTile=tiles[doorPoint.y][doorPoint.x];
    doorTile.type="door"; doorTile.locked=true; doorTile.featureId="archive-evidence-door";
    evidence.featureRefs.push({id:"archive-evidence-door",...doorPoint});
    // Keep chests finite and optional. Existing combat generator/guardian remain untouched.
    const environment:ArchiveEnvironment={schemaVersion:1,generatorVersion:VERSION,seed,decorationSeed,attempt,rooms,edges,
      requiredFeatureIds:["archive-index","archive-drum","archive-recording","archive-broken-floor","archive-onward"]};
    const map:DepthMap={depth:2,width,height,tiles,startX:start.x,startY:start.y,environment};
    const result=validateArchive(map);
    if(result.valid) return map;
  }
  throw new Error(`Archive generation rejected after four bounded attempts (run seed ${runSeed})`);
}
