import { gameRandom } from "./random";
import type { DebugOptions, GameLocation, GameState } from "./state";
import { createInitialGameState } from "./state";
import { createDefaultParty } from "./characters/party";
import { moveEast, moveNorth, moveSouth, moveWest, moveForward, moveBackward, strafeLeft, strafeRight, resolveDownStairs } from "./exploration/movement";
import { applyEventChoice, startEvent } from "./events/engine";
import { registerMandatoryEvents } from "./events/mandatory";
import { loadEventDataFile } from "./events/loader";
import { selectEventForLocation } from "./events/procedural";
import { generateRandomEncounter, generateBossEncounter, createEnemyState } from "./combat/encounters";
import { ENEMIES } from "./enemies";
import { createCombatState, type CombatAction, getCurrentActor, isPartyDefeated } from "./combat/state";
import { planEnemyIntents } from "./combat/intents";
import { submitAction, clearCombatModifiers } from "./combat/turn-manager";
import { getDepthMap } from "./exploration/map";
import { isRequiredBeat } from "./story";
import { getEndingOptions } from "./endings";
import { NPCS, getDialogue, getDialogueChoiceUnavailableReason, markDialogueShown, shouldShowDialogue } from "./dialogue";
import { applyEventEffect } from "./events/resolvers";
import { useItem, removeItem, addItem, ITEMS } from "./inventory";
import { resolvePartyDefeat, transitionToGameOver } from "./defeat";
import type { MapTile } from "./exploration/map";
import type { RunSnapshot } from "./save";
import { startRun, restoreRandomState, getRandomState, getRunSeed } from "./random";
import { emitSound } from "./sound";
import { createIntakeMap, isIntakeMap, INTAKE_FEATURES } from "./exploration/authored/depth1-intake";

const PROCEDURAL_EVENT_CHANCE = 0.02;
const MIN_STEPS_BETWEEN_EVENTS = 2;

export interface ExplorationInteraction {
  id: string;
  label: string;
  description: string;
}

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
      ...createInitialGameState(createIntakeMap()),
      party: createDefaultParty(),
    };
    this.state.party.inventory.money = 100;
    this.stepsSinceLastEvent = 0;
    this.lastProceduralEventId = null;
    this.state.explorationNotice = "The intake bell rings once. Four arrivals. No releases. The amber patient counter has been left running.";
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
    // Pack 05 combat saves had no telegraphed intents. Upgrade in memory while
    // retaining the saved party/enemy state and the deterministic RNG stream.
    if (this.state.combatState && !this.state.combatState.enemyIntents) {
      this.state.combatState.enemyIntents = planEnemyIntents(
        this.state.combatState.party, this.state.combatState.encounter);
    }
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

  public turnLeft(): void {
    if (this.state.mode !== "exploration") return;
    const left = { north: "west", west: "south", south: "east", east: "north" } as const;
    this.state = { ...this.state, location: { ...this.state.location, direction: left[this.state.location.direction ?? "north"] } };
  }

  public turnRight(): void {
    if (this.state.mode !== "exploration") return;
    const right = { north: "east", east: "south", south: "west", west: "north" } as const;
    this.state = { ...this.state, location: { ...this.state.location, direction: right[this.state.location.direction ?? "north"] } };
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
    const resolvingIntakeEvidence = this.state.currentEventId === "first_corpse" &&
      isIntakeMap(this.state.depthMaps?.get(this.state.location.depth));
    const wasRequiredAtStair = isRequiredBeat(this.state.currentEventId) &&
      getDepthMap(this.state.location.depth, this.state.depthMaps)
        .tiles[this.state.location.y]?.[this.state.location.x]?.type === "stairsDown";
    this.state = applyEventChoice(this.state, choiceId);
    if (resolvingIntakeEvidence && this.state.mode === "exploration" && this.state.flags.completedEventIds?.has("first_corpse")) {
      this.state.flags.intakeEvidenceResolved = true;
      this.state.explorationNotice = (this.state.party.members.some((member) => member.id === "miriam" && member.alive)
        ? "Miriam reads a name on the tag: Mara Voss. " : "The tag bears a name: Mara Voss. ") +
        "A guard and a rat stir beyond the admission chair. Prepare your party, then interact with the body again to confront them.";
    }
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

  /** Presentation asks for the same validated interaction that the command executes. */
  public getInteraction(): ExplorationInteraction | null {
    if (this.state.mode !== "exploration") return null;
    const map = this.state.depthMaps?.get(this.state.location.depth);
    if (!isIntakeMap(map) || !map) return null;
    const { x, y } = this.state.location;
    const offsets = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] } as const;
    const [dx, dy] = offsets[this.state.location.direction ?? "north"];
    const adjacent = map.tiles[y + dy]?.[x + dx];
    // The wall counter is deliberately read from across its desk. This is a
    // two-cell, facing-only exception; all other features stay current/adjacent.
    // Missing, solid or locked intermediate cells never permit reaching through.
    const distantCounter = adjacent?.passable && !adjacent.locked &&
      map.tiles[y + dy * 2]?.[x + dx * 2]?.featureId === "intake-counter";
    const id = map.tiles[y]?.[x]?.featureId ?? adjacent?.featureId ?? (distantCounter ? "intake-counter" : undefined);
    const flags = this.state.flags;
    switch (id) {
      case "intake-counter": return { id, label: flags.intakeTagRecovered && !flags.intakeComplete ? "Return Mara's intake tag" : "Read the patient counter",
        description: flags.intakeComplete ? "Mara Voss is recorded as released. The descent is open." : "Four arrivals. Zero releases. A name is missing from the register." };
      case "release-breaker": return { id, label: flags.intakePowerRestored ? "Inspect the release circuit" : "Restore release power",
        description: "A manual breaker feeds the security shutter. Its wire was routed around the patient-call circuit." };
      case "release-shutter": return { id, label: flags.intakePowerRestored ? "Inspect the open shutter" : "Inspect the locked shutter",
        description: flags.intakePowerRestored ? "The release shutter is lifted. The evidence bay lies beyond." : "RELEASE POWER OFF. Follow the amber cable east to the control booth." };
      case "intake-evidence": return { id, label: !flags.completedEventIds?.has("first_corpse") ? "Examine the first body" : !flags.intakeEncounterWon ? "Confront the security detail" : "Read the empty admission chair",
        description: !flags.completedEventIds?.has("first_corpse") ? "A worker holds a patient tag beside an overturned admission chair." : !flags.intakeEncounterWon ? "A guard blocks the tag; a rat circles its feet. Interact to begin combat. You can retreat and return without restoring their health." : "The tag is safe. Bring it back to the amber counter in Admissions." };
      case "linen-shelf": return { id, label: flags.intakeLinenTaken ? "Read the linen label" : "Search the linen shelf",
        description: "Someone wrote a name underneath the number. There may be medical supplies behind the folded clothes." };
      case "queue-shadow": return { id, label: "Listen to the queue echo", description: "A fifth silhouette waits in a queue built for four. The real passage remains unchanged." };
      case "intake-onward": return { id, label: flags.intakeComplete ? "Descend toward the guardian" : "Inspect the sealed descent",
        description: flags.intakeComplete ? "The counter has released the stair. The Threshold's guardian still waits below." : "The descent remains sealed until a patient is recorded as released. Return a name to the intake counter." };
      case "intake-keeper": return { id, label: "Talk to the Keeper", description: "The Keeper remembers the intake room before its records went silent." };
      default:
        return this.getNearbyNpcId() ? { id: "intake-keeper", label: "Talk to the Keeper", description: "A witness waits beside the entrance." } : null;
    }
  }

  public getExplorationNotice(): string {
    return this.state.explorationNotice ?? "Read the room, watch the map, and prepare before confronting a threat.";
  }

  /** Resolves one discrete interaction; no renderer or animation can apply an effect. */
  public interact(): boolean {
    const interaction = this.getInteraction();
    if (!interaction) return false;
    const flags = this.state.flags;
    const map = this.state.depthMaps!.get(this.state.location.depth)!;
    const living = (id: string) => this.state.party.members.some((member) => member.id === id && member.alive);
    switch (interaction.id) {
      case "intake-keeper": return this.startDialogue();
      case "intake-counter":
        if (flags.intakeTagRecovered && !flags.intakeComplete) {
          flags.intakeComplete = true;
          map.tiles[14][2].type = "stairsDown";
          this.state.party.members.forEach((member) => {
            if (member.alive) member.stats.sanity = Math.min(member.stats.maxSanity, member.stats.sanity + 2);
          });
          const witness = living("anya") ? "Anya says her name aloud. " : "The surviving companions read her name aloud. ";
          const response = flags.intakePerceptionAcknowledged && living("subject13") ? "Subject 13 answers, 'You heard her too.' " : "A person has replaced a number. ";
          this.state.explorationNotice = "MARA VOSS — RELEASED. The counter turns once. " + witness + response + "The descent opens. Each living companion recovers 2 SAN.";
          emitSound("event_choice");
        } else this.state.explorationNotice = interaction.description + (flags.intakeComplete ? "" : " Restore release power in the eastern booth, recover the tag, then bring it here.");
        break;
      case "release-breaker":
        if (!flags.intakePowerRestored) {
          flags.intakePowerRestored = true;
          map.tiles[INTAKE_FEATURES.shutter.y][INTAKE_FEATURES.shutter.x].locked = false;
          this.state.explorationNotice = "The breaker locks into place. The shutter lifts. " +
            (living("elias") ? "Elias recognizes his signature on the bypass order: 'We cut the call wire to keep them quiet.' " : "Elias's signature remains on the bypass order that cut the patient-call wire. ") +
            "The evidence bay is now accessible.";
          emitSound("event_choice");
        } else this.state.explorationNotice = "The release circuit is stable. The shutter stays open.";
        break;
      case "intake-evidence":
        if (!flags.completedEventIds?.has("first_corpse")) {
          this.state = startEvent(this.state, "first_corpse");
        } else if (!flags.intakeEncounterWon) {
          const encounter = this.state.intakeEncounter ?? { enemies: [createEnemyState(ENEMIES.deranged_guard), createEnemyState(ENEMIES.corrupted_rat)] };
          this.state.combatState = createCombatState(this.state.party, encounter, false, this.state.debugOptions, 1);
          this.state.currentEncounterId = "intake-security";
          this.state.mode = "combat";
        } else this.state.explorationNotice = interaction.description;
        break;
      case "linen-shelf":
        if (!flags.intakeLinenTaken) {
          if (addItem(this.state.party.inventory, "medkit", 1)) {
            flags.intakeLinenTaken = true;
            this.state.explorationNotice = "A medical kit is tucked behind the folded clothes. The label says MARA, beneath a crossed-out patient number. You take one kit.";
            emitSound("ui_click");
          } else this.state.explorationNotice = "Your inventory is full. The medical kit remains on the linen shelf; make room and return.";
        } else this.state.explorationNotice = "MARA is written under the crossed-out number. The shelf's medical kit has already been taken.";
        break;
      case "queue-shadow":
        flags.intakePerceptionSeen = true;
        flags.intakePerceptionAcknowledged = true;
        this.state.explorationNotice = (living("subject13") ? "You wait with Subject 13. " : "You listen to the empty queue. ") +
          "The fifth shadow fades, but the name MARA remains in the echo. " +
          (living("anya") ? "Anya counts the living companions. " : "The survivors count one another. ") + "The real route has not changed.";
        emitSound("sanity_tick");
        break;
      default: this.state.explorationNotice = interaction.description;
    }
    return true;
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

    if (isIntakeMap(this.state.depthMaps?.get(currentLocation.depth))) {
      if (!this.state.flags.intakePerceptionSeen && currentLocation.x === 12 && currentLocation.y === 11) {
        this.state.flags.intakePerceptionSeen = true;
        this.state.explorationNotice = (this.state.party.members.some((member) => member.id === "subject13" && member.alive)
          ? "Subject 13 whispers: 'There is someone else in the queue.' " : "An extra silhouette waits in the empty queue. ") +
          "A displaced shadow points toward the linen recess. Count the living companions; the way ahead is still real.";
        emitSound("sanity_tick");
      }
      return; // Authored beats own this sequence; no random interruptions.
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

    emitSound("item_use");
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
    clearCombatModifiers(this.state.combatState);
    if (this.state.combatState.phase === "defeat") {
      this.state.party = this.state.combatState.party;
      this.state = resolvePartyDefeat(this.state, "combat");
      return;
    }
    if (this.state.combatState.phase !== "victory" && this.state.combatState.phase !== "fled") return;
    const intakeFight = this.state.currentEncounterId === "intake-security";
    const intakeVictory = intakeFight && this.state.combatState.phase === "victory";
    if (intakeFight) {
      if (intakeVictory) {
        this.state.flags.intakeEncounterWon = true;
        this.state.flags.intakeTagRecovered = true;
        this.state.intakeEncounter = undefined;
        this.state.explorationNotice = "The security detail falls silent. You recover Mara Voss's intake tag. Return it to the amber counter in Admissions; the open shutter marks your way back.";
      } else {
        this.state.intakeEncounter = this.state.combatState.encounter;
        this.state.location = { depth: 1, x: 12, y: 7, direction: "north" };
        this.state.explorationNotice = "You retreat to Observation. The security detail remains wounded in the evidence bay. Prepare, then interact with the body to resume the fight.";
      }
    }
    const victoriousBossDepth = this.state.combatState.phase === "victory" && this.state.combatState.isBossFight
      ? this.state.combatState.combatDepth : undefined;
    
    // Sync party state back from combat
    this.state.party = this.state.combatState.party;
    this.state = resolvePartyDefeat(this.state, "combat");
    if (this.state.mode === "gameover") return;
    
    // Mark boss defeated for this depth
    if (victoriousBossDepth) {
      if (!this.state.flags.bossDefeatedDepths) {
        this.state.flags.bossDefeatedDepths = new Set<number>();
      }
      this.state.flags.bossDefeatedDepths.add(victoriousBossDepth);
    }
    
    this.state.combatState = undefined;
    this.state.mode = "exploration";
    this.state.currentEncounterId = undefined;
    if (victoriousBossDepth === this.state.location.depth &&
        getDepthMap(this.state.location.depth, this.state.depthMaps)
          .tiles[this.state.location.y]?.[this.state.location.x]?.type === "stairsDown") {
      this.state = resolveDownStairs(this.state);
    }
  }

  public chooseEnding(decision: import("./state").FinalDecision): boolean {
    if (this.state.mode !== "ending" || this.state.finalDecision ||
        !this.state.flags.bossDefeatedDepths?.has(5) ||
        !this.state.party.members.some((member) => member.alive && member.stats.hp > 0)) return false;
    if (!getEndingOptions(this.state).some((option) => option.id === decision && !option.unavailableReason)) return false;
    this.state = { ...this.state, finalDecision: decision };
    return true;
  }

  /**
   * Get current combat state
   */
  public getCombatState(): GameState["combatState"] {
    return this.state.combatState;
  }
}
