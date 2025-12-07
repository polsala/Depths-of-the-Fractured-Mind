import type { GameState } from "../state";
import { getRandomEnemy, getBossForDepth, type Enemy } from "../enemies";
import type { EnemyState, EncounterState } from "./engine";
import { createCombatState } from "./state";

export function createEnemyState(enemy: Enemy): EnemyState {
  return {
    id: enemy.id,
    name: enemy.name,
    stats: { ...enemy.stats },
    statusEffects: [],
    alive: true,
  };
}

export function generateRandomEncounter(depth: number): EncounterState | null {
  const roll = Math.random();
  
  // Determine number of enemies based on depth
  let numEnemies = 1;
  if (roll < 0.3) {
    numEnemies = 1;
  } else if (roll < 0.7) {
    numEnemies = 2;
  } else {
    numEnemies = 3;
  }
  
  const enemies: EnemyState[] = [];
  for (let i = 0; i < numEnemies; i++) {
    const enemy = getRandomEnemy(depth, true);
    if (enemy) {
      enemies.push(createEnemyState(enemy));
    }
  }
  
  if (enemies.length === 0) return null;
  
  return { enemies };
}

export function generateBossEncounter(depth: number): EncounterState | null {
  const boss = getBossForDepth(depth);
  if (!boss) return null;
  
  return {
    enemies: [createEnemyState(boss)],
  };
}

export function shouldTriggerEncounter(
  state: GameState,
  encounterChance: number = 0.2
): boolean {
  // Don't trigger if already in an event or combat
  if (state.mode !== "exploration") return false;
  if (state.debugOptions?.disableEncounters) return false;
  
  // Random check
  return Math.random() < encounterChance;
}

export function triggerEncounter(state: GameState, depth?: number): GameState {
  const actualDepth = depth || state.location.depth;
  const encounter = generateRandomEncounter(actualDepth);
  
  if (!encounter) return state;
  
  const combatState = createCombatState(state.party, encounter, false, state.debugOptions, actualDepth);
  
  return {
    ...state,
    mode: "combat",
    combatState,
    currentEncounterId: `encounter_${Date.now()}`,
  };
}
