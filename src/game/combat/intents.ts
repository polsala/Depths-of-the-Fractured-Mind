import { gameRandom } from "../random";
import { ENEMIES } from "../enemies";
import { getAbility } from "../abilities";
import type { PartyState } from "../state";
import type { EncounterState } from "./engine";

export interface EnemyIntent {
  targetIndex: number;
  abilityId?: string;
}

// Intent is rolled once per round, before the player acts. This makes guarding,
// healing and focus-fire decisions informed rather than a blind guess.
export function planEnemyIntents(party: PartyState, encounter: EncounterState): Record<number, EnemyIntent> {
  const result: Record<number, EnemyIntent> = {};
  const living = party.members.map((member, index) => member.alive ? index : -1).filter((index) => index >= 0);
  const taunting = living.filter((index) => party.members[index].statusEffects.includes("taunting"));
  const alive = taunting.length ? taunting : living;
  if (!alive.length) return result;
  encounter.enemies.forEach((enemy, index) => {
    if (!enemy.alive) return;
    const targetIndex = alive[Math.floor(gameRandom() * alive.length)];
    const data = ENEMIES[enemy.id];
    const options = (data?.abilities ?? []).filter((id) => {
      const ability = getAbility(id);
      return ability && ability.effects.length > 0 &&
        (ability.targetType !== "self" || enemy.stats.hp < enemy.stats.maxHp);
    });
    const abilityId = options.length && gameRandom() < (data?.type === "boss" ? 0.55 : 0.4)
      ? options[Math.floor(gameRandom() * options.length)] : undefined;
    result[index] = { targetIndex, abilityId };
  });
  return result;
}
