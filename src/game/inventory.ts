import type { Inventory, Item } from "./state";

export const ITEMS: Record<string, Item> = {
  torch: {
    id: "torch",
    name: "Torch",
    description: "A flickering torch that provides light in dark corridors. Can reveal hidden paths.",
    type: "utility",
    stackable: true,
    usable: true,
  },
  medkit: {
    id: "medkit",
    name: "Medical Kit",
    description: "Emergency medical supplies. Restores 15 HP to one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  sedative: {
    id: "sedative",
    name: "Sedative",
    description: "A syringe of sedative. Restores 10 Sanity to one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  healing_potion: {
    id: "healing_potion",
    name: "Healing Draught",
    description: "Restores 20 HP to one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  greater_healing_potion: {
    id: "greater_healing_potion",
    name: "Greater Healing Draught",
    description: "Restores 40 HP to one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  sanity_tonic: {
    id: "sanity_tonic",
    name: "Calming Tonic",
    description: "Restores 20 Sanity to one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    description: "Cures poison on one character.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  focus_draught: {
    id: "focus_draught",
    name: "Focus Draught",
    description: "Sharpened senses. Boosts focus temporarily.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  bomb: {
    id: "bomb",
    name: "Improvised Bomb",
    description: "Deals heavy damage to a single enemy.",
    type: "consumable",
    stackable: true,
    usable: true,
  },
  smoke_bomb: {
    id: "smoke_bomb",
    name: "Smoke Bomb",
    description: "Creates cover, making escape easier.",
    type: "consumable",
    stackable: true,
    usable: true,
    price: 35,
  },
  warden_baton: {
    id: "warden_baton",
    name: "Warden's Baton",
    description: "Standard issue for Elias. Boosts attack and defense.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "weapon",
      statBonuses: { attack: 4, defense: 2 },
      requiredLevel: 2,
      allowedCharacters: ["elias"],
      depthTier: 1,
    },
    price: 80,
  },
  reinforced_coat: {
    id: "reinforced_coat",
    name: "Reinforced Coat",
    description: "Layered kevlar and padding. Helps blunt trauma.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "armor",
      statBonuses: { defense: 4, maxHp: 6 },
      requiredLevel: 2,
      depthTier: 2,
    },
    price: 90,
  },
  surgical_scalpel: {
    id: "surgical_scalpel",
    name: "Serrated Scalpel",
    description: "Miriam's favored scalpel. Precise and unsettling.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "weapon",
      statBonuses: { attack: 5 },
      requiredLevel: 3,
      allowedCharacters: ["miriam"],
      depthTier: 2,
    },
    price: 110,
  },
  focus_band: {
    id: "focus_band",
    name: "Focus Band",
    description: "Meditation band that sharpens concentration.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { focus: 3, will: 1 },
      requiredLevel: 2,
      depthTier: 2,
    },
    price: 70,
  },
  faith_icon: {
    id: "faith_icon",
    name: "Faithful Icon",
    description: "Anya's icon, steadying her will.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { will: 3, focus: 1 },
      requiredLevel: 3,
      allowedCharacters: ["anya"],
      depthTier: 3,
    },
    price: 95,
  },
  psi_focus: {
    id: "psi_focus",
    name: "Psi Focus Charm",
    description: "Amplifies Subject 13's control.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { focus: 4 },
      requiredLevel: 3,
      allowedCharacters: ["subject13"],
      depthTier: 3,
    },
    price: 95,
  },
  ward_plate: {
    id: "ward_plate",
    name: "Ward Plate",
    description: "Heavy plating from the ward barricades.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "armor",
      statBonuses: { defense: 6, maxHp: 10 },
      requiredLevel: 4,
      depthTier: 4,
    },
    price: 130,
  },
  engine_fragment: {
    id: "engine_fragment",
    name: "Engine Fragment",
    description: "Resonant shard from the Engine core, humming with power.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { attack: 3, focus: 3, maxSanity: 8 },
      requiredLevel: 5,
      depthTier: 5,
      bossOnly: true,
    },
    price: 0,
  },
  executioner_blade: {
    id: "executioner_blade",
    name: "Executioner's Blade",
    description: "A brutal weapon seized from a fallen keeper.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "weapon",
      statBonuses: { attack: 8 },
      requiredLevel: 5,
      depthTier: 4,
      bossOnly: true,
      allowedCharacters: ["elias"],
    },
    price: 0,
  },
  warden_emblem: {
    id: "warden_emblem",
    name: "Warden's Emblem",
    description: "Badge of authority that steadies resolve.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { attack: 2, defense: 2, focus: 1 },
      requiredLevel: 3,
      depthTier: 1,
      bossOnly: true,
      allowedCharacters: ["elias"],
    },
  },
  records_ledger: {
    id: "records_ledger",
    name: "Keeper's Ledger",
    description: "Encrypted ledger of atrocities, sharpens uncomfortable focus.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { focus: 3, will: 2 },
      requiredLevel: 3,
      depthTier: 2,
      bossOnly: true,
    },
  },
  surgeons_toolroll: {
    id: "surgeons_toolroll",
    name: "Surgeon's Toolroll",
    description: "Balanced instruments honed by Kessler.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "weapon",
      statBonuses: { attack: 5, will: 2 },
      requiredLevel: 4,
      depthTier: 3,
      bossOnly: true,
      allowedCharacters: ["miriam"],
    },
  },
  mirror_shard: {
    id: "mirror_shard",
    name: "Shard of the Mirror",
    description: "Reflective fragment that disrupts illusions.",
    type: "equipment",
    stackable: false,
    usable: false,
    equipment: {
      slot: "trinket",
      statBonuses: { focus: 4, will: 2 },
      requiredLevel: 4,
      depthTier: 4,
      bossOnly: true,
    },
  },
  rusty_key: {
    id: "rusty_key",
    name: "Rusty Key",
    description: "An old, corroded key. Might open locked doors in the Archive.",
    type: "key",
    stackable: false,
    usable: false,
  },
  access_card: {
    id: "access_card",
    name: "Access Card",
    description: "A damaged security card. Could unlock restricted areas.",
    type: "key",
    stackable: false,
    usable: false,
  },
  patient_journal: {
    id: "patient_journal",
    name: "Patient's Journal",
    description: "A tattered journal filled with disturbing entries about the experiments.",
    type: "lore",
    stackable: false,
    usable: false,
  },
  staff_memo: {
    id: "staff_memo",
    name: "Staff Memorandum",
    description: "An internal memo discussing 'Subject 13' and 'The Engine'.",
    type: "lore",
    stackable: true,
    usable: false,
  },
  rope: {
    id: "rope",
    name: "Rope",
    description: "Sturdy rope. Useful for descending or climbing.",
    type: "utility",
    stackable: true,
    usable: false,
  },
  crowbar: {
    id: "crowbar",
    name: "Crowbar",
    description: "A heavy metal crowbar. Can force open doors or containers.",
    type: "utility",
    stackable: false,
    usable: false,
  },
  lockpick: {
    id: "lockpick",
    name: "Lockpick Set",
    description: "A set of lockpicking tools. Allows bypassing some locks.",
    type: "utility",
    stackable: false,
    usable: false,
  },
};

export function addItem(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
  const item = ITEMS[itemId];
  if (!item) return false;

  const existingIndex = inventory.items.findIndex((i) => i.item.id === itemId);

  if (existingIndex >= 0 && item.stackable) {
    inventory.items[existingIndex].quantity += quantity;
    return true;
  }

  if (existingIndex < 0 && inventory.items.length < inventory.maxSlots) {
    inventory.items.push({ item, quantity });
    return true;
  }

  return false; // Inventory full or can't stack
}

export function removeItem(inventory: Inventory, itemId: string, quantity: number = 1): boolean {
  const index = inventory.items.findIndex((i) => i.item.id === itemId);
  if (index < 0) return false;

  inventory.items[index].quantity -= quantity;
  if (inventory.items[index].quantity <= 0) {
    inventory.items.splice(index, 1);
  }

  return true;
}

export function hasItem(inventory: Inventory, itemId: string): boolean {
  return inventory.items.some((i) => i.item.id === itemId);
}

export function getItemCount(inventory: Inventory, itemId: string): number {
  const item = inventory.items.find((i) => i.item.id === itemId);
  return item ? item.quantity : 0;
}

export function useItem(inventory: Inventory, itemId: string): Item | null {
  const item = ITEMS[itemId];
  if (!item || !item.usable) return null;

  if (removeItem(inventory, itemId, 1)) {
    return item;
  }

  return null;
}
