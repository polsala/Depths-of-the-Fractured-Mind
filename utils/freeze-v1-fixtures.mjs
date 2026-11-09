// One-time preservation tool. Never regenerate legacy fixtures as part of tests.
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const directory = new URL("../tests/fixtures/saves/v1/", import.meta.url);
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const server = await createServer({ server: { middlewareMode: true, hmr: false } });
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(await readFile(new URL("../public/data/events.json", import.meta.url)));
try {
  const { GameController } = await server.ssrLoadModule("/src/game/index.ts");
  const { serializeRun } = await server.ssrLoadModule("/src/game/save.ts");
  const { addItem } = await server.ssrLoadModule("/src/game/inventory.ts");
  const { getDepthMap } = await server.ssrLoadModule("/src/game/exploration/map.ts");
  const { gameRandom } = await server.ssrLoadModule("/src/game/random.ts");
  const files = [];
  await mkdir(directory, { recursive: true });
  for (const mode of ["exploration", "event", "combat", "conversation", "progressed"]) {
    const controller = new GameController(130013);
    // The real loader is asynchronous; wait for it rather than substituting fallback content.
    while (!controller.isEventsLoaded()) await new Promise((resolve) => setTimeout(resolve, 1));
    if (controller.hasEventLoadingError()) throw new Error("Fixture event data failed to load");
    const state = controller.getState();
    state.mode = "exploration";
    if (mode === "event") controller.startEvent("first_corpse");
    if (mode === "combat") controller.startCombat(false, 1);
    if (mode === "conversation" && !controller.startDialogue()) throw new Error("Keeper missing");
    if (mode === "progressed") {
      state.party.members[0].stats.hp = 11;
      state.party.members[0].equipment.weapon = "warden_baton";
      addItem(state.party.inventory, "medkit", 2);
      state.party.inventory.money = 37;
      state.flags.completedEventIds.add("first_corpse");
      state.flags.bossDefeatedDepths.add(1);
      const map = getDepthMap(2, state.depthMaps);
      state.location = { depth: 2, x: map.startX, y: map.startY, direction: "west" };
      const tile = map.tiles[map.startY][map.startX];
      tile.discovered = true;
      tile.chest = { opened: true, loot: [{ itemId: "medkit", quantity: 2 }] };
      state.flags.visitedTiles.add(`2-${map.startX}-${map.startY}`);
    }
    const snapshot = controller.snapshot();
    snapshot.savedAt = "2026-11-09T00:00:00.000Z";
    const raw = serializeRun(snapshot) + "\n";
    const path = `${mode}.json`;
    // wx deliberately refuses to replace the historical compatibility contract.
    await writeFile(new URL(path, directory), raw, { flag: "wx" });
    files.push({ path, mode: snapshot.state.mode, depth: snapshot.state.location.depth,
      sha256: createHash("sha256").update(raw).digest("hex"), nextRandom: gameRandom() });
  }
  await writeFile(new URL("manifest.json", directory), JSON.stringify({
    sourceHead,
    seed: 130013, saveVersion: 1, files,
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`Preserved ${files.length} v1 fixtures`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
