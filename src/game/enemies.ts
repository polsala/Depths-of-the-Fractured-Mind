import type { Stats } from "./state";

export interface Enemy {
  id: string;
  name: string;
  description: string;
  type: "normal" | "elite" | "boss";
  depth: number;
  stats: Stats;
  abilities: string[];
  loot?: string[];
  expReward: number;
}

// Depth 1 - The Threshold
const DERANGED_GUARD: Enemy = {
  id: "deranged_guard",
  name: "Deranged Guard",
  description: "A former security officer, now twisted and violent. Their eyes are vacant, but their grip is strong.",
  type: "normal",
  depth: 1,
  stats: {
    hp: 20,
    maxHp: 20,
    sanity: 5,
    maxSanity: 10,
    attack: 6,
    defense: 4,
    will: 2,
    focus: 4,
  },
  abilities: ["baton_strike", "restraint"],
  loot: ["medkit"],
  expReward: 15,
};

const CORRUPTED_RAT: Enemy = {
  id: "corrupted_rat",
  name: "Corrupted Rat",
  description: "Unnaturally large, with patchy fur and eyes that glow faintly in the dark.",
  type: "normal",
  depth: 1,
  stats: {
    hp: 10,
    maxHp: 10,
    sanity: 0,
    maxSanity: 0,
    attack: 4,
    defense: 2,
    will: 1,
    focus: 6,
  },
  abilities: ["bite", "swarm"],
  expReward: 8,
};

const THRESHOLD_WARDEN: Enemy = {
  id: "threshold_warden",
  name: "Threshold Warden",
  description: "A hulking amalgamation of security guards, fused together by the Engine's power. It speaks in many voices.",
  type: "boss",
  depth: 1,
  stats: {
    hp: 80,
    maxHp: 80,
    sanity: 10,
    maxSanity: 15,
    attack: 12,
    defense: 8,
    will: 5,
    focus: 6,
  },
  abilities: ["crushing_blow", "intimidate", "call_backup", "defensive_stance"],
  loot: ["access_card", "medkit", "sedative"],
  expReward: 100,
};

// Depth 2 - The Archive
const ARCHIVIST_WRAITH: Enemy = {
  id: "archivist_wraith",
  name: "Archivist Wraith",
  description: "The translucent form of a former clerk, endlessly sorting files that no longer exist.",
  type: "normal",
  depth: 2,
  stats: {
    hp: 18,
    maxHp: 18,
    sanity: 8,
    maxSanity: 12,
    attack: 5,
    defense: 3,
    will: 6,
    focus: 7,
  },
  abilities: ["paper_cut", "confusion", "memory_drain"],
  loot: ["staff_memo"],
  expReward: 20,
};

const FILING_BEAST: Enemy = {
  id: "filing_beast",
  name: "Filing Beast",
  description: "Animated filing cabinets, their drawers snapping like jaws, papers swirling around them.",
  type: "normal",
  depth: 2,
  stats: {
    hp: 25,
    maxHp: 25,
    sanity: 0,
    maxSanity: 0,
    attack: 7,
    defense: 6,
    will: 2,
    focus: 4,
  },
  abilities: ["drawer_slam", "paper_storm"],
  loot: ["rusty_key"],
  expReward: 22,
};

const KEEPER_OF_RECORDS: Enemy = {
  id: "keeper_of_records",
  name: "Keeper of Records",
  description: "A massive entity formed from countless documents and recordings, bearing witness to every atrocity.",
  type: "boss",
  depth: 2,
  stats: {
    hp: 100,
    maxHp: 100,
    sanity: 20,
    maxSanity: 20,
    attack: 10,
    defense: 7,
    will: 10,
    focus: 8,
  },
  abilities: ["truth_revelation", "guilt_manifestation", "paper_barrage", "suppress_memory"],
  loot: ["access_card", "patient_journal", "medkit", "sedative"],
  expReward: 150,
};

// Depth 3 - The Ward
const PATIENT_HUSK: Enemy = {
  id: "patient_husk",
  name: "Patient Husk",
  description: "An emaciated figure in a hospital gown, jerking and twitching with unnatural movements.",
  type: "normal",
  depth: 3,
  stats: {
    hp: 22,
    maxHp: 22,
    sanity: 3,
    maxSanity: 8,
    attack: 8,
    defense: 3,
    will: 4,
    focus: 5,
  },
  abilities: ["desperate_grasp", "wail", "infection"],
  loot: ["sedative"],
  expReward: 25,
};

const SURGERY_HORROR: Enemy = {
  id: "surgery_horror",
  name: "Surgery Horror",
  description: "Surgical tools and body parts melded together, animated by pain and anguish.",
  type: "elite",
  depth: 3,
  stats: {
    hp: 35,
    maxHp: 35,
    sanity: 5,
    maxSanity: 10,
    attack: 10,
    defense: 5,
    will: 5,
    focus: 7,
  },
  abilities: ["scalpel_strike", "anesthetic", "vivisection", "trauma"],
  loot: ["medkit", "sedative"],
  expReward: 35,
};

const WARD_PHYSICIAN: Enemy = {
  id: "ward_physician",
  name: "Ward Physician",
  description: "Dr. Kessler's worst fears made manifest - a twisted version of herself, obsessed with experimentation.",
  type: "boss",
  depth: 3,
  stats: {
    hp: 120,
    maxHp: 120,
    sanity: 15,
    maxSanity: 25,
    attack: 12,
    defense: 6,
    will: 12,
    focus: 10,
  },
  abilities: ["experimental_serum", "lobotomy", "mind_surgery", "heal_self", "induce_madness"],
  loot: ["access_card", "medkit", "sedative", "crowbar"],
  expReward: 200,
};

// Depth 4 - Labyrinth of Mirrors
const REFLECTION_TWIN: Enemy = {
  id: "reflection_twin",
  name: "Reflection Twin",
  description: "Your own reflection, but wrong. It knows your weaknesses and exploits them mercilessly.",
  type: "normal",
  depth: 4,
  stats: {
    hp: 28,
    maxHp: 28,
    sanity: 10,
    maxSanity: 15,
    attack: 9,
    defense: 5,
    will: 8,
    focus: 8,
  },
  abilities: ["mirror_strike", "self_doubt", "copy_ability"],
  loot: ["torch"],
  expReward: 30,
};

const GUILT_MANIFESTATION: Enemy = {
  id: "guilt_manifestation",
  name: "Guilt Manifestation",
  description: "A shapeless mass of regret and shame, constantly shifting to show the faces of those you've wronged.",
  type: "elite",
  depth: 4,
  stats: {
    hp: 40,
    maxHp: 40,
    sanity: 8,
    maxSanity: 12,
    attack: 11,
    defense: 4,
    will: 10,
    focus: 6,
  },
  abilities: ["guilt_strike", "accusation", "sanity_drain", "haunting_memories"],
  loot: ["sedative", "medkit"],
  expReward: 40,
};

const MIRROR_SELF: Enemy = {
  id: "mirror_self",
  name: "Mirror Self",
  description: "The perfect reflection of your party - all your strengths and all your sins, given form.",
  type: "boss",
  depth: 4,
  stats: {
    hp: 140,
    maxHp: 140,
    sanity: 25,
    maxSanity: 30,
    attack: 14,
    defense: 8,
    will: 14,
    focus: 12,
  },
  abilities: ["perfect_counter", "reflection_barrage", "truth_mirror", "shatter_psyche", "deny_reality"],
  loot: ["lockpick", "torch", "medkit", "sedative"],
  expReward: 250,
};

// Depth 5 - The Core
const ENGINE_SPAWN: Enemy = {
  id: "engine_spawn",
  name: "Engine Spawn",
  description: "Biomechanical horrors birthed from the Engine itself, neither fully machine nor flesh.",
  type: "normal",
  depth: 5,
  stats: {
    hp: 35,
    maxHp: 35,
    sanity: 5,
    maxSanity: 10,
    attack: 13,
    defense: 7,
    will: 6,
    focus: 7,
  },
  abilities: ["tendril_strike", "neural_shock", "corruption"],
  loot: ["medkit"],
  expReward: 45,
};

const AMALGAM_GUARDIAN: Enemy = {
  id: "amalgam_guardian",
  name: "Amalgam Guardian",
  description: "Dozens of subjects fused together, protecting the Engine at all costs.",
  type: "elite",
  depth: 5,
  stats: {
    hp: 50,
    maxHp: 50,
    sanity: 10,
    maxSanity: 15,
    attack: 15,
    defense: 9,
    will: 8,
    focus: 8,
  },
  abilities: ["mass_assault", "shared_pain", "regenerate", "collective_scream"],
  loot: ["sedative", "medkit"],
  expReward: 55,
};

const THE_ENGINE_HEART: Enemy = {
  id: "the_engine_heart",
  name: "The Engine Heart",
  description: "The core of the Engine, pulsing with the collected guilt and trauma of everyone it has touched. Subject 13's essence is intertwined with it.",
  type: "boss",
  depth: 5,
  stats: {
    hp: 200,
    maxHp: 200,
    sanity: 30,
    maxSanity: 40,
    attack: 18,
    defense: 10,
    will: 16,
    focus: 14,
  },
  abilities: ["guilt_wave", "trauma_burst", "reality_fracture", "absorb_sanity", "final_judgment", "engine_pulse"],
  loot: [],
  expReward: 500,
};

export const ENEMIES: Record<string, Enemy> = {
  // Depth 1
  deranged_guard: DERANGED_GUARD,
  corrupted_rat: CORRUPTED_RAT,
  threshold_warden: THRESHOLD_WARDEN,
  
  // Depth 2
  archivist_wraith: ARCHIVIST_WRAITH,
  filing_beast: FILING_BEAST,
  keeper_of_records: KEEPER_OF_RECORDS,
  
  // Depth 3
  patient_husk: PATIENT_HUSK,
  surgery_horror: SURGERY_HORROR,
  ward_physician: WARD_PHYSICIAN,
  
  // Depth 4
  reflection_twin: REFLECTION_TWIN,
  guilt_manifestation: GUILT_MANIFESTATION,
  mirror_self: MIRROR_SELF,
  
  // Depth 5
  engine_spawn: ENGINE_SPAWN,
  amalgam_guardian: AMALGAM_GUARDIAN,
  the_engine_heart: THE_ENGINE_HEART,
};

export function getEnemiesByDepth(depth: number): Enemy[] {
  return Object.values(ENEMIES).filter((enemy) => enemy.depth === depth);
}

export function getRandomEnemy(depth: number, excludeBosses: boolean = true): Enemy | undefined {
  const enemies = getEnemiesByDepth(depth).filter((enemy) => 
    !excludeBosses || enemy.type !== "boss"
  );
  
  if (enemies.length === 0) return undefined;
  
  return enemies[Math.floor(Math.random() * enemies.length)];
}

export function getBossForDepth(depth: number): Enemy | undefined {
  return Object.values(ENEMIES).find((enemy) => 
    enemy.depth === depth && enemy.type === "boss"
  );
}
