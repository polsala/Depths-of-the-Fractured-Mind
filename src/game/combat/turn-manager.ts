import { emitSound } from "../sound";
import { gameRandom } from "../random";
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
import { canUseAbility, getAbility, type Ability, type AbilityEffect } from "../abilities";
import { useItem, addItem, ITEMS } from "../inventory";
import { calculateExperienceReward, awardExperience, getCharacterExperience, getCharacterLevel, getExpToNextLevel } from "../experience";
import { ENEMIES } from "../enemies";
import { getBossDialogue } from "../boss-dialogues";

function hasShownLowHealthDialogue(state: CombatState, bossId: string): boolean {
  return state.shownLowHealthDialogues.includes(bossId);
}

function markLowHealthDialogueShown(state: CombatState, bossId: string): void {
  state.shownLowHealthDialogues.push(bossId);
}

function changeTimedStat(state: CombatState, isPlayer: boolean, index: number,
  stat: keyof CharacterState["stats"], value: number, duration = 1): void {
  const target = isPlayer ? state.party.members[index] : state.encounter.enemies[index];
  if (!target || !["attack", "defense", "focus", "will"].includes(stat)) return;
  const before = target.stats[stat];
  target.stats[stat] = Math.max(0, before + value);
  state.timedModifiers ??= [];
  state.timedModifiers.push({ isPlayer, index, stat, delta: target.stats[stat] - before,
    expiresOnTurn: state.turn + Math.max(1, duration) });
}

export function clearCombatModifiers(state: CombatState): void {
  for (const modifier of state.timedModifiers ?? []) {
    const target = modifier.isPlayer ? state.party.members[modifier.index] : state.encounter.enemies[modifier.index];
    if (target) target.stats[modifier.stat] = Math.max(0, target.stats[modifier.stat] - modifier.delta);
  }
  state.timedModifiers = [];
  for (const member of state.party.members) removeStatusEffect(member, "guarded");
}

function tickRoundEffects(state: CombatState): void {
  const active = state.timedModifiers ?? [];
  state.timedModifiers = active.filter((modifier) => {
    if (modifier.expiresOnTurn > state.turn) return true;
    const target = modifier.isPlayer ? state.party.members[modifier.index] : state.encounter.enemies[modifier.index];
    if (target) target.stats[modifier.stat] = Math.max(0, target.stats[modifier.stat] - modifier.delta);
    return false;
  });
  for (const participant of [...state.party.members, ...state.encounter.enemies]) {
    if (!participant.alive) continue;
    for (const status of [...participant.statusEffects]) {
      if (status === "guarded" || status === "stunned") continue;
      const damage = status === "poisoned" ? 3 : status === "bleeding" ? 2 : 0;
      if (damage) {
        participant.stats.hp = Math.max(0, participant.stats.hp - damage);
        addCombatLog(state, `${participant.name} takes ${damage} ${status} damage!`, "damage");
        if (participant.stats.hp === 0) {
          participant.alive = false;
          addCombatLog(state, `${participant.name} has fallen!`, "system");
        }
      }
      participant.statusTurns ??= {};
      const remaining = (participant.statusTurns[status] ?? 1) - 1;
      if (remaining <= 0) removeStatusEffect(participant, status);
      else participant.statusTurns[status] = remaining;
    }
  }
}

/**
 * Set the action for the current actor and execute it
 */
export function submitAction(state: CombatState, action: CombatAction): void {
  const current = getCurrentActor(state);
  if (!current?.isPlayer || current.index !== action.actorIndex || !action.isPlayerAction) return;
  if (action.type === "attack" && (action.targetIndex === undefined || !state.encounter.enemies[action.targetIndex]?.alive)) return;
  if (action.type === "ability") {
    const caster = state.party.members[action.actorIndex];
    const ability = action.abilityId ? getAbility(action.abilityId) : undefined;
    if (!caster || !ability || ability.characterId !== caster.id || !canUseAbility(ability, caster) ||
        (ability.unlockLevel ?? 1) > getCharacterLevel(caster)) return;
    if (ability.targetType === "enemy" && (action.targetIndex === undefined || !state.encounter.enemies[action.targetIndex]?.alive)) return;
    if (ability.targetType === "ally" && (action.targetIndex === undefined || !state.party.members[action.targetIndex]?.alive)) return;
  }
  if (action.type === "item") {
    const itemId = action.itemId ?? "";
    const item = ITEMS[itemId];
    if (!item || item.type !== "consumable" || !state.party.inventory.items.some((entry) =>
      entry.item.id === itemId && entry.quantity > 0)) return;
    if (itemId === "smoke_bomb") {
      if (state.isBossFight) { addCombatLog(state, "Smoke cannot escape a boss fight.", "system"); return; }
    } else if (itemId === "bomb") {
      if (action.targetIndex === undefined || !state.encounter.enemies[action.targetIndex]?.alive) return;
    } else {
      const target = state.party.members[action.targetIndex ?? action.actorIndex];
      if (!target?.alive) return;
      if (["medkit", "healing_potion", "greater_healing_potion"].includes(itemId) &&
          target.stats.hp >= target.stats.maxHp) { addCombatLog(state, `${target.name} already has full HP.`, "system"); return; }
      if (["sedative", "sanity_tonic"].includes(itemId) &&
          target.stats.sanity >= target.stats.maxSanity) { addCombatLog(state, `${target.name} already has full Sanity.`, "system"); return; }
      if (itemId === "antidote" && !hasStatusEffect(target, "poisoned")) return;
    }
  }
  state.lastEnemyActedIndex = undefined;
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
  advanceToNextActor(state, tickRoundEffects);
  if (isPartyDefeated(state.party)) { state.phase = "defeat"; return; }
  if (isEncounterDefeated(state.encounter)) { handleVictory(state); return; }
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
    advanceToNextActor(state, tickRoundEffects);
    if (isPartyDefeated(state.party)) { state.phase = "defeat"; return; }
    if (isEncounterDefeated(state.encounter)) { handleVictory(state); return; }
    nextActor = getCurrentActor(state);
  }
  
  state.phase = "select-action";
}

function executePlayerAction(state: CombatState): void {
  const action = state.pendingAction;
  if (!action) return;
  
  const character = state.party.members[action.actorIndex];
  if (!character || !character.alive) return;
  removeStatusEffect(character, "guarded");
  
  // Check if character is stunned
  if (hasStatusEffect(character, "stunned")) {
    addCombatLog(state, `${character.name} is stunned and cannot act!`, "status");
    removeStatusEffect(character, "stunned");
    return;
  }
  
  // Check if character is feared
  if (hasStatusEffect(character, "feared")) {
    const roll = gameRandom();
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
  state.lastEnemyActedIndex = actor.index;
  
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
  if (hasStatusEffect(enemy, "feared") && gameRandom() < 0.5) {
    addCombatLog(state, `${enemy.name} recoils in fear and loses its action!`, "status");
    return;
  }
  
  // Intents are committed at round start, so the player can respond tactically.
  const aliveTargets = state.party.members.filter(m => m.alive);
  if (aliveTargets.length === 0) return;
  const intent = state.enemyIntents?.[actor.index];
  const targetIndex = intent && state.party.members[intent.targetIndex]?.alive
    ? intent.targetIndex : state.party.members.indexOf(aliveTargets[0]);
  if (intent?.abilityId) executeEnemyAbility(state, enemy, targetIndex, intent.abilityId);
  else executeEnemyBasicAttack(state, enemy, targetIndex);
}

function handleVictory(state: CombatState): void {
  state.phase = "victory";
  clearCombatModifiers(state);
  
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
  const depth = state.combatDepth ?? 1;
  const currencyGain = Math.max(5, Math.floor((depth + state.encounter.enemies.length) * 8));
  state.party.inventory.money = (state.party.inventory.money || 0) + currencyGain;
  
  addCombatLog(
    state,
    `Gained ${adjustedPerCharacter} experience${multiplier !== 1 ? ` (x${multiplier})` : ""}!`,
    "system"
  );
  addCombatLog(state, `Found ${currencyGain} credits`, "system");
  
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
  // Consumable drops
  const lootTable = ["medkit", "sedative", "healing_potion", "sanity_tonic", "antidote", "bomb"];
  const dropRoll = gameRandom();
  const dropChance = Math.min(0.8, 0.2 + state.encounter.enemies.length * 0.1);
  if (dropRoll < dropChance) {
    const itemId = lootTable[Math.floor(gameRandom() * lootTable.length)];
    const quantity = itemId === "bomb" ? 1 : 1 + Math.floor(gameRandom() * 2);
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
    if (gameRandom() < equipChance && equipmentPool.length > 0) {
      const equip = equipmentPool[Math.floor(gameRandom() * equipmentPool.length)];
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
  
  emitSound("ui_click"); // Victory sound
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
    emitSound(result.critical ? "hit_heavy" : "hit_light");
  } else {
    addCombatLog(state, `${attacker.name} attacks ${target.name} but misses!`, "damage");
  }
}

function executeAbility(state: CombatState, action: CombatAction): void {
  const caster = state.party.members[action.actorIndex];
  if (!caster || !action.abilityId) return;
  
  const ability = getAbility(action.abilityId);
  if (!ability || ability.characterId !== caster.id || !canUseAbility(ability, caster)) return;
  
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
  emitSound("hit_light");
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
          if (["attack", "defense", "focus", "will"].includes(effect.stat)) {
            changeTimedStat(state, true, characterIndex, effect.stat, effect.value, effect.duration);
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
          if (effect.statusEffect === "taunting") {
            for (const intent of Object.values(state.enemyIntents ?? {})) intent.targetIndex = characterIndex;
          }
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
  let enemy = state.encounter.enemies[enemyIndex];
  if (!enemy) return;
  
  for (const effect of effects) {
    if (!enemy.alive) break;
    switch (effect.type) {
      case "damage":
        if (effect.value) {
          const damage = state.debugOptions?.oneHitKill ? enemy.stats.hp : effect.value;
          const updatedEnemy = applyDamageToEnemy(enemy, damage);
          state.encounter.enemies[enemyIndex] = updatedEnemy;
          enemy = updatedEnemy;
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
          emitSound("sanity_tick");
        }
        break;
      case "debuff":
        if (effect.stat && effect.value) {
          if (["attack", "defense", "focus", "will"].includes(effect.stat)) {
            changeTimedStat(state, false, enemyIndex, effect.stat, -effect.value, effect.duration);
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
          if (effect.statusEffect === "stunned" && ENEMIES[enemy.id]?.type === "boss") {
            if ((enemy.stunResistUntilTurn ?? 0) > state.turn) {
              addCombatLog(state, `${enemy.name} resists another stun this round!`, "status");
              break;
            }
            enemy.stunResistUntilTurn = state.turn + 3;
          }
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
        const healed = Math.min(15, target.stats.maxHp - target.stats.hp);
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 15);
        addCombatLog(state, `${target.name} recovers ${healed} HP!`, "heal");
      }
      break;
    case "sedative":
      if (target) {
        const healed = Math.min(10, target.stats.maxSanity - target.stats.sanity);
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + 10);
        addCombatLog(state, `${target.name} recovers ${healed} Sanity!`, "sanity");
        emitSound("sanity_tick");
      }
      break;
    case "healing_potion": {
      const heal = 20;
      if (target) {
        const actual = Math.min(heal, target.stats.maxHp - target.stats.hp);
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal);
        addCombatLog(state, `${target.name} recovers ${actual} HP!`, "heal");
      }
      break;
    }
    case "greater_healing_potion": {
      const heal = 40;
      if (target) {
        const actual = Math.min(heal, target.stats.maxHp - target.stats.hp);
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + heal);
        addCombatLog(state, `${target.name} recovers ${actual} HP!`, "heal");
      }
      break;
    }
    case "sanity_tonic": {
      const heal = 20;
      if (target) {
        const actual = Math.min(heal, target.stats.maxSanity - target.stats.sanity);
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + heal);
        addCombatLog(state, `${target.name} recovers ${actual} Sanity!`, "sanity");
        emitSound("sanity_tick");
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
        changeTimedStat(state, true, state.party.members.indexOf(target), "focus", 2, 3);
        addCombatLog(state, `${target.name}'s focus increases for 3 rounds!`, "status");
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
      if (!state.isBossFight && gameRandom() < 0.9) {
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
  applyStatusEffect(defender, "guarded", 1);
  addCombatLog(state, `${defender.name} guards against the next attacks until their turn. Incoming HP damage is halved.`, "status");
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
  if (gameRandom() < fleeChance) {
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
  const actualDamage = hasStatusEffect(target, "guarded") ? Math.ceil(result.damage / 2) : result.damage;
  
  if (result.hit) {
    const updatedCharacter = applyDamageToCharacter(target, actualDamage);
    state.party.members[targetIndex] = updatedCharacter;
    
    const critText = result.critical ? " (CRITICAL)" : "";
    addCombatLog(
      state,
      `${enemy.name} attacks ${target.name} for ${actualDamage} damage${critText}${actualDamage !== result.damage ? " (guarded)" : ""}!`,
      "damage"
    );
    
    if (!updatedCharacter.alive) {
      addCombatLog(state, `${target.name} has fallen!`, "system");
      emitSound("sanity_break");
    } else {
      emitSound(result.critical ? "hit_heavy" : "hit_light");
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
  
  emitSound("hit_light");
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
  let target = state.party.members[targetIndex];
  if (!target || !target.alive) return;
  
  for (const effect of effects) {
    if (!target.alive) break;
    switch (effect.type) {
      case "damage":
        if (effect.value) {
          const actualDamage = hasStatusEffect(target, "guarded") ? Math.ceil(effect.value / 2) : effect.value;
          const updatedCharacter = applyDamageToCharacter(target, actualDamage);
          state.party.members[targetIndex] = updatedCharacter;
          target = updatedCharacter;
          addCombatLog(state, `${target.name} takes ${actualDamage} damage${actualDamage !== effect.value ? " (guarded)" : ""}!`, "damage");
          
          if (!updatedCharacter.alive) {
            addCombatLog(state, `${target.name} has fallen!`, "system");
            emitSound("sanity_break");
          } else {
            emitSound("hit_light");
          }
        }
        break;
      case "sanity-damage":
        if (effect.value) {
          target.stats.sanity = Math.max(0, target.stats.sanity - effect.value);
          addCombatLog(state, `${target.name} loses ${effect.value} Sanity!`, "sanity");
          emitSound("sanity_tick");
        }
        break;
      case "debuff":
        if (effect.stat && effect.value) {
          if (["attack", "defense", "focus", "will"].includes(effect.stat)) {
            changeTimedStat(state, true, targetIndex, effect.stat, -effect.value, effect.duration);
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
