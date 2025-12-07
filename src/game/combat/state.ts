import type { CharacterState, DebugOptions, PartyState } from "../state";
import type { EnemyState, EncounterState } from "./engine";
import { getBossDialogue } from "../boss-dialogues";

export type CombatActionType = "attack" | "ability" | "item" | "defend" | "flee";

export interface CombatAction {
  type: CombatActionType;
  actorIndex: number;
  targetIndex?: number;
  abilityId?: string;
  itemId?: string;
  isPlayerAction: boolean;
}

export interface StatusEffect {
  id: string;
  name: string;
  remainingTurns: number; // Renamed from duration to avoid unused warning
  stat?: string;
  value?: number;
}

// Simplified status effects for now - just track by ID
export type StatusEffectId = string;

export interface CombatParticipant {
  isPlayer: boolean;
  index: number;
  stats: CharacterState["stats"] | EnemyState["stats"];
  statusEffects: StatusEffect[];
  defending: boolean;
}

export interface TurnOrderEntry {
  isPlayer: boolean;
  index: number; // Index in party.members or encounter.enemies
  speed: number; // Focus stat value for sorting
}

export interface CombatState {
  party: PartyState;
  encounter: EncounterState;
  turn: number;
  phase: "select-action" | "execute-action" | "victory" | "defeat" | "fled";
  turnOrder: TurnOrderEntry[]; // Queue of who acts next, sorted by speed
  currentTurnIndex: number; // Index in turnOrder for current actor
  pendingAction?: CombatAction; // Action selected by current actor
  log: CombatLogEntry[];
  isBossFight: boolean;
  debugOptions?: DebugOptions;
}

export interface CombatLogEntry {
  message: string;
  type?: "damage" | "heal" | "sanity" | "status" | "system" | "dialogue";
}

export function createCombatState(
  party: PartyState,
  encounter: EncounterState,
  isBoss: boolean = false,
  debugOptions?: DebugOptions
): CombatState {
  const log: CombatLogEntry[] = [];
  
  // Add boss intro dialogue if applicable
  if (isBoss && encounter.enemies.length > 0) {
    const bossId = encounter.enemies[0].id;
    const dialogue = getBossDialogue(bossId);
    if (dialogue) {
      dialogue.intro.forEach((line) => {
        log.push({ message: line, type: "dialogue" });
      });
    }
  }
  
  log.push({ 
    message: isBoss ? "Boss battle begins!" : "Combat begins!", 
    type: "system" 
  });
  
  // Build initial turn order based on focus (speed) stat
  const turnOrder = buildTurnOrder(party, encounter);
  
  return {
    party,
    encounter,
    turn: 1,
    phase: "select-action",
    turnOrder,
    currentTurnIndex: 0,
    pendingAction: undefined,
    log,
    isBossFight: isBoss,
    debugOptions,
  };
}

/**
 * Build turn order queue based on focus stat (higher focus = acts first)
 * Uses character index as a tie-breaker for consistent ordering
 */
function buildTurnOrder(party: PartyState, encounter: EncounterState): TurnOrderEntry[] {
  const entries: TurnOrderEntry[] = [];
  
  // Add all alive party members
  party.members.forEach((member, index) => {
    if (member.alive) {
      // Use negative index as tie-breaker so lower index acts first when focus is equal
      const speed = member.stats.focus + (index * 0.001);
      entries.push({ isPlayer: true, index, speed });
    }
  });
  
  // Add all alive enemies
  encounter.enemies.forEach((enemy, index) => {
    if (enemy.alive) {
      // Use negative index as tie-breaker, offset by 0.1 to ensure enemies act after players with same focus
      const speed = enemy.stats.focus + (index * 0.001) - 0.1;
      entries.push({ isPlayer: false, index, speed });
    }
  });
  
  // Sort by speed descending (highest speed acts first)
  entries.sort((a, b) => b.speed - a.speed);
  
  return entries;
}

export function addCombatLog(
  state: CombatState,
  message: string,
  type?: CombatLogEntry["type"]
): void {
  state.log.push({ message, type });
  // Keep log at reasonable size
  if (state.log.length > 50) {
    state.log.shift();
  }
}

export function getAlivePartyMembers(party: PartyState): CharacterState[] {
  return party.members.filter((member) => member.alive);
}

export function getAliveEnemies(encounter: EncounterState): EnemyState[] {
  return encounter.enemies.filter((enemy) => enemy.alive);
}

export function isPartyDefeated(party: PartyState): boolean {
  return getAlivePartyMembers(party).length === 0;
}

export function isEncounterDefeated(encounter: EncounterState): boolean {
  return getAliveEnemies(encounter).length === 0;
}

export function applyStatusEffect(
  participant: CharacterState | EnemyState,
  statusId: string,
  _duration: number // Duration tracking not yet implemented - TODO: Add turn-based duration system
): void {
  // Check if status already exists
  const existing = participant.statusEffects.findIndex(
    (s) => s === statusId
  );
  
  if (existing >= 0) {
    // Status already applied, don't stack
    return;
  }
  
  participant.statusEffects.push(statusId);
}

export function removeStatusEffect(
  participant: CharacterState | EnemyState,
  statusId: string
): void {
  const index = participant.statusEffects.indexOf(statusId);
  if (index >= 0) {
    participant.statusEffects.splice(index, 1);
  }
}

export function hasStatusEffect(
  participant: CharacterState | EnemyState,
  statusId: string
): boolean {
  return participant.statusEffects.includes(statusId);
}

/**
 * Get the current actor in combat based on turn order
 */
export function getCurrentActor(state: CombatState): { isPlayer: boolean; index: number } | null {
  if (state.currentTurnIndex >= state.turnOrder.length) {
    return null;
  }
  const entry = state.turnOrder[state.currentTurnIndex];
  return { isPlayer: entry.isPlayer, index: entry.index };
}

/**
 * Advance to the next actor in turn order
 * Returns true if we've completed a full round
 */
export function advanceToNextActor(state: CombatState): boolean {
  state.currentTurnIndex++;
  
  // If we've gone through all actors, start a new round
  if (state.currentTurnIndex >= state.turnOrder.length) {
    state.currentTurnIndex = 0;
    state.turn++;
    
    // Rebuild turn order for the new round (in case someone died or stats changed)
    state.turnOrder = buildTurnOrder(state.party, state.encounter);
    
    addCombatLog(state, `--- Turn ${state.turn} ---`, "system");
    return true;
  }
  
  return false;
}
