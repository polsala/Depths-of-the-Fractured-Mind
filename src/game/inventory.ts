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
