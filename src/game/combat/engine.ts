import type { CharacterState, PartyState, Stats } from "../state";

export type EnemyId = string;

export interface EnemyState {
  id: EnemyId;
  name: string;
  stats: Stats;
  statusEffects: string[];
  alive: boolean;
}

export interface EncounterState {
  enemies: EnemyState[];
}

export function isEnemyAlive(enemy: EnemyState): boolean {
  return enemy.alive;
}

export function isEncounterOver(encounter: EncounterState): boolean {
  return encounter.enemies.every((enemy) => !enemy.alive);
}

export function calculateHitChance(attacker: Stats, defender: Stats): number {
  const base = 0.7;
  const focusFactor = attacker.focus * 0.01;
  const defenseFactor = defender.defense * 0.01;
  const chance = base + focusFactor - defenseFactor;
  return Math.min(0.95, Math.max(0.1, chance));
}

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  damage: number;
}

export function performBasicAttack(
  attacker: Stats,
  defender: Stats,
  rng: () => number = Math.random
): AttackResult {
  const hitChance = calculateHitChance(attacker, defender);
  const roll = rng();
  if (roll > hitChance) {
    return { hit: false, critical: false, damage: 0 };
  }

  const critChance = 0.1;
  const critRoll = rng();
  const critical = critRoll < critChance;

  const baseDamage = Math.max(1, attacker.attack - Math.floor(defender.defense / 2));
  const damage = critical ? Math.floor(baseDamage * 1.5) : baseDamage;

  return { hit: true, critical, damage };
}

export function applyDamageToCharacter(
  character: CharacterState,
  damage: number
): CharacterState {
  const nextHp = Math.max(0, character.stats.hp - Math.max(0, damage));
  return {
    ...character,
    stats: {
      ...character.stats,
      hp: nextHp,
    },
    alive: nextHp > 0 ? character.alive : false,
  };
}

export function applyDamageToEnemy(
  enemy: EnemyState,
  damage: number
): EnemyState {
  const nextHp = Math.max(0, enemy.stats.hp - Math.max(0, damage));
  return {
    ...enemy,
    stats: {
      ...enemy.stats,
      hp: nextHp,
    },
    alive: nextHp > 0 ? enemy.alive : false,
  };
}

export interface CombatLogEntry {
  message: string;
}

export interface PlayerAttackOutcome {
  party: PartyState;
  encounter: EncounterState;
  log: CombatLogEntry[];
}

export function playerBasicAttackEnemy(
  party: PartyState,
  encounter: EncounterState,
  attackerIndex: number,
  targetIndex: number,
  rng?: () => number
): PlayerAttackOutcome {
  const attacker = party.members[attackerIndex];
  const target = encounter.enemies[targetIndex];

  if (!attacker || !attacker.alive) {
    return {
      party,
      encounter,
      log: [{ message: "Invalid attack: attacker unavailable or dead." }],
    };
  }

  if (!target || !target.alive) {
    return {
      party,
      encounter,
      log: [{ message: "Invalid attack: target unavailable or already down." }],
    };
  }

  const attackResult = performBasicAttack(attacker.stats, target.stats, rng);
  const updatedEnemy = applyDamageToEnemy(target, attackResult.damage);
  const updatedEnemies = encounter.enemies.map((enemy, index) =>
    index === targetIndex ? updatedEnemy : enemy
  );

  const logMessage = attackResult.hit
    ? `${attacker.name} hits ${target.name} for ${attackResult.damage}${
        attackResult.critical ? " (critical)" : ""
      }.`
    : `${attacker.name} misses ${target.name}.`;

  return {
    party,
    encounter: { enemies: updatedEnemies },
    log: [{ message: logMessage }],
  };
}
