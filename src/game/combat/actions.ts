import type { PartyState } from "../state";
import type { EncounterState, CombatLogEntry, PlayerAttackOutcome } from "./engine";
import { playerBasicAttackEnemy } from "./engine";

export interface CombatContext {
  party: PartyState;
  encounter: EncounterState;
  log: CombatLogEntry[];
}

export function createCombatContext(
  party: PartyState,
  encounter: EncounterState
): CombatContext {
  return {
    party,
    encounter,
    log: [],
  };
}

export function playerAttack(
  context: CombatContext,
  attackerIndex: number,
  targetIndex: number,
  rng?: () => number
): CombatContext {
  const outcome: PlayerAttackOutcome = playerBasicAttackEnemy(
    context.party,
    context.encounter,
    attackerIndex,
    targetIndex,
    rng
  );

  return {
    party: outcome.party,
    encounter: outcome.encounter,
    log: [...context.log, ...outcome.log],
  };
}

// TODO: integrate with GameState (enter combat mode, store current encounter).
// TODO: add enemy turns and round resolution.
