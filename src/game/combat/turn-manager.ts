import type { CharacterState } from "../state";
import type { EnemyState } from "./engine";
import type { CombatState, CombatAction } from "./state";
import {
  addCombatLog,
  isPartyDefeated,
  isEncounterDefeated,
  hasStatusEffect,
  applyStatusEffect,
  removeStatusEffect,
  getCurrentActor,
  advanceToNextActor,
} from "./state";
import { performBasicAttack, applyDamageToCharacter, applyDamageToEnemy } from "./engine";
import { getAbility, type Ability, type AbilityEffect } from "../abilities";
import { useItem, addItem, ITEMS } from "../inventory";
import { audioManager } from "../../ui/audio";
import { calculateExperienceReward, awardExperience, getCharacterExperience, getCharacterLevel, getExpToNextLevel } from "../experience";
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

// Helper function for type-safe stat modification
function modifyStat(
  stats: CharacterState["stats"] | EnemyState["stats"],
  statName: string,
  value: number,
  operation: "add" | "subtract" = "add"
): boolean {
  const stat = statName as keyof typeof stats;
  if (typeof stats[stat] === "number") {
    const current = stats[stat] as number;
    (stats[stat] as number) = operation === "add" 
      ? current + value 
      : Math.max(0, current - value);
    return true;
  }
  return false;
}

/**
 * Set the action for the current actor and execute it
 */
export function submitAction(state: CombatState, action: CombatAction): void {
  state.pendingAction = action;
  state.phase = "execute-action";
  executeCurrentAction(state);
}

/**
 * Execute the action for the current actor and advance to next
 */
function executeCurrentAction(state: CombatState): void {
  const actor = getCurrentActor(state);
  if (!actor) return;
  
  if (actor.isPlayer) {
    executePlayerAction(state);
  } else {
    executeEnemyAction(state);
  }

  // If combat ended via flee, stop processing
  if (state.phase === "fled") {
    return;
  }
  
  // Check for victory/defeat
  if (isEncounterDefeated(state.encounter)) {
    handleVictory(state);
    return;
  }
  
  if (isPartyDefeated(state.party)) {
    state.phase = "defeat";
    addCombatLog(state, "The party has been defeated...", "system");
    return;
  }
  
  // Advance to next actor
  advanceToNextActor(state);
  state.pendingAction = undefined;
  state.phase = "select-action";
  
  // Process all consecutive enemy turns
  processEnemyTurns(state);
}

/**
 * Process all consecutive enemy turns until we reach a player turn
 */
function processEnemyTurns(state: CombatState): void {
  let nextActor = getCurrentActor(state);
  
  while (nextActor && !nextActor.isPlayer) {
    executeEnemyAction(state);
    
    // Check for defeat after each enemy action
    if (isPartyDefeated(state.party)) {
      state.phase = "defeat";
      addCombatLog(state, "The party has been defeated...", "system");
      return;
    }
    
    // Check for victory
    if (isEncounterDefeated(state.encounter)) {
      handleVictory(state);
      return;
    }
    
    // Advance to next actor
    advanceToNextActor(state);
    nextActor = getCurrentActor(state);
  }
  
  state.phase = "select-action";
}

function executePlayerAction(state: CombatState): void {
  const action = state.pendingAction;
  if (!action) return;
  
  const character = state.party.members[action.actorIndex];
  if (!character || !character.alive) return;
  
  // Check if character is stunned
  if (hasStatusEffect(character, "stunned")) {
    addCombatLog(state, `${character.name} is stunned and cannot act!`, "status");
    removeStatusEffect(character, "stunned");
    return;
  }
  
  // Check if character is feared
  if (hasStatusEffect(character, "feared")) {
    const roll = Math.random();
    if (roll < 0.5) {
      addCombatLog(state, `${character.name} is too afraid to act!`, "status");
      return;
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

function executeEnemyAction(state: CombatState): void {
  const actor = getCurrentActor(state);
  if (!actor || actor.isPlayer) return;
  
  const enemy = state.encounter.enemies[actor.index];
  if (!enemy || !enemy.alive) return;
  
  // Check for boss low health dialogue
  if (state.isBossFight) {
    const healthPercent = enemy.stats.hp / enemy.stats.maxHp;
    if (healthPercent <= 0.3 && !hasShownLowHealthDialogue(state, enemy.id)) {
      const dialogue = getBossDialogue(enemy.id);
      if (dialogue && dialogue.lowHealth) {
        dialogue.lowHealth.forEach((line) => {
          addCombatLog(state, line, "dialogue");
        });
        markLowHealthDialogueShown(state, enemy.id);
      }
    }
  }
  
  // Check if enemy is stunned
  if (hasStatusEffect(enemy, "stunned")) {
    addCombatLog(state, `${enemy.name} is stunned!`, "status");
    removeStatusEffect(enemy, "stunned");
    return;
  }
  
  // Simple AI: pick random alive target
  const aliveTargets = state.party.members.filter(m => m.alive);
  if (aliveTargets.length === 0) return;
  
  const targetIndex = state.party.members.indexOf(
    aliveTargets[Math.floor(Math.random() * aliveTargets.length)]
  );
  
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
  
  // Apply status effects (poison, bleeding, etc.)
  applyStatusEffects(state);
}

function handleVictory(state: CombatState): void {
  state.phase = "victory";
  
  const beforeSnapshots = state.party.members.map((member) => ({
    id: member.id,
    name: member.name,
    level: getCharacterLevel(member),
    exp: getCharacterExperience(member),
    expToNext: getExpToNextLevel(member),
  }));

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
  const multiplier = state.debugOptions?.xpMultiplier ?? 1;
  const adjustedPerCharacter = Math.max(0, Math.floor(expReward.perCharacter * multiplier));
  const { leveledUp, leveledCharacters } = awardExperience(state.party, adjustedPerCharacter);
  
  addCombatLog(
    state,
    `Gained ${adjustedPerCharacter} experience${multiplier !== 1 ? ` (x${multiplier})` : ""}!`,
    "system"
  );
  
  if (leveledUp) {
    addCombatLog(
      state,
      `${leveledCharacters.join(", ")} leveled up!`,
      "system"
    );
  }
  
  const afterSnapshots = state.party.members.map((member) => ({
    id: member.id,
    name: member.name,
    level: getCharacterLevel(member),
    exp: getCharacterExperience(member),
    expToNext: getExpToNextLevel(member),
  }));

  const loot: Array<{ id: string; quantity: number }> = [];
  const depth = state.combatDepth ?? 1;
  // Consumable drops
  const lootTable = ["medkit", "sedative", "healing_potion", "sanity_tonic", "antidote", "bomb"];
  const dropRoll = Math.random();
  const dropChance = Math.min(0.8, 0.2 + state.encounter.enemies.length * 0.1);
  if (dropRoll < dropChance) {
    const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];
    const quantity = itemId === "bomb" ? 1 : 1 + Math.floor(Math.random() * 2);
    if (addItem(state.party.inventory, itemId, quantity)) {
      loot.push({ id: itemId, quantity });
      addCombatLog(state, `Found loot: ${quantity}x ${itemId}`, "system");
    }
  }

  // Equipment drops scale with depth; bosses guarantee a boss item
  const equipmentPool = Object.values(ITEMS).filter(
    (item) =>
      item.type === "equipment" &&
      item.equipment &&
      !item.equipment.bossOnly &&
      (item.equipment.depthTier ?? 1) <= depth
  );
  const bossPool = Object.values(ITEMS).filter(
    (item) =>
      item.type === "equipment" &&
      item.equipment &&
      item.equipment.bossOnly &&
      (item.equipment.depthTier ?? 1) <= depth
  );

  if (state.isBossFight) {
    const bossId = state.encounter.enemies[0]?.id;
    const bossMapping: Record<string, string[]> = {
      threshold_warden: ["warden_emblem"],
      keeper_of_records: ["records_ledger"],
      ward_physician: ["surgeons_toolroll"],
      mirror_self: ["mirror_shard", "executioner_blade"],
      the_engine_heart: ["engine_fragment"],
    };
    const specific = (bossId && bossMapping[bossId]) || [];
    const pool = specific.length > 0 ? specific : bossPool.map((i) => i.id);
    pool.forEach((itemId) => {
      if (addItem(state.party.inventory, itemId, 1)) {
        loot.push({ id: itemId, quantity: 1 });
        addCombatLog(state, `Boss dropped ${ITEMS[itemId]?.name || itemId}`, "system");
      }
    });
  } else {
    const equipChance = Math.min(0.5, 0.15 + depth * 0.08);
    if (Math.random() < equipChance && equipmentPool.length > 0) {
      const equip = equipmentPool[Math.floor(Math.random() * equipmentPool.length)];
      if (addItem(state.party.inventory, equip.id, 1)) {
        loot.push({ id: equip.id, quantity: 1 });
        addCombatLog(state, `Found equipment: ${equip.name}`, "system");
      }
    }
  }

  state.victorySummary = {
    expGained: adjustedPerCharacter,
    characters: afterSnapshots.map((after, idx) => ({
      id: after.id,
      name: after.name,
      levelBefore: beforeSnapshots[idx]?.level ?? after.level,
      levelAfter: after.level,
      expBefore: beforeSnapshots[idx]?.exp ?? 0,
      expAfter: after.exp,
      expToNextBefore: beforeSnapshots[idx]?.expToNext ?? after.expToNext,
      expToNextAfter: after.expToNext,
    })),
    loot,
  };
  
  audioManager.playSfx("ui_click"); // Victory sound
}

function executeBasicAttack(state: CombatState, action: CombatAction): void {
  const attacker = state.party.members[action.actorIndex];
  if (!attacker || action.targetIndex === undefined) return;
  
  const target = state.encounter.enemies[action.targetIndex];
  if (!target || !target.alive) return;
  
  const result = performBasicAttack(attacker.stats, target.stats);
  const damage = state.debugOptions?.oneHitKill ? target.stats.hp : result.damage;
  
  if (result.hit) {
    const updatedEnemy = applyDamageToEnemy(target, damage);
    state.encounter.enemies[action.targetIndex] = updatedEnemy;
    
    const critText = result.critical ? " (CRITICAL)" : "";
    addCombatLog(
      state,
      `${attacker.name} attacks ${target.name} for ${damage} damage${critText}!`,
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
    case "all":
      state.party.members.forEach((_, index) => {
        if (state.party.members[index].alive) {
          applyEffectsToCharacter(state, ability.effects, index);
        }
      });
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
          if (modifyStat(character.stats, effect.stat, effect.value, "add")) {
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
          const damage = state.debugOptions?.oneHitKill ? enemy.stats.hp : effect.value;
          const updatedEnemy = applyDamageToEnemy(enemy, damage);
          state.encounter.enemies[enemyIndex] = updatedEnemy;
          addCombatLog(state, `${enemy.name} takes ${damage} damage!`, "damage");
          
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
          if (modifyStat(enemy.stats, effect.stat, effect.value, "subtract")) {
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
  if (action.targetIsEnemy) {
    const enemy = action.targetIndex !== undefined ? state.encounter.enemies[action.targetIndex] : undefined;
    applyItemEffect(state, item.id, undefined, enemy, action.targetIndex);
    return;
  }
  
  if (action.targetIndex !== undefined) {
    const target = state.party.members[action.targetIndex];
    if (target) {
      applyItemEffect(state, item.id, target);
    }
  } else {
    applyItemEffect(state, item.id, user);
  }
}

function applyItemEffect(
  state: CombatState,
  itemId: string,
  target?: CharacterState,
  enemyTarget?: EnemyState,
  enemyIndex?: number
): void {
  switch (itemId) {
    case "medkit":
      if (target) {
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 15);
        addCombatLog(state, `${target.name} recovers 15 HP!`, "heal");
      }
      break;
    case "sedative":
      if (target) {
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + 10);
        addCombatLog(state, `${target.name} recovers 10 Sanity!`, "sanity");
        audioManager.playSfx("sanity_tick");
      }
      break;
    case "healing_potion": {
      const heal = 20;
      if (target) {
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal);
        addCombatLog(state, `${target.name} recovers ${heal} HP!`, "heal");
      }
      break;
    }
    case "greater_healing_potion": {
      const heal = 40;
      if (target) {
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal);
        addCombatLog(state, `${target.name} recovers ${heal} HP!`, "heal");
      }
      break;
    }
    case "sanity_tonic": {
      const heal = 20;
      if (target) {
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + heal);
        addCombatLog(state, `${target.name} recovers ${heal} Sanity!`, "sanity");
        audioManager.playSfx("sanity_tick");
      }
      break;
    }
    case "antidote":
      if (target) {
        removeStatusEffect(target, "poisoned");
        addCombatLog(state, `${target.name} is cured of poison.`, "status");
      }
      break;
    case "focus_draught":
      if (target) {
        target.stats.focus += 2;
        addCombatLog(state, `${target.name}'s focus increases!`, "status");
      }
      break;
    case "bomb": {
      // Bombs target enemies; apply to first alive enemy
      const enemy = enemyTarget ?? state.encounter.enemies.find((e) => e.alive);
      if (enemy) {
        const damage = state.debugOptions?.oneHitKill ? enemy.stats.hp : 35;
        const idx = enemyIndex ?? state.encounter.enemies.indexOf(enemy);
        const updatedEnemy = applyDamageToEnemy(enemy, damage);
        if (idx >= 0) {
          state.encounter.enemies[idx] = updatedEnemy;
        }
        addCombatLog(state, `${enemy.name} takes ${damage} bomb damage!`, "damage");
        if (!updatedEnemy.alive) {
          addCombatLog(state, `${enemy.name} has been defeated!`, "system");
        }
      }
      break;
    }
    case "smoke_bomb":
      if (!state.isBossFight && Math.random() < 0.9) {
        state.phase = "fled";
        addCombatLog(state, "The smoke screen lets you escape!", "system");
      } else {
        addCombatLog(state, "The smoke disperses with little effect.", "system");
      }
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
  
  const aliveParty = state.party.members.filter((m) => m.alive);
  const aliveEnemies = state.encounter.enemies.filter((e) => e.alive);
  const avgPlayerSpeed =
    aliveParty.reduce((sum, p) => sum + p.stats.focus, 0) /
    Math.max(1, aliveParty.length);
  const avgEnemySpeed =
    aliveEnemies.reduce((sum, e) => sum + e.stats.focus, 0) /
    Math.max(1, aliveEnemies.length);
  
  // Flee chance scales with speed advantage; clamp between 10% and 95%
  const speedDelta = avgPlayerSpeed - avgEnemySpeed;
  const fleeChance = Math.min(0.95, Math.max(0.1, 0.4 + speedDelta * 0.03));
  if (Math.random() < fleeChance) {
    state.phase = "fled";
    addCombatLog(state, "Successfully fled from battle!", "system");
  } else {
    const percent = Math.round(fleeChance * 100);
    addCombatLog(state, `Failed to flee! (Chance was ${percent}%)`, "system");
  }
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
          if (modifyStat(target.stats, effect.stat, effect.value, "subtract")) {
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
