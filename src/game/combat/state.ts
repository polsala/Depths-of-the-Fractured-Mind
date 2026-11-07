import type { CharacterState, DebugOptions, PartyState } from "../state";
import type { EnemyState, EncounterState } from "./engine";
import { getBossDialogue } from "../boss-dialogues";
import { planEnemyIntents, type EnemyIntent } from "./intents";

export type CombatActionType = "attack" | "ability" | "item" | "defend" | "flee";

export interface CombatAction {
  type: CombatActionType;
  actorIndex: number;
  targetIndex?: number;
  abilityId?: string;
  itemId?: string;
  isPlayerAction: boolean;
  targetIsEnemy?: boolean;
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
  shownLowHealthDialogues: string[];
  isBossFight: boolean;
  debugOptions?: DebugOptions;
  combatDepth?: number;
  enemyIntents?: Record<number, EnemyIntent>;
  lastEnemyActedIndex?: number;
  timedModifiers?: Array<{ isPlayer: boolean; index: number; stat: keyof CharacterState["stats"]; delta: number; expiresOnTurn: number }>;
  victorySummary?: {
    expGained: number;
    characters: Array<{
      id: string;
      name: string;
      levelBefore: number;
      levelAfter: number;
      expBefore: number;
      expAfter: number;
      expToNextBefore: number;
      expToNextAfter: number;
    }>;
    loot?: Array<{ id: string; quantity: number }>;
  };
}

export interface CombatLogEntry {
  message: string;
  type?: "damage" | "heal" | "sanity" | "status" | "system" | "dialogue";
}

export function createCombatState(
  party: PartyState,
  encounter: EncounterState,
  isBoss: boolean = false,
  debugOptions?: DebugOptions,
  combatDepth?: number
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
  // The first exchange is a player opening. Later rounds use focus order.
  turnOrder.sort((a, b) => Number(b.isPlayer) - Number(a.isPlayer) || b.speed - a.speed);
  
  return {
    party,
    encounter,
    shownLowHealthDialogues: [],
    turn: 1,
    phase: "select-action",
    turnOrder,
    currentTurnIndex: 0,
    pendingAction: undefined,
    log,
    isBossFight: isBoss,
    debugOptions,
    combatDepth,
    enemyIntents: planEnemyIntents(party, encounter),
    timedModifiers: [],
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
  duration: number
): void {
  // Check if status already exists
  const existing = participant.statusEffects.findIndex(
    (s) => s === statusId
  );
  
  if (existing >= 0) {
    participant.statusTurns ??= {};
    participant.statusTurns[statusId] = Math.max(participant.statusTurns[statusId] ?? 0, duration);
    return;
  }
  
  participant.statusEffects.push(statusId);
  participant.statusTurns ??= {};
  participant.statusTurns[statusId] = duration;
}

export function removeStatusEffect(
  participant: CharacterState | EnemyState,
  statusId: string
): void {
  const index = participant.statusEffects.indexOf(statusId);
  if (index >= 0) {
    participant.statusEffects.splice(index, 1);
  }
  if (participant.statusTurns) delete participant.statusTurns[statusId];
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
export function advanceToNextActor(state: CombatState, onNewRound?: (state: CombatState) => void): boolean {
  let newRound = false;
  for (let n = 0; n <= state.turnOrder.length; n++) {
    state.currentTurnIndex++;
    if (state.currentTurnIndex >= state.turnOrder.length) {
      state.currentTurnIndex = 0;
      state.turn++;
      // Resolve expiring effects before ordering and telegraphing the new round.
      onNewRound?.(state);
      state.turnOrder = buildTurnOrder(state.party, state.encounter);
      state.enemyIntents = planEnemyIntents(state.party, state.encounter);
      addCombatLog(state, `--- Turn ${state.turn} ---`, "system");
      newRound = true;
    }
    const actor = state.turnOrder[state.currentTurnIndex];
    if (!actor || (actor.isPlayer ? state.party.members[actor.index] : state.encounter.enemies[actor.index])?.alive) break;
  }
  return newRound;
}
