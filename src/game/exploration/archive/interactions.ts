import type { GameState } from "../../state";
import { startEvent } from "../../events/engine";
import { addItem } from "../../inventory";
import { emitSound } from "../../sound";

export interface ArchiveInteraction { id: string; label: string; description: string }

/** Reads the committed cell and the immediately facing cell, never proximity alone. */
export function getArchiveInteraction(state: GameState): ArchiveInteraction | null {
  const map = state.depthMaps?.get(state.location.depth);
  if (state.mode !== "exploration" || !map?.environment || map.depth !== 2) return null;
  const { x, y, direction = "north" } = state.location;
  const [dx, dy] = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[direction];
  const id = map.tiles[y]?.[x]?.featureId ?? map.tiles[y + dy]?.[x + dx]?.featureId;
  const flags = state.flags;
  switch (id) {
    case "archive-index": return { id, label: flags.archiveIndexed ? "Read the altered index" : "Release the evidence latch",
      description: "The index skips a complete interval of patient numbers. A manual retrieval lever still connects to the restricted evidence door. No key or perception check is required." };
    case "archive-drum": return { id, label: "Inspect the missing drum segment",
      description: "One segment has been unbolted from the records drum. Its clean mounting points interrupt a ring of dust. These records were removed deliberately, after the rest were filed. RETRIEVAL leads to the recording; SERVICE leads to the broken storage floor." };
    case "archive-recording": return { id, label: flags.riotRecordingPlayed || flags.completedEventIds?.has("riot_recording_event") ? "Read the recording transcript" : "Play the Riot Recording",
      description: "A retrieval request remains in the machine. Beside it, an interrupted transcript records the orders that turned the riot into an official account." };
    case "archive-broken-floor": return { id, label: flags.pitEventResolved || flags.completedEventIds?.has("pit_fall_event") ? "Inspect the secured floor" : "Examine the Broken Floor",
      description: "Loaded drawers have pulled their rails through the service floor. The damaged crossing is visible before you approach; the companions must decide how to pass." };
    case "archive-evidence-door": return { id, label: flags.archiveIndexed ? "Inspect the released evidence door" : "Read the restricted door notice",
      description: flags.archiveIndexed ? "The index lever has released the evidence latch. The storage beyond is optional; the main route remains open." : "RESTRICTED EVIDENCE. Manual release at INDEX. Through the aperture, one cabinet has had every identifying label removed." };
    case "archive-evidence": return { id, label: "Search the evidence cabinet",
      description: "Blank labels cover older numbers. Someone left practical supplies among the withdrawn files. Taking them cannot erase the recording." };
    case "archive-secret": return { id, label: "Search the maintenance cache",
      description: "Behind the displaced filing row, a maintenance worker hid supplies beneath a cancelled retrieval slip. The cache is finite." };
    case "archive-onward": return { id, label: "Read the transfer notice",
      description: "WARD TRANSFER. The Riot Recording and Broken Floor must be confronted before the Archive's guardian permits descent. The open drum marks the return route." };
    default: return null;
  }
}

/** Authoritative effects happen immediately. Presence may react only to this accepted command. */
export function resolveArchiveInteraction(state: GameState, interaction: ArchiveInteraction): GameState {
  const current = getArchiveInteraction(state);
  if (!current || current.id !== interaction.id) return state;
  const map = state.depthMaps!.get(2)!;
  switch (current.id) {
    case "archive-index":
      state.flags.archiveIndexed = true;
      for (const row of map.tiles) for (const tile of row) {
        if (tile.featureId === "archive-evidence-door") tile.locked = false;
      }
      state.explorationNotice = "The retrieval lever releases the restricted evidence latch. The gap in the index remains: somebody chose which names would survive. The main route does not depend on entering evidence storage.";
      emitSound("event_choice");
      break;
    case "archive-recording":
      if (!state.flags.riotRecordingPlayed && !state.flags.completedEventIds?.has("riot_recording_event")) return startEvent(state, "riot_recording_event");
      state.explorationNotice = current.description;
      break;
    case "archive-broken-floor":
      if (!state.flags.pitEventResolved && !state.flags.completedEventIds?.has("pit_fall_event")) return startEvent(state, "pit_fall_event");
      state.explorationNotice = current.description;
      break;
    case "archive-secret":
    case "archive-evidence": {
      const tile = map.tiles.flat().find((entry) => entry.featureId === current.id);
      if (!tile?.chest || tile.chest.opened) {
        state.explorationNotice = "The cabinet is empty. Its supplies have already been taken; the cancelled labels remain.";
        break;
      }
      // Persist uncollected quantities, including a partial collection, so full
      // inventories cannot duplicate a reward or destroy the remaining supplies.
      const remaining: typeof tile.chest.loot = [];
      let collected = 0;
      for (const loot of tile.chest.loot) {
        if (addItem(state.party.inventory, loot.itemId, loot.quantity)) collected += loot.quantity;
        else remaining.push(loot);
      }
      tile.chest.loot = remaining;
      tile.chest.opened = remaining.length === 0;
      state.explorationNotice = collected ? `You recover ${collected} supplies from the cabinet.${remaining.length ? " Your inventory is full; the remaining supplies stay here." : " The cabinet is now empty."}`
        : "Your inventory is full. The supplies remain in the cabinet; make room and return.";
      if (collected) emitSound("ui_click");
      break;
    }
    default: state.explorationNotice = current.description;
  }
  return state;
}
