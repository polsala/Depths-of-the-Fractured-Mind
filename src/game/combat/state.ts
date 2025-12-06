import type { CharacterState, PartyState } from "../state";
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

export interface CombatState {
  party: PartyState;
  encounter: EncounterState;
  turn: number;
  phase: "player-select" | "player-act" | "enemy-act" | "victory" | "defeat" | "fled";
  selectedCharacterIndex: number;
  log: CombatLogEntry[];
  playerActions: CombatAction[];
  isBossFight: boolean;
}

export interface CombatLogEntry {
  message: string;
  type?: "damage" | "heal" | "sanity" | "status" | "system" | "dialogue";
}

export function createCombatState(
  party: PartyState,
  encounter: EncounterState,
  isBoss: boolean = false
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
  
  return {
    party,
    encounter,
    turn: 1,
    phase: "player-select",
    selectedCharacterIndex: 0,
    log,
    playerActions: [],
    isBossFight: isBoss,
  };
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
  _duration: number // Prefixed with _ to indicate unused but part of interface
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
