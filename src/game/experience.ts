import type { CharacterState, PartyState } from "./state";
import { audioManager } from "../ui/audio";

export interface ExperienceReward {
  total: number;
  perCharacter: number;
}

export function calculateExperienceReward(enemyExpRewards: number[]): ExperienceReward {
  const total = enemyExpRewards.reduce((sum, exp) => sum + exp, 0);
  return {
    total,
    perCharacter: total, // Each character gets full XP
  };
}

export function getExpRequiredForLevel(level: number): number {
  // Exponential curve: level 1->2 needs 100, 2->3 needs 150, etc.
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function awardExperience(
  party: PartyState,
  expAmount: number
): { leveledUp: boolean; leveledCharacters: string[] } {
  const leveledCharacters: string[] = [];
  
  for (const member of party.members) {
    if (!member.alive) continue;
    
    // Add experience (we'll add this field to CharacterState)
    const charWithExp = member as CharacterState & { experience: number; level: number };
    
    if (charWithExp.experience === undefined) {
      charWithExp.experience = 0;
    }
    if (charWithExp.level === undefined) {
      charWithExp.level = 1;
    }
    
    charWithExp.experience += expAmount;
    
    // Check for level up
    let leveled = false;
    while (charWithExp.experience >= getExpRequiredForLevel(charWithExp.level)) {
      charWithExp.experience -= getExpRequiredForLevel(charWithExp.level);
      charWithExp.level++;
      leveled = true;
      applyLevelUpBonuses(member);
    }
    
    if (leveled) {
      leveledCharacters.push(member.name);
    }
  }
  
  if (leveledCharacters.length > 0) {
    audioManager.playSfx("ui_click"); // Level up sound
  }
  
  return {
    leveledUp: leveledCharacters.length > 0,
    leveledCharacters,
  };
}

function applyLevelUpBonuses(character: CharacterState): void {
  // Base stat increases per level
  character.stats.maxHp += 5;
  character.stats.hp = character.stats.maxHp; // Full heal on level up
  
  character.stats.maxSanity += 3;
  character.stats.sanity = character.stats.maxSanity; // Full sanity restore
  
  character.stats.attack += 2;
  character.stats.defense += 1;
  character.stats.will += 1;
  character.stats.focus += 1;
  
  // Character-specific bonuses
  switch (character.id) {
    case "elias":
      // Tank - extra HP and defense
      character.stats.maxHp += 3;
      character.stats.defense += 1;
      break;
    case "miriam":
      // Healer - extra sanity and will
      character.stats.maxSanity += 2;
      character.stats.will += 1;
      break;
    case "subject13":
      // Caster - extra focus and sanity
      character.stats.focus += 2;
      character.stats.maxSanity += 2;
      break;
    case "anya":
      // Support - balanced sanity and will
      character.stats.maxSanity += 3;
      character.stats.will += 2;
      break;
  }
}

export function getCharacterLevel(character: CharacterState): number {
  const charWithLevel = character as CharacterState & { level?: number };
  return charWithLevel.level || 1;
}

export function getCharacterExperience(character: CharacterState): number {
  const charWithExp = character as CharacterState & { experience?: number };
  return charWithExp.experience || 0;
}

export function getExpToNextLevel(character: CharacterState): number {
  const level = getCharacterLevel(character);
  return getExpRequiredForLevel(level);
}
