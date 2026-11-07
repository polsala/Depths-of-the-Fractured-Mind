import { gameRandom } from "./random";
import type { DebugOptions, GameLocation, GameState } from "./state";
import { createInitialGameState } from "./state";
import { createDefaultParty } from "./characters/party";
import { moveEast, moveNorth, moveSouth, moveWest, moveForward, moveBackward, strafeLeft, strafeRight, resolveDownStairs } from "./exploration/movement";
import { applyEventChoice, startEvent } from "./events/engine";
import { registerMandatoryEvents } from "./events/mandatory";
import { loadEventDataFile } from "./events/loader";
import { selectEventForLocation } from "./events/procedural";
import { generateRandomEncounter, generateBossEncounter } from "./combat/encounters";
import { createCombatState, type CombatAction, getCurrentActor, isPartyDefeated } from "./combat/state";
import { submitAction } from "./combat/turn-manager";
import { getDepthMap } from "./exploration/map";
import { isRequiredBeat } from "./story";
import { NPCS, getDialogue, getDialogueChoiceUnavailableReason, markDialogueShown, shouldShowDialogue } from "./dialogue";
import { applyEventEffect } from "./events/resolvers";
import { useItem, removeItem, addItem, ITEMS } from "./inventory";
import { resolvePartyDefeat, transitionToGameOver } from "./defeat";
import type { MapTile } from "./exploration/map";
import type { RunSnapshot } from "./save";
import { startRun, restoreRandomState, getRandomState, getRunSeed } from "./random";

const PROCEDURAL_EVENT_CHANCE = 0.02;
const MIN_STEPS_BETWEEN_EVENTS = 2;

type DebugEntityApplier = (tile: MapTile) => void;
const DEBUG_ENTITY_TEMPLATES: Array<{ id: string; apply: DebugEntityApplier }> = [
  {
    id: "chest",
    apply: (tile) => {
      tile.type = "floor";
      tile.passable = true;
      tile.chest = { loot: [], opened: false };
    },
  },
  {
    id: "vendor",
    apply: (tile) => {
      tile.type = "floor";
      tile.passable = true;
      tile.vendor = true;
    },
  },
  {
    id: "stairsUp",
    apply: (tile) => {
      tile.type = "stairsUp";
      tile.passable = true;
    },
  },
  {
    id: "stairsDown",
    apply: (tile) => {
      tile.type = "stairsDown";
      tile.passable = true;
    },
  },
  {
    id: "door",
    apply: (tile) => {
      tile.type = "door";
      tile.passable = true;
      tile.locked = false;
      tile.discovered = true;
    },
  },
];

export class GameController {
  private state: GameState;
  private eventsReady: boolean = false;
  private eventLoadingError: Error | null = null;
  private stepsSinceLastEvent: number = 0;
  private lastProceduralEventId: string | null = null;

  constructor(seed?: number) {
    registerMandatoryEvents();
    startRun(seed);
    this.state = createInitialGameState();
    this.state = {
      ...this.state,
      party: createDefaultParty(),
    };
    
    // Load event data asynchronously
    this.loadEvents();
  }
  
  private async loadEvents(): Promise<void> {
    try {
      // Use correct base path for both dev and production
      const basePath = import.meta.env.BASE_URL || '/';
      await loadEventDataFile(`${basePath}data/events.json`);
      this.eventsReady = true;
      console.log("Event data loaded successfully");
    } catch (error) {
      console.error("Failed to load event data:", error);
      this.eventLoadingError = error instanceof Error ? error : new Error(String(error));
      // Events registered via registerMandatoryEvents() will still work as fallback
      this.eventsReady = true; // Mark as ready to allow game to proceed with fallback events
    }
  }
  
  public isEventsLoaded(): boolean {
    return this.eventsReady;
  }
  
  public hasEventLoadingError(): boolean {
    return this.eventLoadingError !== null;
  }

  public getState(): GameState {
    return this.state;
  }

  public newGame(seed?: number): void {
    startRun(seed);
    this.state = {
      ...createInitialGameState(),
      party: createDefaultParty(),
    };
    this.state.party.inventory.money = 100;
    this.stepsSinceLastEvent = 0;
    this.lastProceduralEventId = null;
  }

  public returnToTitle(): void {
    this.state.mode = "title";
  }

  public snapshot(): RunSnapshot {
    const randomState = getRandomState();
    const initialSeed = getRunSeed();
    if (randomState === null || initialSeed === null) throw new Error("Run random state is unavailable");
    return {
      state: this.state,
      initialSeed,
      randomState,
      stepsSinceLastEvent: this.stepsSinceLastEvent,
      lastProceduralEventId: this.lastProceduralEventId,
      savedAt: new Date().toISOString(),
    };
  }

  public restore(snapshot: RunSnapshot): void {
    if (snapshot.state.mode === "title") throw new Error("A title screen is not a resumable run");
    restoreRandomState(snapshot.randomState, snapshot.initialSeed);
    this.state = snapshot.state;
    this.stepsSinceLastEvent = snapshot.stepsSinceLastEvent;
    this.lastProceduralEventId = snapshot.lastProceduralEventId;
  }
  
  public triggerGameOver(): void {
    if (this.state.combatState) this.state.party = this.state.combatState.party;
    this.state = transitionToGameOver(this.state, "combat");
  }

  private recomputeStats(character: GameState["party"]["members"][number]): void {
    const base = character.baseStats || character.stats;
    const hpRatio = character.stats.maxHp > 0 ? character.stats.hp / character.stats.maxHp : 1;
    const sanRatio = character.stats.maxSanity > 0 ? character.stats.sanity / character.stats.maxSanity : 1;
    const bonuses = { attack: 0, defense: 0, will: 0, focus: 0, maxHp: 0, maxSanity: 0 };
    if (character.equipment) {
      Object.values(character.equipment).forEach((itemId) => {
        if (!itemId) return;
        const item = ITEMS[itemId];
        if (item?.equipment?.statBonuses) {
          const sb = item.equipment.statBonuses;
          bonuses.attack += sb.attack ?? 0;
          bonuses.defense += sb.defense ?? 0;
          bonuses.will += sb.will ?? 0;
          bonuses.focus += sb.focus ?? 0;
          bonuses.maxHp += sb.maxHp ?? 0;
          bonuses.maxSanity += sb.maxSanity ?? 0;
        }
      });
    }
    const nextStats = {
      ...base,
      attack: base.attack + bonuses.attack,
      defense: base.defense + bonuses.defense,
      will: base.will + bonuses.will,
      focus: base.focus + bonuses.focus,
      maxHp: base.maxHp + bonuses.maxHp,
      maxSanity: base.maxSanity + bonuses.maxSanity,
    };
    nextStats.hp = Math.min(nextStats.maxHp, Math.max(1, Math.floor(nextStats.maxHp * hpRatio)));
    nextStats.sanity = Math.min(nextStats.maxSanity, Math.max(0, Math.floor(nextStats.maxSanity * sanRatio)));
    character.stats = nextStats;
  }

  public getDebugOptions(): DebugOptions {
    return this.state.debugOptions ?? { disableEncounters: false, xpMultiplier: 1, oneHitKill: false };
  }

  public updateDebugOptions(options: Partial<DebugOptions>): void {
    this.state = {
      ...this.state,
      debugOptions: {
        ...(this.state.debugOptions ?? { disableEncounters: false, xpMultiplier: 1, oneHitKill: false }),
        ...options,
      },
    };
  }

  public debugSetPartyLowHealth(): void {
    // Apply to exploration party
    this.state.party.members.forEach((member) => {
      member.stats.hp = 1;
      member.alive = true;
    });

    // Apply to active combat state if present
    if (this.state.combatState?.party?.members) {
      this.state.combatState.party.members.forEach((member) => {
        member.stats.hp = 1;
        member.alive = true;
      });
    }
  }

  public clearChestLoot(): void {
    if (this.state.chestLoot) {
      this.state = { ...this.state, chestLoot: undefined };
    }
  }

  public debugNextDepth(): void {
    if (this.state.mode !== "exploration") return;
    const currentDepth = this.state.location.depth;
    if (currentDepth >= 5) return;

    const nextDepth = currentDepth + 1;
    const nextMap = getDepthMap(nextDepth, this.state.depthMaps);
    const nextX = nextMap.startX;
    const nextY = nextMap.startY;
    // Mark discovered and visited
    const nextTile = nextMap.tiles[nextY]?.[nextX];
    if (nextTile) {
      nextTile.discovered = true;
    }
    const tileKey = `${nextDepth}-${nextX}-${nextY}`;
    this.state.flags.visitedTiles?.add(tileKey);

    this.state = {
      ...this.state,
      location: {
        depth: nextDepth,
        x: nextX,
        y: nextY,
        direction: this.state.location.direction,
      },
      currentEventId: undefined,
      mode: "exploration",
    };
    this.stepsSinceLastEvent = 0;
  }

  public debugSpawnEntitiesAround(): void {
    if (this.state.mode !== "exploration") return;
    const map = getDepthMap(this.state.location.depth, this.state.depthMaps);
    const { x, y } = this.state.location;
    const offsets: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    DEBUG_ENTITY_TEMPLATES.forEach((template, idx) => {
      const offset = offsets[idx % offsets.length];
      const tx = x + offset[0];
      const ty = y + offset[1];
      const tile = map.tiles[ty]?.[tx];
      if (!tile) return;
      template.apply(tile);
      tile.discovered = true;
      tile.passable = true;
    });
  }

  public moveNorth(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveNorth(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveSouth(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveSouth(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveEast(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveEast(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveWest(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveWest(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveForward(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveForward(this.state);
    this.handlePostMove(previousLocation);
  }

  public moveBackward(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = moveBackward(this.state);
    this.handlePostMove(previousLocation);
  }

  public strafeLeft(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = strafeLeft(this.state);
    this.handlePostMove(previousLocation);
  }

  public strafeRight(): void {
    if (this.state.mode !== "exploration") return;
    const previousLocation: GameLocation = { ...this.state.location };
    this.state = strafeRight(this.state);
    this.handlePostMove(previousLocation);
  }

  public startEvent(eventId: string): void {
    this.state = startEvent(this.state, eventId);
  }

  public chooseEventChoice(choiceId: string): void {
    if (this.state.mode !== "event" || !this.state.currentEventId) {
      return;
    }
    const wasRequiredAtStair = isRequiredBeat(this.state.currentEventId) &&
      getDepthMap(this.state.location.depth, this.state.depthMaps)
        .tiles[this.state.location.y]?.[this.state.location.x]?.type === "stairsDown";
    this.state = applyEventChoice(this.state, choiceId);
    if (wasRequiredAtStair && this.state.mode === "exploration") {
      this.state = resolveDownStairs(this.state);
    }
  }

  public getNearbyNpcId(): keyof typeof NPCS | null {
    if (this.state.mode !== "exploration") return null;
    const { x, y, depth } = this.state.location;
    const map = getDepthMap(depth, this.state.depthMaps);
    for (const [dx, dy] of [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const npcId = map.tiles[y + dy]?.[x + dx]?.npcId;
      if (npcId && npcId in NPCS) return npcId;
    }
    return null;
  }

  public startDialogue(): boolean {
    const npcId = this.getNearbyNpcId();
    if (!npcId) return false;
    const npc = NPCS[npcId];
    this.state = {
      ...this.state,
      mode: "conversation",
      currentDialogueId: shouldShowDialogue(this.state, npc.firstDialogueId)
        ? npc.firstDialogueId : npc.returnDialogueId,
    };
    return true;
  }

  public chooseDialogueChoice(choiceId: string): boolean {
    if (this.state.mode !== "conversation" || !this.state.currentDialogueId) return false;
    const dialogue = getDialogue(this.state.currentDialogueId);
    const choice = dialogue?.choices?.find((entry) => entry.id === choiceId);
    if (!choice || getDialogueChoiceUnavailableReason(choice, this.state)) return false;
    markDialogueShown(this.state, dialogue!.id);
    this.state = applyEventEffect(this.state, choice.effects ?? {});
    const nextEventId = choice.nextEventId ?? choice.eventId;
    if (nextEventId) {
      this.state = startEvent({ ...this.state, mode: "exploration", currentDialogueId: undefined }, nextEventId);
    } else if (choice.nextDialogueId) {
      this.state = { ...this.state, currentDialogueId: choice.nextDialogueId };
    } else {
      this.leaveDialogue();
    }
    return true;
  }

  public advanceDialogue(): void {
    if (this.state.mode !== "conversation" || !this.state.currentDialogueId) return;
    const dialogue = getDialogue(this.state.currentDialogueId);
    if (!dialogue || dialogue.choices?.length) return;
    markDialogueShown(this.state, dialogue.id);
    if (dialogue.nextDialogueId) {
      this.state = { ...this.state, currentDialogueId: dialogue.nextDialogueId };
    } else if (dialogue.nextEventId) {
      this.state = startEvent({ ...this.state, mode: "exploration", currentDialogueId: undefined }, dialogue.nextEventId);
    } else {
      this.leaveDialogue();
    }
  }

  public leaveDialogue(): void {
    if (this.state.mode === "conversation") {
      this.state = { ...this.state, mode: "exploration", currentDialogueId: undefined };
    }
  }
  
  /**
   * Trigger a procedurally selected event for the current location
   */
  public triggerProceduralEvent(): boolean {
    if (!this.eventsReady || this.state.mode !== "exploration") {
      return false;
    }

    const eventId =
      selectEventForLocation(this.state, this.lastProceduralEventId ? [this.lastProceduralEventId] : []) ??
      selectEventForLocation(this.state);
    if (eventId) {
      const nextState = startEvent(this.state, eventId);
      const triggered = nextState !== this.state && nextState.mode === "event";
      this.state = nextState;
      if (triggered) {
        this.stepsSinceLastEvent = 0;
        this.lastProceduralEventId = eventId;
      }
      return triggered;
    }
    return false;
  }

  /**
   * Start a random combat encounter
   */
  public startCombat(isBoss: boolean = false, depthOverride?: number): void {
    if (this.state.mode !== "exploration") return;
    const depth = depthOverride ?? this.state.location.depth;
    const encounter = isBoss
      ? generateBossEncounter(depth)
      : generateRandomEncounter(depth);
    
    if (!encounter) {
      console.error("Failed to generate encounter");
      return;
    }
    
    this.state.combatState = createCombatState(
      this.state.party,
      encounter,
      isBoss,
      this.state.debugOptions,
      depth
    );
    this.state.currentEncounterId = `encounter_${Date.now()}`;
    this.state.mode = "combat";
  }

  /**
   * Submit a combat action for the current character
   */
  public submitCombatAction(action: CombatAction): void {
    if (!this.state.combatState || this.state.mode !== "combat") return;
    
    // Only allow action submission if we're in select-action phase
    if (this.state.combatState.phase !== "select-action") return;
    
    // Submit and execute the action
    submitAction(this.state.combatState, action);
    if (isPartyDefeated(this.state.combatState.party)) {
      this.state.party = this.state.combatState.party;
      this.state = resolvePartyDefeat(this.state, "combat");
    }
  }

  /**
   * After moving in exploration, decide if we should surface a procedural event
   */
  private handlePostMove(previousLocation: GameLocation): void {
    if (!this.eventsReady || this.state.mode !== "exploration") {
      return;
    }

    const currentLocation = this.state.location;
    const moved =
      previousLocation.x !== currentLocation.x ||
      previousLocation.y !== currentLocation.y ||
      previousLocation.depth !== currentLocation.depth;

    if (!moved) {
      return;
    }

    this.stepsSinceLastEvent += 1;
    if (this.stepsSinceLastEvent < MIN_STEPS_BETWEEN_EVENTS) {
      return;
    }

    if (gameRandom() < PROCEDURAL_EVENT_CHANCE) {
      const previousMode = this.state.mode;
      this.triggerProceduralEvent();
      if (this.state.mode !== previousMode) {
        this.stepsSinceLastEvent = 0;
      }
    }
  }
  
  /**
   * Get the current actor in combat (for UI to know whose turn it is)
   */
  public getCurrentCombatActor(): { isPlayer: boolean; index: number } | null {
    if (!this.state.combatState) return null;
    return getCurrentActor(this.state.combatState);
  }

  /**
   * Use a consumable item outside of combat on a target party member
   */
  public useConsumableOutOfCombat(itemId: string, targetIndex: number): boolean {
    if (this.getConsumableUnavailableReason(itemId, targetIndex)) return false;
    const inventory = this.state.party.inventory;
    const target = this.state.party.members[targetIndex];
    if (!target) return false;
    const item = useItem(inventory, itemId);
    if (!item) return false;

    switch (itemId) {
      case "medkit":
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 15);
        break;
      case "sedative":
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + 10);
        break;
      case "healing_potion":
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 20);
        break;
      case "greater_healing_potion":
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + 40);
        break;
      case "sanity_tonic":
        target.stats.sanity = Math.min(target.stats.maxSanity, target.stats.sanity + 20);
        break;
      case "antidote":
        target.statusEffects = target.statusEffects.filter((effect) => effect !== "poisoned");
        break;
    }

    return true;
  }

  public getConsumableUnavailableReason(itemId: string, targetIndex: number): string | null {
    if (this.state.mode !== "exploration") return "Items cannot be used right now.";
    const target = this.state.party.members[targetIndex];
    if (!target || !target.alive) return "Choose a living party member.";
    if (!ITEMS[itemId]?.usable || !this.state.party.inventory.items.some(
      (entry) => entry.item.id === itemId && entry.quantity > 0
    )) return "This item is not available.";
    if (itemId === "antidote") {
      return target.statusEffects.includes("poisoned") ? null : "Target is not poisoned.";
    }
    if (["medkit", "healing_potion", "greater_healing_potion"].includes(itemId)) {
      return target.stats.hp >= target.stats.maxHp ? "HP is already full." : null;
    }
    if (["sedative", "sanity_tonic"].includes(itemId)) {
      return target.stats.sanity >= target.stats.maxSanity ? "Sanity is already full." : null;
    }
    return "This item has no out-of-combat effect.";
  }

  public equipItem(characterIndex: number, itemId: string): boolean {
    if (this.state.mode !== "exploration") return false;
    const character = this.state.party.members[characterIndex];
    if (!character) return false;
    const item = ITEMS[itemId];
    if (!item?.equipment) return false;
    const { slot, requiredLevel, allowedCharacters } = item.equipment;
    const equipSlot = slot as import("./state").EquipmentSlot;
    const level = character.level || 1;
    if (requiredLevel && level < requiredLevel) return false;
    if (allowedCharacters && !allowedCharacters.includes(character.id)) return false;
    // Ensure item in inventory
    if (!removeItem(this.state.party.inventory, itemId, 1)) return false;

    // Unequip existing
    const previous = character.equipment?.[equipSlot];
    if (previous) {
      addItem(this.state.party.inventory, previous, 1);
    }
    if (!character.equipment) {
      character.equipment = {};
    }
    character.equipment[equipSlot] = itemId;
    this.recomputeStats(character);
    return true;
  }

  public unequipItem(characterIndex: number, slot: import("./state").EquipmentSlot): boolean {
    if (this.state.mode !== "exploration") return false;
    const character = this.state.party.members[characterIndex];
    if (!character?.equipment) return false;
    const current = character.equipment[slot];
    if (!current) return false;
    addItem(this.state.party.inventory, current, 1);
    character.equipment[slot] = null;
    this.recomputeStats(character);
    return true;
  }

  /**
   * End combat and return to exploration
   */
  public endCombat(): void {
    if (!this.state.combatState || this.state.mode !== "combat") return;
    if (this.state.combatState.phase === "defeat") {
      this.state.party = this.state.combatState.party;
      this.state = resolvePartyDefeat(this.state, "combat");
      return;
    }
    if (this.state.combatState.phase !== "victory" && this.state.combatState.phase !== "fled") return;
    
    // Sync party state back from combat
    this.state.party = this.state.combatState.party;
    
    // Mark boss defeated for this depth
    if (this.state.combatState.phase === "victory" && this.state.combatState.isBossFight && this.state.combatState.combatDepth) {
      const depth = this.state.combatState.combatDepth;
      if (!this.state.flags.bossDefeatedDepths) {
        this.state.flags.bossDefeatedDepths = new Set<number>();
      }
      this.state.flags.bossDefeatedDepths.add(depth);
    }
    
    this.state.combatState = undefined;
    this.state.mode = "exploration";
  }

  /**
   * Get current combat state
   */
  public getCombatState(): GameState["combatState"] {
    return this.state.combatState;
  }
}
