import type { ReferenceCharacter } from "../../assets/character-sprites";

/** Explicit visual registration. Unknown narrative IDs never borrow a named
 * character's identity. A new NPC requires a separate reviewed art mapping. */
export const NPC_PRESENTATIONS: Readonly<Record<string, ReferenceCharacter>> = Object.freeze({ keeper: "keeper" });
export function npcPresentationFor(id: string): ReferenceCharacter | undefined {
  return Object.prototype.hasOwnProperty.call(NPC_PRESENTATIONS, id) ? NPC_PRESENTATIONS[id] : undefined;
}
export function npcFallbackLabel(id: string): string { return `Character appearance unavailable: ${id}`; }
