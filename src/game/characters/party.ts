import type { CharacterId, CharacterState, PartyState, Stats } from "../state";

function cloneStats(stats: Stats): Stats {
  return { ...stats };
}

function createCharacter(
  id: CharacterId,
  name: string,
  stats: Stats
): CharacterState {
  return {
    id,
    name,
    baseStats: cloneStats(stats),
    stats: cloneStats(stats),
    level: 1,
    experience: 0,
    statusEffects: [],
    alive: true,
    equipment: {},
  };
}

const ELIAS_BASE_STATS: Stats = {
  hp: 40,
  maxHp: 40,
  sanity: 20,
  maxSanity: 20,
  attack: 10,
  defense: 8,
  will: 4,
  focus: 6,
};

const MIRIAM_BASE_STATS: Stats = {
  hp: 30,
  maxHp: 30,
  sanity: 24,
  maxSanity: 24,
  attack: 8,
  defense: 5,
  will: 8,
  focus: 9,
};

const SUBJECT13_BASE_STATS: Stats = {
  hp: 22,
  maxHp: 22,
  sanity: 26,
  maxSanity: 26,
  attack: 7,
  defense: 4,
  will: 10,
  focus: 10,
};

const ANYA_BASE_STATS: Stats = {
  hp: 28,
  maxHp: 28,
  sanity: 30,
  maxSanity: 32,
  attack: 6,
  defense: 5,
  will: 9,
  focus: 7,
};

export function createElias(): CharacterState {
  return createCharacter("elias", "Elias Ward", ELIAS_BASE_STATS);
}

export function createMiriam(): CharacterState {
  return createCharacter("miriam", "Dr. Miriam Kessler", MIRIAM_BASE_STATS);
}

export function createSubject13(): CharacterState {
  return createCharacter("subject13", "Subject 13", SUBJECT13_BASE_STATS);
}

export function createAnya(): CharacterState {
  return createCharacter("anya", "Sister Anya Velasquez", ANYA_BASE_STATS);
}

export const CHARACTER_FACTORIES: Record<CharacterId, () => CharacterState> = {
  elias: createElias,
  miriam: createMiriam,
  subject13: createSubject13,
  anya: createAnya,
};

export function createDefaultParty(): PartyState {
  return {
    members: [createElias(), createMiriam(), createSubject13(), createAnya()],
    inventory: {
      items: [],
      maxSlots: 20,
      money: 100,
    },
  };
}
