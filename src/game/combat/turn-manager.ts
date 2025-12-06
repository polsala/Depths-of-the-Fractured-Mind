import type { CharacterState } from "../state";
import type { EnemyState } from "./engine";
import type { CombatState, CombatAction } from "./state";
import {
  addCombatLog,
  getAlivePartyMembers,
  getAliveEnemies,
  isPartyDefeated,
  isEncounterDefeated,
  hasStatusEffect,
  applyStatusEffect,
  removeStatusEffect,
} from "./state";
import { performBasicAttack, applyDamageToCharacter, applyDamageToEnemy } from "./engine";
import { getAbility, type Ability, type AbilityEffect } from "../abilities";
import { useItem } from "../inventory";
import { audioManager } from "../../ui/audio";
import { calculateExperienceReward, awardExperience } from "../experience";
import { ENEMIES } from "../enemies";
import { getBossDialogue } from "../boss-dialogues";

// Track which bosses have shown their low health dialogue
const lowHealthDialogueShown = new Set<string>();

function hasShownLowHealthDialogue(_state: CombatState, bossId: string): boolean {
  return lowHealthDialogueShown.has(bossId);
}

function markLowHealthDialogueShown(_state: CombatState, bossId: string): void {
  lowHealthDialogueShown.add(bossId);
}

export function selectNextCharacter(state: CombatState): void {
  const aliveMembers = getAlivePartyMembers(state.party);
  let nextIndex = state.selectedCharacterIndex + 1;
  
  // Find next alive character
  while (nextIndex < state.party.members.length) {
    if (state.party.members[nextIndex].alive) {
      state.selectedCharacterIndex = nextIndex;
      return;
    }
    nextIndex++;
  }
  
  // If we've gone through all characters, move to action phase
  if (state.playerActions.length === aliveMembers.length) {
    state.phase = "player-act";
  }
}

export function addPlayerAction(state: CombatState, action: CombatAction): void {
  state.playerActions.push(action);
  selectNextCharacter(state);
}

export function executePlayerActions(state: CombatState): void {
  for (const action of state.playerActions) {
    const character = state.party.members[action.actorIndex];
    if (!character || !character.alive) continue;
    
    // Check if character is stunned
    if (hasStatusEffect(character, "stunned")) {
      addCombatLog(state, `${character.name} is stunned and cannot act!`, "status");
      removeStatusEffect(character, "stunned");
      continue;
    }
    
    // Check if character is feared
    if (hasStatusEffect(character, "feared")) {
      const roll = Math.random();
      if (roll < 0.5) {
        addCombatLog(state, `${character.name} is too afraid to act!`, "status");
        continue;
      }
    }
    
    switch (action.type) {
      case "attack":
        executeBasicAttack(state, action);
        break;
      case "ability":
        executeAbility(state, action);
        break;
      case "item":
        executeItemUse(state, action);
        break;
      case "defend":
        executeDefend(state, action);
        break;
      case "flee":
        attemptFlee(state);
        break;
    }
  }
  
  // Clear actions for next turn
  state.playerActions = [];
  
  // Check victory
  if (isEncounterDefeated(state.encounter)) {
    state.phase = "victory";
    
    // Show boss victory dialogue if applicable
    if (state.isBossFight && state.encounter.enemies.length > 0) {
      const bossId = state.encounter.enemies[0].id;
      const dialogue = getBossDialogue(bossId);
      if (dialogue) {
        dialogue.victory.forEach((line) => {
          addCombatLog(state, line, "dialogue");
        });
      }
    }
    
    addCombatLog(state, "Victory! All enemies defeated!", "system");
    
    // Award experience
    const expRewards = state.encounter.enemies.map((enemy) => {
      const enemyData = ENEMIES[enemy.id];
      return enemyData?.expReward || 0;
    });
    
    const expReward = calculateExperienceReward(expRewards);
    const { leveledUp, leveledCharacters } = awardExperience(state.party, expReward.perCharacter);
    
    addCombatLog(state, `Gained ${expReward.perCharacter} experience!`, "system");
    
    if (leveledUp) {
      addCombatLog(
        state,
        `${leveledCharacters.join(", ")} leveled up!`,
        "system"
      );
    }
    
    audioManager.playSfx("ui_click"); // Victory sound
    return;
  }
  
  // Move to enemy phase
  state.phase = "enemy-act";
}

function executeBasicAttack(state: CombatState, action: CombatAction): void {
  const attacker = state.party.members[action.actorIndex];
  if (!attacker || action.targetIndex === undefined) return;
  
  const target = state.encounter.enemies[action.targetIndex];
  if (!target || !target.alive) return;
  
  const result = performBasicAttack(attacker.stats, target.stats);
  
  if (result.hit) {
    const updatedEnemy = applyDamageToEnemy(target, result.damage);
    state.encounter.enemies[action.targetIndex] = updatedEnemy;
    
    const critText = result.critical ? " (CRITICAL)" : "";
    addCombatLog(
      state,
      `${attacker.name} attacks ${target.name} for ${result.damage} damage${critText}!`,
      "damage"
    );
    
    if (!updatedEnemy.alive) {
      addCombatLog(state, `${target.name} has been defeated!`, "system");
    }
    
    // Play hit sound
    audioManager.playSfx(result.critical ? "hit_heavy" : "hit_light");
  } else {
    addCombatLog(state, `${attacker.name} attacks ${target.name} but misses!`, "damage");
  }
}

function executeAbility(state: CombatState, action: CombatAction): void {
  const caster = state.party.members[action.actorIndex];
  if (!caster || !action.abilityId) return;
  
  const ability = getAbility(action.abilityId);
  if (!ability) return;
  
  // Pay costs
  if (ability.cost.hp) {
    caster.stats.hp = Math.max(0, caster.stats.hp - ability.cost.hp);
  }
  if (ability.cost.sanity) {
    caster.stats.sanity = Math.max(0, caster.stats.sanity - ability.cost.sanity);
  }
  
  addCombatLog(state, `${caster.name} uses ${ability.name}!`, "system");
  
  // Apply effects based on target type
  applyAbilityEffects(state, ability, action.actorIndex, action.targetIndex);
  
  // Play ability sound
  audioManager.playSfx("hit_light");
}

function applyAbilityEffects(
  state: CombatState,
  ability: Ability,
  casterIndex: number,
  targetIndex?: number
): void {
  
  switch (ability.targetType) {
    case "self":
      applyEffectsToCharacter(state, ability.effects, casterIndex);
      break;
    case "ally":
      if (targetIndex !== undefined && targetIndex < state.party.members.length) {
        applyEffectsToCharacter(state, ability.effects, targetIndex);
      }
      break;
    case "all-allies":
      state.party.members.forEach((_, index) => {
        if (state.party.members[index].alive) {
          applyEffectsToCharacter(state, ability.effects, index);
        }
      });
      break;
    case "enemy":
      if (targetIndex !== undefined && targetIndex < state.encounter.enemies.length) {
        applyEffectsToEnemy(state, ability.effects, targetIndex);
      }
      break;
    case "all-enemies":
      state.encounter.enemies.forEach((_, index) => {
        if (state.encounter.enemies[index].alive) {
          applyEffectsToEnemy(state, ability.effects, index);
        }
      });
      break;
  }
}

function applyEffectsToCharacter(
  state: CombatState,
  effects: AbilityEffect[],
  characterIndex: number
): void {
  const character = state.party.members[characterIndex];
  if (!character) return;
  
  for (const effect of effects) {
    switch (effect.type) {
      case "heal":
        if (effect.value) {
          const healing = effect.value;
          const oldHp = character.stats.hp;
          character.stats.hp = Math.min(character.stats.maxHp, character.stats.hp + healing);
          const actualHealing = character.stats.hp - oldHp;
          if (actualHealing > 0) {
            addCombatLog(state, `${character.name} recovers ${actualHealing} HP!`, "heal");
          }
        }
        break;
      case "sanity-heal":
        if (effect.value) {
          const healing = effect.value;
          const oldSanity = character.stats.sanity;
          character.stats.sanity = Math.min(character.stats.maxSanity, character.stats.sanity + healing);
          const actualHealing = character.stats.sanity - oldSanity;
          if (actualHealing > 0) {
            addCombatLog(state, `${character.name} recovers ${actualHealing} Sanity!`, "sanity");
          }
        }
        break;
      case "buff":
        if (effect.stat && effect.value) {
          // Apply temporary buff (simplified - just add to stat for now)
          const statKey = effect.stat as keyof typeof character.stats;
          if (typeof character.stats[statKey] === "number") {
            (character.stats[statKey] as number) += effect.value;
            addCombatLog(
              state,
              `${character.name}'s ${effect.stat} increased by ${effect.value}!`,
              "status"
            );
          }
        }
        break;
      case "status":
        if (effect.statusEffect && effect.duration) {
          applyStatusEffect(character, effect.statusEffect, effect.duration);
          addCombatLog(
            state,
            `${character.name} is ${effect.statusEffect}!`,
            "status"
          );
        }
        break;
    }
  }
}

function applyEffectsToEnemy(
  state: CombatState,
  effects: AbilityEffect[],
  enemyIndex: number
): void {
  const enemy = state.encounter.enemies[enemyIndex];
  if (!enemy) return;
  
  for (const effect of effects) {
    switch (effect.type) {
      case "damage":
        if (effect.value) {
          const updatedEnemy = applyDamageToEnemy(enemy, effect.value);
          state.encounter.enemies[enemyIndex] = updatedEnemy;
          addCombatLog(state, `${enemy.name} takes ${effect.value} damage!`, "damage");
          
          if (!updatedEnemy.alive) {
            addCombatLog(state, `${enemy.name} has been defeated!`, "system");
          }
        }
        break;
      case "sanity-damage":
        if (effect.value) {
          enemy.stats.sanity = Math.max(0, enemy.stats.sanity - effect.value);
          addCombatLog(state, `${enemy.name} loses ${effect.value} Sanity!`, "sanity");
          audioManager.playSfx("sanity_tick");
        }
        break;
      case "debuff":
        if (effect.stat && effect.value) {
          const statKey = effect.stat as keyof typeof enemy.stats;
          if (typeof enemy.stats[statKey] === "number") {
            (enemy.stats[statKey] as number) = Math.max(0, (enemy.stats[statKey] as number) - effect.value);
            addCombatLog(
              state,
              `${enemy.name}'s ${effect.stat} decreased by ${effect.value}!`,
              "status"
            );
          }
        }
        break;
      case "status":
        if (effect.statusEffect && effect.duration) {
          applyStatusEffect(enemy, effect.statusEffect, effect.duration);
          addCombatLog(
            state,
            `${enemy.name} is ${effect.statusEffect}!`,
            "status"
          );
        }
        break;
    }
  }
}

function executeItemUse(state: CombatState, action: CombatAction): void {
  const user = state.party.members[action.actorIndex];
  if (!user || !action.itemId) return;
  
  const item = useItem(state.party.inventory, action.itemId);
  if (!item) {
    addCombatLog(state, `Failed to use ${action.itemId}`, "system");
    return;
  }
  
  addCombatLog(state, `${user.name} uses ${item.name}!`, "system");
  
  // Apply item effects
  if (action.targetIndex !== undefined) {
    const target = state.party.members[action.targetIndex];
    if (target) {
      applyItemEffect(state, item.id, target);
    }
  }
}

function applyItemEffect(state: CombatState, itemId: string, target: CharacterState): void {
  switch (itemId) {
    case "medkit":
      target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 15);
      addCombatLog(state, `${target.name} recovers 15 HP!`, "heal");
      break;
    case "sedative":
      target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + 10);
      addCombatLog(state, `${target.name} recovers 10 Sanity!`, "sanity");
      audioManager.playSfx("sanity_tick");
      break;
  }
}

function executeDefend(state: CombatState, action: CombatAction): void {
  const defender = state.party.members[action.actorIndex];
  if (!defender) return;
  
  // Temporarily boost defense
  defender.stats.defense += 5;
  addCombatLog(state, `${defender.name} takes a defensive stance!`, "status");
}

function attemptFlee(state: CombatState): void {
  // Can't flee from boss fights
  if (state.isBossFight) {
    addCombatLog(state, "You cannot flee from this battle!", "system");
    return;
  }
  
  const fleeChance = 0.5;
  if (Math.random() < fleeChance) {
    state.phase = "fled";
    addCombatLog(state, "Successfully fled from battle!", "system");
  } else {
    addCombatLog(state, "Failed to flee!", "system");
  }
}

export function executeEnemyTurn(state: CombatState): void {
  const aliveEnemies = getAliveEnemies(state.encounter);
  
  // Check for boss low health dialogue (only once per battle)
  if (state.isBossFight && aliveEnemies.length > 0) {
    const boss = aliveEnemies[0];
    const healthPercent = boss.stats.hp / boss.stats.maxHp;
    
    // Show low health dialogue at 30% HP (check if not already shown)
    if (healthPercent <= 0.3 && !hasShownLowHealthDialogue(state, boss.id)) {
      const dialogue = getBossDialogue(boss.id);
      if (dialogue && dialogue.lowHealth) {
        dialogue.lowHealth.forEach((line) => {
          addCombatLog(state, line, "dialogue");
        });
        markLowHealthDialogueShown(state, boss.id);
      }
    }
  }
  
  for (const enemy of aliveEnemies) {
    // Check if enemy is stunned
    if (hasStatusEffect(enemy, "stunned")) {
      addCombatLog(state, `${enemy.name} is stunned!`, "status");
      removeStatusEffect(enemy, "stunned");
      continue;
    }
    
    // Simple AI: pick random alive target
    const aliveParty = getAlivePartyMembers(state.party);
    if (aliveParty.length === 0) break;
    
    const targetIndex = Math.floor(Math.random() * state.party.members.length);
    const target = state.party.members[targetIndex];
    
    if (!target || !target.alive) continue;
    
    // Get enemy data to check abilities
    const enemyData = ENEMIES[enemy.id];
    if (enemyData && enemyData.abilities && enemyData.abilities.length > 0) {
      // 40% chance to use ability, higher for bosses
      const abilityChance = enemyData.type === "boss" ? 0.6 : 0.4;
      const useAbility = Math.random() < abilityChance;
      
      if (useAbility) {
        const abilityId = enemyData.abilities[Math.floor(Math.random() * enemyData.abilities.length)];
        executeEnemyAbility(state, enemy, targetIndex, abilityId);
      } else {
        executeEnemyBasicAttack(state, enemy, targetIndex);
      }
    } else {
      executeEnemyBasicAttack(state, enemy, targetIndex);
    }
  }
  
  // Apply status effects (poison, bleeding, etc.)
  applyStatusEffects(state);
  
  // Check defeat
  if (isPartyDefeated(state.party)) {
    state.phase = "defeat";
    addCombatLog(state, "The party has been defeated...", "system");
    return;
  }
  
  // Start new turn
  state.turn++;
  state.phase = "player-select";
  state.selectedCharacterIndex = 0;
  
  // Find first alive character
  for (let i = 0; i < state.party.members.length; i++) {
    if (state.party.members[i].alive) {
      state.selectedCharacterIndex = i;
      break;
    }
  }
  
  addCombatLog(state, `--- Turn ${state.turn} ---`, "system");
}

function executeEnemyBasicAttack(
  state: CombatState,
  enemy: EnemyState,
  targetIndex: number
): void {
  const target = state.party.members[targetIndex];
  if (!target) return;
  
  const result = performBasicAttack(enemy.stats, target.stats);
  
  if (result.hit) {
    const updatedCharacter = applyDamageToCharacter(target, result.damage);
    state.party.members[targetIndex] = updatedCharacter;
    
    const critText = result.critical ? " (CRITICAL)" : "";
    addCombatLog(
      state,
      `${enemy.name} attacks ${target.name} for ${result.damage} damage${critText}!`,
      "damage"
    );
    
    if (!updatedCharacter.alive) {
      addCombatLog(state, `${target.name} has fallen!`, "system");
      audioManager.playSfx("sanity_break");
    } else {
      audioManager.playSfx(result.critical ? "hit_heavy" : "hit_light");
    }
  } else {
    addCombatLog(state, `${enemy.name} attacks ${target.name} but misses!`, "damage");
  }
}

function executeEnemyAbility(
  state: CombatState,
  enemy: EnemyState,
  targetIndex: number,
  abilityId: string
): void {
  const ability = getAbility(abilityId);
  if (!ability) {
    // Fallback to basic attack
    executeEnemyBasicAttack(state, enemy, targetIndex);
    return;
  }
  
  addCombatLog(state, `${enemy.name} uses ${ability.name}!`, "system");
  
  // Apply ability effects
  switch (ability.targetType) {
    case "enemy": // From enemy perspective, this targets party
    case "self":
      if (ability.targetType === "self") {
        applyEnemyAbilityToSelf(state, ability.effects, enemy);
      } else {
        applyEnemyAbilityToParty(state, ability.effects, targetIndex);
      }
      break;
    case "all-enemies": // From enemy perspective, this targets all party
      state.party.members.forEach((_, index) => {
        if (state.party.members[index].alive) {
          applyEnemyAbilityToParty(state, ability.effects, index);
        }
      });
      break;
  }
  
  audioManager.playSfx("hit_light");
}

function applyEnemyAbilityToSelf(
  state: CombatState,
  effects: AbilityEffect[],
  enemy: EnemyState
): void {
  for (const effect of effects) {
    if (effect.type === "heal" && effect.value) {
      const oldHp = enemy.stats.hp;
      enemy.stats.hp = Math.min(enemy.stats.maxHp, enemy.stats.hp + effect.value);
      const actualHealing = enemy.stats.hp - oldHp;
      if (actualHealing > 0) {
        addCombatLog(state, `${enemy.name} recovers ${actualHealing} HP!`, "heal");
      }
    }
  }
}

function applyEnemyAbilityToParty(
  state: CombatState,
  effects: AbilityEffect[],
  targetIndex: number
): void {
  const target = state.party.members[targetIndex];
  if (!target || !target.alive) return;
  
  for (const effect of effects) {
    switch (effect.type) {
      case "damage":
        if (effect.value) {
          const updatedCharacter = applyDamageToCharacter(target, effect.value);
          state.party.members[targetIndex] = updatedCharacter;
          addCombatLog(state, `${target.name} takes ${effect.value} damage!`, "damage");
          
          if (!updatedCharacter.alive) {
            addCombatLog(state, `${target.name} has fallen!`, "system");
            audioManager.playSfx("sanity_break");
          } else {
            audioManager.playSfx("hit_light");
          }
        }
        break;
      case "sanity-damage":
        if (effect.value) {
          target.stats.sanity = Math.max(0, target.stats.sanity - effect.value);
          addCombatLog(state, `${target.name} loses ${effect.value} Sanity!`, "sanity");
          audioManager.playSfx("sanity_tick");
        }
        break;
      case "debuff":
        if (effect.stat && effect.value) {
          const statKey = effect.stat as keyof typeof target.stats;
          if (typeof target.stats[statKey] === "number") {
            (target.stats[statKey] as number) = Math.max(0, (target.stats[statKey] as number) - effect.value);
            addCombatLog(
              state,
              `${target.name}'s ${effect.stat} decreased by ${effect.value}!`,
              "status"
            );
          }
        }
        break;
      case "status":
        if (effect.statusEffect && effect.duration) {
          applyStatusEffect(target, effect.statusEffect, effect.duration);
          addCombatLog(
            state,
            `${target.name} is ${effect.statusEffect}!`,
            "status"
          );
        }
        break;
    }
  }
}

function applyStatusEffects(state: CombatState): void {
  // Apply poison, bleeding, etc.
  for (const member of state.party.members) {
    if (!member.alive) continue;
    
    if (hasStatusEffect(member, "poisoned")) {
      const damage = 3;
      member.stats.hp = Math.max(0, member.stats.hp - damage);
      addCombatLog(state, `${member.name} takes ${damage} poison damage!`, "damage");
      
      if (member.stats.hp === 0) {
        member.alive = false;
        addCombatLog(state, `${member.name} has fallen!`, "system");
      }
    }
    
    if (hasStatusEffect(member, "bleeding")) {
      const damage = 2;
      member.stats.hp = Math.max(0, member.stats.hp - damage);
      addCombatLog(state, `${member.name} takes ${damage} bleeding damage!`, "damage");
      
      if (member.stats.hp === 0) {
        member.alive = false;
        addCombatLog(state, `${member.name} has fallen!`, "system");
      }
    }
  }
  
  // Same for enemies
  for (const enemy of state.encounter.enemies) {
    if (!enemy.alive) continue;
    
    if (hasStatusEffect(enemy, "poisoned")) {
      const damage = 3;
      enemy.stats.hp = Math.max(0, enemy.stats.hp - damage);
      addCombatLog(state, `${enemy.name} takes ${damage} poison damage!`, "damage");
      
      if (enemy.stats.hp === 0) {
        enemy.alive = false;
        addCombatLog(state, `${enemy.name} has been defeated!`, "system");
      }
    }
  }
}
