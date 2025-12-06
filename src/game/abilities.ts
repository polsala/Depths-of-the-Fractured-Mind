import type { CharacterState, Stats } from "./state";

export type AbilityTarget = "enemy" | "ally" | "self" | "all-enemies" | "all-allies" | "all";

export interface AbilityEffect {
  type: "damage" | "heal" | "sanity-damage" | "sanity-heal" | "buff" | "debuff" | "status";
  value?: number;
  stat?: keyof Stats;
  statusEffect?: string;
  duration?: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  characterId?: string; // If specific to a character
  targetType: AbilityTarget;
  cost: {
    hp?: number;
    sanity?: number;
    stamina?: number;
  };
  effects: AbilityEffect[];
  cooldown?: number;
  requiresHighSanity?: boolean;
  requiresLowSanity?: boolean;
}

// Elias Ward - The Warden (Tank/Control)
export const ELIAS_ABILITIES: Record<string, Ability> = {
  stand_firm: {
    id: "stand_firm",
    name: "Stand Firm",
    description: "Increase DEF and draw enemy attacks for 2 turns.",
    characterId: "elias",
    targetType: "self",
    cost: { sanity: 2 },
    effects: [
      { type: "buff", stat: "defense", value: 5, duration: 2 },
    ],
  },
  crackdown: {
    id: "crackdown",
    name: "Crackdown",
    description: "Brutal attack with chance to stun. Costs sanity on weakened enemies.",
    characterId: "elias",
    targetType: "enemy",
    cost: { sanity: 3 },
    effects: [
      { type: "damage", value: 15 },
      { type: "status", statusEffect: "stunned", duration: 1 },
    ],
  },
  commanding_presence: {
    id: "commanding_presence",
    name: "Commanding Presence",
    description: "Boost party accuracy and defense briefly.",
    characterId: "elias",
    targetType: "all-allies",
    cost: { sanity: 4 },
    effects: [
      { type: "buff", stat: "focus", value: 3, duration: 2 },
      { type: "buff", stat: "defense", value: 2, duration: 2 },
    ],
  },
  iron_will: {
    id: "iron_will",
    name: "Iron Will",
    description: "Resist fear and recover sanity through discipline.",
    characterId: "elias",
    targetType: "self",
    cost: {},
    effects: [
      { type: "sanity-heal", value: 8 },
    ],
  },
  suppression: {
    id: "suppression",
    name: "Suppression",
    description: "Powerful attack that reduces enemy attack power.",
    characterId: "elias",
    targetType: "enemy",
    cost: { sanity: 5 },
    effects: [
      { type: "damage", value: 18 },
      { type: "debuff", stat: "attack", value: 4, duration: 2 },
    ],
  },
  defensive_stance: {
    id: "defensive_stance",
    name: "Defensive Stance",
    description: "Take a defensive posture, greatly reducing damage taken.",
    characterId: "elias",
    targetType: "self",
    cost: {},
    effects: [
      { type: "buff", stat: "defense", value: 8, duration: 1 },
    ],
  },
};

// Dr. Miriam Kessler - The Surgeon (Healer/Debuffer)
export const MIRIAM_ABILITIES: Record<string, Ability> = {
  field_surgery: {
    id: "field_surgery",
    name: "Field Surgery",
    description: "Emergency medical care. Restores HP at cost of sanity.",
    characterId: "miriam",
    targetType: "ally",
    cost: { sanity: 5 },
    effects: [
      { type: "heal", value: 20 },
    ],
  },
  experimental_serum: {
    id: "experimental_serum",
    name: "Experimental Serum",
    description: "Powerful buff with unpredictable side effects.",
    characterId: "miriam",
    targetType: "ally",
    cost: { sanity: 6 },
    effects: [
      { type: "buff", stat: "attack", value: 5, duration: 3 },
      { type: "buff", stat: "defense", value: 3, duration: 3 },
    ],
  },
  sedative_injection: {
    id: "sedative_injection",
    name: "Sedative Injection",
    description: "Debuff enemy's attack and willpower.",
    characterId: "miriam",
    targetType: "enemy",
    cost: { sanity: 4 },
    effects: [
      { type: "debuff", stat: "attack", value: 6, duration: 2 },
      { type: "debuff", stat: "will", value: 4, duration: 2 },
    ],
  },
  clinical_precision: {
    id: "clinical_precision",
    name: "Clinical Precision",
    description: "Targeted attack exploiting enemy weaknesses.",
    characterId: "miriam",
    targetType: "enemy",
    cost: { sanity: 3 },
    effects: [
      { type: "damage", value: 12 },
    ],
  },
  mass_triage: {
    id: "mass_triage",
    name: "Mass Triage",
    description: "Heal all allies for a moderate amount.",
    characterId: "miriam",
    targetType: "all-allies",
    cost: { sanity: 10, hp: 5 },
    effects: [
      { type: "heal", value: 12 },
    ],
  },
  nerve_agent: {
    id: "nerve_agent",
    name: "Nerve Agent",
    description: "Poison enemy, causing damage over time.",
    characterId: "miriam",
    targetType: "enemy",
    cost: { sanity: 5 },
    effects: [
      { type: "status", statusEffect: "poisoned", duration: 3 },
    ],
  },
};

// Subject 13 - The Subject (Wildcard/Caster)
export const SUBJECT13_ABILITIES: Record<string, Ability> = {
  fractured_sight: {
    id: "fractured_sight",
    name: "Fractured Sight",
    description: "Glimpse the future, revealing enemy weaknesses.",
    characterId: "subject13",
    targetType: "all-enemies",
    cost: { sanity: 4 },
    effects: [
      { type: "debuff", stat: "defense", value: 3, duration: 2 },
    ],
  },
  echo_bolt: {
    id: "echo_bolt",
    name: "Echo Bolt",
    description: "Chaotic magical attack that may bounce unpredictably.",
    characterId: "subject13",
    targetType: "enemy",
    cost: { sanity: 5 },
    effects: [
      { type: "damage", value: 20 },
    ],
  },
  future_scream: {
    id: "future_scream",
    name: "Future Scream",
    description: "Horrifying vision that terrifies all enemies.",
    characterId: "subject13",
    targetType: "all-enemies",
    cost: { sanity: 8 },
    effects: [
      { type: "status", statusEffect: "feared", duration: 2 },
      { type: "sanity-damage", value: 5 },
    ],
  },
  reality_fracture: {
    id: "reality_fracture",
    name: "Reality Fracture",
    description: "Bend reality to harm enemies. More powerful at low sanity.",
    characterId: "subject13",
    targetType: "enemy",
    cost: { sanity: 6 },
    requiresLowSanity: true,
    effects: [
      { type: "damage", value: 25 },
      { type: "sanity-damage", value: 8 },
    ],
  },
  prophetic_ward: {
    id: "prophetic_ward",
    name: "Prophetic Ward",
    description: "Foresee and prevent damage to an ally.",
    characterId: "subject13",
    targetType: "ally",
    cost: { sanity: 5 },
    effects: [
      { type: "buff", stat: "defense", value: 6, duration: 1 },
    ],
  },
  void_pulse: {
    id: "void_pulse",
    name: "Void Pulse",
    description: "Unleash chaotic energy at all enemies.",
    characterId: "subject13",
    targetType: "all-enemies",
    cost: { sanity: 12 },
    effects: [
      { type: "damage", value: 15 },
    ],
  },
};

// Sister Anya Velasquez - The Confessor (Support/Buffer)
export const ANYA_ABILITIES: Record<string, Ability> = {
  prayer_of_calm: {
    id: "prayer_of_calm",
    name: "Prayer of Calm",
    description: "Soothing prayer that restores sanity and HP.",
    characterId: "anya",
    targetType: "all-allies",
    cost: {},
    effects: [
      { type: "sanity-heal", value: 6 },
      { type: "heal", value: 5 },
    ],
  },
  word_of_guilt: {
    id: "word_of_guilt",
    name: "Word of Guilt",
    description: "Confront enemy with their sins, weakening their will.",
    characterId: "anya",
    targetType: "enemy",
    cost: { sanity: 4 },
    effects: [
      { type: "debuff", stat: "will", value: 6, duration: 2 },
      { type: "sanity-damage", value: 8 },
    ],
  },
  shared_burden: {
    id: "shared_burden",
    name: "Shared Burden",
    description: "Redistribute HP and sanity among allies.",
    characterId: "anya",
    targetType: "all-allies",
    cost: { sanity: 5 },
    effects: [
      { type: "heal", value: 10 },
    ],
  },
  divine_protection: {
    id: "divine_protection",
    name: "Divine Protection",
    description: "Bless an ally with protective grace.",
    characterId: "anya",
    targetType: "ally",
    cost: { sanity: 4 },
    effects: [
      { type: "buff", stat: "defense", value: 4, duration: 2 },
      { type: "buff", stat: "will", value: 3, duration: 2 },
    ],
  },
  confession: {
    id: "confession",
    name: "Confession",
    description: "Force enemy to confront their guilt, dealing sanity damage.",
    characterId: "anya",
    targetType: "enemy",
    cost: { sanity: 6 },
    effects: [
      { type: "sanity-damage", value: 12 },
    ],
  },
  redemption: {
    id: "redemption",
    name: "Redemption",
    description: "Powerful healing and sanity restoration.",
    characterId: "anya",
    targetType: "ally",
    cost: { sanity: 8 },
    requiresHighSanity: true,
    effects: [
      { type: "heal", value: 25 },
      { type: "sanity-heal", value: 10 },
    ],
  },
};

// Enemy Abilities
export const ENEMY_ABILITIES: Record<string, Ability> = {
  // Basic attacks
  bite: {
    id: "bite",
    name: "Bite",
    description: "A vicious bite attack.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 6 }],
  },
  baton_strike: {
    id: "baton_strike",
    name: "Baton Strike",
    description: "A heavy blow with a baton.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 8 }],
  },
  
  // Depth 1
  swarm: {
    id: "swarm",
    name: "Swarm",
    description: "Multiple quick attacks.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 4 }, { type: "damage", value: 4 }],
  },
  restraint: {
    id: "restraint",
    name: "Restraint",
    description: "Attempt to restrain the target.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "status", statusEffect: "stunned", duration: 1 }],
  },
  crushing_blow: {
    id: "crushing_blow",
    name: "Crushing Blow",
    description: "A devastating attack.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 18 }],
  },
  intimidate: {
    id: "intimidate",
    name: "Intimidate",
    description: "Strike fear into enemies.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 5 }],
  },
  call_backup: {
    id: "call_backup",
    name: "Call Backup",
    description: "Summon reinforcements (not yet implemented).",
    targetType: "self",
    cost: {},
    effects: [],
  },
  
  // Depth 2
  paper_cut: {
    id: "paper_cut",
    name: "Paper Cut",
    description: "Death by a thousand cuts.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 6 }, { type: "status", statusEffect: "bleeding", duration: 2 }],
  },
  confusion: {
    id: "confusion",
    name: "Confusion",
    description: "Disorient the target.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "debuff", stat: "focus", value: 4, duration: 2 }],
  },
  memory_drain: {
    id: "memory_drain",
    name: "Memory Drain",
    description: "Steal memories and sanity.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 8 }],
  },
  drawer_slam: {
    id: "drawer_slam",
    name: "Drawer Slam",
    description: "Slam with heavy drawers.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 10 }],
  },
  paper_storm: {
    id: "paper_storm",
    name: "Paper Storm",
    description: "Whirlwind of sharp paper.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 6 }],
  },
  truth_revelation: {
    id: "truth_revelation",
    name: "Truth Revelation",
    description: "Reveal uncomfortable truths.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 10 }],
  },
  guilt_manifestation: {
    id: "guilt_manifestation",
    name: "Guilt Manifestation",
    description: "Manifest the party's guilt.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 8 }, { type: "sanity-damage", value: 6 }],
  },
  paper_barrage: {
    id: "paper_barrage",
    name: "Paper Barrage",
    description: "Endless stream of documents.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 12 }],
  },
  suppress_memory: {
    id: "suppress_memory",
    name: "Suppress Memory",
    description: "Force forgetfulness.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "debuff", stat: "will", value: 5, duration: 2 }],
  },
  
  // Depth 3
  desperate_grasp: {
    id: "desperate_grasp",
    name: "Desperate Grasp",
    description: "Clawing, desperate attack.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 9 }],
  },
  wail: {
    id: "wail",
    name: "Wail",
    description: "Horrific wailing.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 6 }],
  },
  infection: {
    id: "infection",
    name: "Infection",
    description: "Spread disease.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "status", statusEffect: "poisoned", duration: 3 }],
  },
  scalpel_strike: {
    id: "scalpel_strike",
    name: "Scalpel Strike",
    description: "Precise surgical cut.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 14 }],
  },
  anesthetic: {
    id: "anesthetic",
    name: "Anesthetic",
    description: "Put target to sleep.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "status", statusEffect: "stunned", duration: 1 }],
  },
  vivisection: {
    id: "vivisection",
    name: "Vivisection",
    description: "Brutal experimental surgery.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 16 }, { type: "sanity-damage", value: 5 }],
  },
  trauma: {
    id: "trauma",
    name: "Trauma",
    description: "Inflict psychological trauma.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 10 }],
  },
  experimental_serum_enemy: {
    id: "experimental_serum_enemy",
    name: "Experimental Serum",
    description: "Inject with unknown substance.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 10 }, { type: "status", statusEffect: "poisoned", duration: 2 }],
  },
  lobotomy: {
    id: "lobotomy",
    name: "Lobotomy",
    description: "Attempt surgical intervention.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 15 }, { type: "debuff", stat: "will", value: 8, duration: 3 }],
  },
  mind_surgery: {
    id: "mind_surgery",
    name: "Mind Surgery",
    description: "Invade the mind directly.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 15 }],
  },
  heal_self: {
    id: "heal_self",
    name: "Heal Self",
    description: "Self-repair.",
    targetType: "self",
    cost: {},
    effects: [{ type: "heal", value: 20 }],
  },
  induce_madness: {
    id: "induce_madness",
    name: "Induce Madness",
    description: "Drive target insane.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 12 }, { type: "status", statusEffect: "confused", duration: 2 }],
  },
  
  // Depth 4
  mirror_strike: {
    id: "mirror_strike",
    name: "Mirror Strike",
    description: "Attack using your own techniques.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 12 }],
  },
  self_doubt: {
    id: "self_doubt",
    name: "Self Doubt",
    description: "Plant seeds of doubt.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "debuff", stat: "focus", value: 5, duration: 2 }, { type: "sanity-damage", value: 7 }],
  },
  copy_ability: {
    id: "copy_ability",
    name: "Copy Ability",
    description: "Mimic an enemy ability.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 10 }],
  },
  guilt_strike: {
    id: "guilt_strike",
    name: "Guilt Strike",
    description: "Strike with manifestation of guilt.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 14 }, { type: "sanity-damage", value: 6 }],
  },
  accusation: {
    id: "accusation",
    name: "Accusation",
    description: "Accuse of past crimes.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 10 }],
  },
  sanity_drain: {
    id: "sanity_drain",
    name: "Sanity Drain",
    description: "Drain mental energy.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 12 }],
  },
  haunting_memories: {
    id: "haunting_memories",
    name: "Haunting Memories",
    description: "Replay traumatic memories.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 8 }],
  },
  perfect_counter: {
    id: "perfect_counter",
    name: "Perfect Counter",
    description: "Counter with perfect technique.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 16 }],
  },
  reflection_barrage: {
    id: "reflection_barrage",
    name: "Reflection Barrage",
    description: "Multiple reflected attacks.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 10 }],
  },
  truth_mirror: {
    id: "truth_mirror",
    name: "Truth Mirror",
    description: "Force confrontation with truth.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 14 }],
  },
  shatter_psyche: {
    id: "shatter_psyche",
    name: "Shatter Psyche",
    description: "Break mental defenses.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 18 }, { type: "debuff", stat: "will", value: 10, duration: 2 }],
  },
  deny_reality: {
    id: "deny_reality",
    name: "Deny Reality",
    description: "Warp perception of reality.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "debuff", stat: "focus", value: 6, duration: 2 }],
  },
  
  // Depth 5
  tendril_strike: {
    id: "tendril_strike",
    name: "Tendril Strike",
    description: "Biomechanical tendril attack.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 16 }],
  },
  neural_shock: {
    id: "neural_shock",
    name: "Neural Shock",
    description: "Electric shock to the nervous system.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 12 }, { type: "status", statusEffect: "stunned", duration: 1 }],
  },
  corruption: {
    id: "corruption",
    name: "Corruption",
    description: "Spread Engine corruption.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "status", statusEffect: "poisoned", duration: 3 }, { type: "sanity-damage", value: 6 }],
  },
  mass_assault: {
    id: "mass_assault",
    name: "Mass Assault",
    description: "Coordinated attack from multiple bodies.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 12 }],
  },
  shared_pain: {
    id: "shared_pain",
    name: "Shared Pain",
    description: "Distribute damage among all.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 8 }],
  },
  regenerate: {
    id: "regenerate",
    name: "Regenerate",
    description: "Rapidly heal wounds.",
    targetType: "self",
    cost: {},
    effects: [{ type: "heal", value: 25 }],
  },
  collective_scream: {
    id: "collective_scream",
    name: "Collective Scream",
    description: "Scream from many mouths.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "sanity-damage", value: 10 }],
  },
  guilt_wave: {
    id: "guilt_wave",
    name: "Guilt Wave",
    description: "Wave of collective guilt.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 14 }, { type: "sanity-damage", value: 10 }],
  },
  trauma_burst: {
    id: "trauma_burst",
    name: "Trauma Burst",
    description: "Explosion of traumatic energy.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 16 }],
  },
  reality_fracture_enemy: {
    id: "reality_fracture_enemy",
    name: "Reality Fracture",
    description: "Fracture reality itself.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "damage", value: 20 }, { type: "sanity-damage", value: 12 }],
  },
  absorb_sanity: {
    id: "absorb_sanity",
    name: "Absorb Sanity",
    description: "Drain sanity to heal.",
    targetType: "enemy",
    cost: {},
    effects: [{ type: "sanity-damage", value: 15 }],
  },
  final_judgment: {
    id: "final_judgment",
    name: "Final Judgment",
    description: "Judge all for their sins.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 18 }, { type: "sanity-damage", value: 15 }],
  },
  engine_pulse: {
    id: "engine_pulse",
    name: "Engine Pulse",
    description: "Pulse of raw Engine power.",
    targetType: "all-enemies",
    cost: {},
    effects: [{ type: "damage", value: 20 }],
  },
};

export const ALL_ABILITIES: Record<string, Ability> = {
  ...ELIAS_ABILITIES,
  ...MIRIAM_ABILITIES,
  ...SUBJECT13_ABILITIES,
  ...ANYA_ABILITIES,
  ...ENEMY_ABILITIES,
};

export function getAbility(abilityId: string): Ability | undefined {
  return ALL_ABILITIES[abilityId];
}

export function getCharacterAbilities(characterId: string): Ability[] {
  return Object.values(ALL_ABILITIES).filter(
    (ability) => ability.characterId === characterId
  );
}

export function canUseAbility(
  ability: Ability,
  character: CharacterState
): boolean {
  // Check sanity requirements
  if (ability.requiresHighSanity && character.stats.sanity < character.stats.maxSanity * 0.7) {
    return false;
  }
  if (ability.requiresLowSanity && character.stats.sanity > character.stats.maxSanity * 0.3) {
    return false;
  }
  
  // Check costs
  if (ability.cost.hp && character.stats.hp <= ability.cost.hp) {
    return false;
  }
  if (ability.cost.sanity && character.stats.sanity < ability.cost.sanity) {
    return false;
  }
  
  return true;
}
