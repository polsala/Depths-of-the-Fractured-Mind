import { describe, expect, it, vi } from "vitest";
import eventData from "../public/data/events.json";
import { GameController } from "../src/game/index";
import { clearEventData } from "../src/game/events/loader";
import { getEventById, getChoiceUnavailableReason } from "../src/game/events/engine";
import { getDepthMap } from "../src/game/exploration/map";
import { createDefaultParty } from "../src/game/characters/party";
import { getAbility, canUseAbility } from "../src/game/abilities";
import { generateBossEncounter, generateRandomEncounter } from "../src/game/combat/encounters";
import { createCombatState, getCurrentActor, applyStatusEffect } from "../src/game/combat/state";
import { submitAction } from "../src/game/combat/turn-manager";
import { createEnemyState } from "../src/game/combat/encounters";
import { ENEMIES } from "../src/game/enemies";
import { enemyArt } from "../src/assets/enemy-visuals";
import { startRun } from "../src/game/random";
import { awardExperience } from "../src/game/experience";
import { addItem } from "../src/game/inventory";
import type { CombatState, CombatAction } from "../src/game/combat/state";
import type { PartyState } from "../src/game/state";

const action = (type: CombatAction["type"], actorIndex: number, targetIndex?: number,
  abilityId?: string): CombatAction => ({ type, actorIndex, targetIndex, abilityId,
    isPlayerAction: true, targetIsEnemy: type === "attack" || type === "ability" });

function tacticalAction(state: CombatState): CombatAction {
  const actorIndex = getCurrentActor(state)!.index;
  const actor = state.party.members[actorIndex];
  const targetIndex = state.encounter.enemies.findIndex((enemy) => enemy.alive);
  const living = state.party.members.map((member, index) => member.alive ? index : -1).filter((index) => index >= 0);
  const weakest = living.reduce((best, index) =>
    state.party.members[index].stats.hp / state.party.members[index].stats.maxHp <
    state.party.members[best].stats.hp / state.party.members[best].stats.maxHp ? index : best, living[0]);
  const patient = state.party.members[weakest];
  if (actor.id === "miriam" && patient.alive && patient.stats.hp <= patient.stats.maxHp * 0.55 &&
      canUseAbility(getAbility("field_surgery")!, actor)) {
    return action("ability", actorIndex, weakest, "field_surgery");
  }
  if (actor.id === "anya" && state.party.members.filter((member) => member.alive &&
      member.stats.hp <= member.stats.maxHp - 5).length >= 2 &&
      canUseAbility(getAbility("prayer_of_calm")!, actor)) {
    return action("ability", actorIndex, undefined, "prayer_of_calm");
  }
  if (actor.id === "subject13" && (actor.level ?? 1) >= 2 &&
      canUseAbility(getAbility("echo_bolt")!, actor)) {
    return action("ability", actorIndex, targetIndex, "echo_bolt");
  }
  if (actor.id === "elias" && state.isBossFight && (actor.level ?? 1) >= 2 &&
      canUseAbility(getAbility("crackdown")!, actor) &&
      !state.encounter.enemies[targetIndex].statusEffects.includes("stunned")) {
    return action("ability", actorIndex, targetIndex, "crackdown");
  }
  const incoming = Object.values(state.enemyIntents ?? {}).filter((intent) => intent.targetIndex === actorIndex).length;
  if (incoming >= 2 && actor.stats.hp < actor.stats.maxHp * 0.4) return action("defend", actorIndex);
  return action("attack", actorIndex, targetIndex);
}

function fight(party: PartyState, depth: number, boss: boolean): {
  won: boolean; rounds: number; actions: number; hpDamage: number; sanitySpent: number;
} {
  const encounter = boss ? generateBossEncounter(depth)! : generateRandomEncounter(depth)!;
  const state = createCombatState(party, encounter, boss, undefined, depth);
  let actions = 0, hpDamage = 0, sanitySpent = 0;
  while (state.phase === "select-action" && actions < 250) {
    const actor = getCurrentActor(state);
    if (!actor?.isPlayer || !state.party.members[actor.index].alive) break;
    const hpBefore = state.party.members.map((member) => member.stats.hp);
    const sanBefore = state.party.members.map((member) => member.stats.sanity);
    submitAction(state, tacticalAction(state));
    state.party.members.forEach((member, index) => {
      hpDamage += Math.max(0, hpBefore[index] - member.stats.hp);
      sanitySpent += Math.max(0, sanBefore[index] - member.stats.sanity);
    });
    actions++;
  }
  expect(actions, `softlock at depth ${depth} ${boss ? "boss" : "normal"}`).toBeLessThan(250);
  expect(state.phase).not.toBe("select-action");
  return { won: state.phase === "victory", rounds: state.turn, actions, hpDamage, sanitySpent };
}

describe("combat rules and balance fixtures", () => {
  it("gives every authored enemy a visible silhouette, hitbox and pivot", () => {
    const silhouettes = new Set<string>();
    for (const id of Object.keys(ENEMIES)) {
      const visual = enemyArt(id);
      expect(visual, id).not.toBeNull();
      expect(visual!.silhouette).toMatch(/^M/);
      expect(visual!.hitbox.width).toBeGreaterThan(0);
      expect(visual!.pivot.y).toBeGreaterThan(0);
      silhouettes.add(visual!.silhouette);
      for (const abilityId of ENEMIES[id].abilities) {
        const ability = getAbility(abilityId);
        expect(ability, `${id}: ${abilityId}`).toBeDefined();
        expect(ability!.effects.length, `${id}: ${abilityId}`).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(ENEMIES)).toHaveLength(15);
    expect(silhouettes.size).toBe(15);
  });

  it("telegraphs an attack, makes guard temporary and halves incoming ability damage", () => {
    startRun(13);
    const party = createDefaultParty();
    party.members = [party.members[0]];
    const state = createCombatState(party, { enemies: [createEnemyState(ENEMIES.threshold_warden)] }, true);
    state.turnOrder = [{ isPlayer: true, index: 0, speed: 6 }, { isPlayer: false, index: 0, speed: 5.9 }];
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "crushing_blow" } };
    const defense = party.members[0].stats.defense;
    submitAction(state, action("defend", 0));
    expect(party.members[0].stats.hp).toBe(31);
    expect(party.members[0].stats.defense).toBe(defense);
    expect(party.members[0].statusEffects).toContain("guarded");
    submitAction(state, action("attack", 0, 0));
    expect(party.members[0].statusEffects).not.toContain("guarded");
  });

  it("applies multi-hit damage and status to the current target, then expires it", () => {
    startRun(18);
    const party = createDefaultParty();
    party.members = [party.members[0]];
    const state = createCombatState(party, { enemies: [createEnemyState(ENEMIES.archivist_wraith)] });
    state.turnOrder = [{ isPlayer: true, index: 0, speed: 6 }, { isPlayer: false, index: 0, speed: 5.9 }];
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "paper_cut" } };
    submitAction(state, action("attack", 0, 0));
    expect(party.members[0].statusEffects).toContain("bleeding");
    expect(party.members[0].statusTurns?.bleeding).toBe(1);
    expect(party.members[0].stats.hp).toBe(32); // 6 hit + 2 bleed on round boundary
    applyStatusEffect(party.members[0], "poisoned", 2);
    expect(party.members[0].statusTurns?.poisoned).toBe(2);
  });

  it("makes damage-over-time finite and applies every hit of a multi-hit ability", () => {
    startRun(112);
    const party = createDefaultParty();
    party.members = [party.members[0]];
    const rat = createEnemyState(ENEMIES.corrupted_rat);
    rat.stats.hp = 100; rat.stats.maxHp = 100;
    const state = createCombatState(party, { enemies: [rat] });
    state.turnOrder = [{ isPlayer: true, index: 0, speed: 6 }, { isPlayer: false, index: 0, speed: 5.9 }];
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "swarm" } };
    submitAction(state, action("attack", 0, 0));
    expect(party.members[0].stats.hp).toBe(32); // Two hits of four, not one cloned hit.
    applyStatusEffect(party.members[0], "poisoned", 2);
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "swarm" } };
    submitAction(state, action("attack", 0, 0));
    expect(party.members[0].statusTurns?.poisoned).toBe(1);
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "swarm" } };
    submitAction(state, action("attack", 0, 0));
    expect(party.members[0].statusEffects).not.toContain("poisoned");
  });

  it("expires tactical buffs and prevents permanent boss stun-locks", () => {
    startRun(223);
    const party = createDefaultParty();
    party.members = [party.members[0]];
    awardExperience(party, 100);
    const boss = createEnemyState(ENEMIES.threshold_warden);
    boss.stats.hp = 180; boss.stats.maxHp = 180;
    const state = createCombatState(party, { enemies: [boss] }, true);
    state.turnOrder = [{ isPlayer: true, index: 0, speed: 7 }, { isPlayer: false, index: 0, speed: 5.9 }];
    state.enemyIntents = { 0: { targetIndex: 0, abilityId: "intimidate" } };
    const defense = party.members[0].stats.defense;
    submitAction(state, action("ability", 0, undefined, "stand_firm"));
    expect(party.members[0].stats.defense).toBe(defense + 5);
    expect(party.members[0].statusEffects).toContain("taunting");
    submitAction(state, action("ability", 0, 0, "crackdown"));
    expect(state.log.some((entry) => entry.message.includes("is stunned"))).toBe(true);
    expect(state.log.some((entry) => entry.message.includes("stunned!"))).toBe(true);
    expect(state.encounter.enemies[0].stunResistUntilTurn).toBeGreaterThan(state.turn);
    expect(party.members[0].stats.defense).toBe(defense);
    expect(party.members[0].statusEffects).not.toContain("taunting");
    submitAction(state, action("ability", 0, 0, "crackdown"));
    expect(state.encounter.enemies[0].statusEffects).not.toContain("stunned");
    expect(state.log.some((entry) => entry.message.includes("resists another stun"))).toBe(true);
  });

  it("redirects telegraphed attacks with taunt and never wastes a full-HP medkit", () => {
    startRun(545);
    const party = createDefaultParty();
    party.members = party.members.slice(0, 2);
    expect(addItem(party.inventory, "medkit", 1)).toBe(true);
    const state = createCombatState(party, { enemies: [createEnemyState(ENEMIES.deranged_guard)] });
    state.turnOrder = [
      { isPlayer: true, index: 0, speed: 6 },
      { isPlayer: false, index: 0, speed: 5.9 },
      { isPlayer: true, index: 1, speed: 5 },
    ];
    state.enemyIntents = { 0: { targetIndex: 1 } };
    submitAction(state, { ...action("item", 0, 0), itemId: "medkit" });
    expect(state.turn).toBe(1);
    expect(party.inventory.items.find((entry) => entry.item.id === "medkit")?.quantity).toBe(1);
    submitAction(state, action("ability", 0, undefined, "stand_firm"));
    expect(state.enemyIntents?.[0].targetIndex).toBe(0);
    expect(state.log.some((entry) => entry.message.includes("attacks Elias Ward"))).toBe(true);
    expect(party.members[0].statusEffects).toContain("taunting");
  });

  it("runs seeded normal and boss encounters at all depths without a stuck turn", () => {
    for (let depth = 1; depth <= 5; depth++) {
      for (const boss of [false, true]) {
        let wins = 0, rounds = 0;
        for (let seed = 1; seed <= 12; seed++) {
          startRun(seed * 100 + depth);
          const party = createDefaultParty();
          for (let level = 1; level < depth; level++) awardExperience(party, 100 + level * 150);
          const result = fight(party, depth, boss);
          wins += Number(result.won);
          rounds += result.rounds;
        }
        expect(wins, `depth ${depth} ${boss ? "boss" : "normal"}`).toBeGreaterThanOrEqual(8);
        expect(rounds / 12, `depth ${depth} encounter duration`).toBeLessThan(15);
      }
    }
  });

  it("keeps a no-cheat five-depth combat sequence playable", () => {
    const results: Array<{ seed: number; reached: number; fights: number; actions: number }> = [];
    const matrix = Array.from({ length: 5 }, (_, index) => ({ depth: index + 1, normal: {
      fights: 0, wins: 0, rounds: 0, hpDamage: 0, sanitySpent: 0,
    }, boss: { fights: 0, wins: 0, rounds: 0, hpDamage: 0, sanitySpent: 0 } }));
    for (let seed = 1; seed <= 20; seed++) {
      startRun(seed * 7919);
      const party = createDefaultParty();
      let reached = 0, fights = 0, actions = 0;
      for (let depth = 1; depth <= 5; depth++) {
        let wonDepth = true;
        for (const boss of [false, false, false, true]) {
          const result = fight(party, depth, boss);
          const record = matrix[depth - 1][boss ? "boss" : "normal"];
          record.fights++;
          record.wins += Number(result.won);
          record.rounds += result.rounds;
          record.hpDamage += result.hpDamage;
          record.sanitySpent += result.sanitySpent;
          fights++;
          actions += result.actions;
          if (!result.won) { wonDepth = false; break; }
        }
        if (!wonDepth) break;
        reached = depth;
      }
      results.push({ seed, reached, fights, actions });
    }
    if (process.env.REPORT_COMBAT_BALANCE) {
      console.log("Campaign combat", JSON.stringify(results));
      console.log("Campaign depth matrix", JSON.stringify(matrix));
    }
    expect(results.filter((result) => result.reached === 5).length).toBeGreaterThanOrEqual(12);
  });

  it("has a real seeded walk to the final decision without debug actions", async () => {
    clearEventData();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => structuredClone(eventData) })));
    try {
      const controller = new GameController(33);
      await vi.waitFor(() => expect(controller.isEventsLoaded()).toBe(true));
      controller.getState().mode = "exploration";
      const moves = [
        { dx: 0, dy: -1, run: () => controller.moveNorth() },
        { dx: 1, dy: 0, run: () => controller.moveEast() },
        { dx: 0, dy: 1, run: () => controller.moveSouth() },
        { dx: -1, dy: 0, run: () => controller.moveWest() },
      ];
      let fights = 0, movement = 0, consumables = 0;
      const settle = () => {
        for (let n = 0; n < 1000; n++) {
          const state = controller.getState();
          if (state.mode === "gameover" && process.env.REPORT_COMBAT_BALANCE) console.log("Game over", {
            depth: state.location.depth, cause: state.gameOverCause,
            party: state.party.members.map((member) => ({ id: member.id, hp: member.stats.hp, san: member.stats.sanity })),
            enemies: state.combatState?.encounter.enemies.map((enemy) => enemy.id),
            log: state.combatState?.log.slice(-15).map((entry) => entry.message),
          });
          if (state.mode === "exploration" || state.mode === "ending" || state.mode === "gameover") return;
          if (state.mode === "event") {
            const event = getEventById(state.currentEventId!)!;
            const choice = event.choices.find((entry) => !getChoiceUnavailableReason(entry, state));
            if (!choice) throw new Error(`No choice at ${event.id}`);
            controller.chooseEventChoice(choice.id);
          } else if (state.mode === "combat") {
            const combat = controller.getCombatState()!;
            if (combat.phase === "victory" || combat.phase === "defeat" || combat.phase === "fled") {
              if (combat.phase === "defeat" && process.env.REPORT_COMBAT_BALANCE) console.log("Final fight", {
                depth: state.location.depth, enemies: combat.encounter.enemies.map((enemy) => enemy.id),
                party: combat.party.members.map((member) => ({ id: member.id, hp: member.stats.hp, san: member.stats.sanity })),
                log: combat.log.slice(-15).map((entry) => entry.message),
              });
              if (combat.phase === "victory") fights++;
              controller.endCombat();
            } else {
              expect(getCurrentActor(combat)?.isPlayer).toBe(true);
              controller.submitCombatAction(tacticalAction(combat));
            }
          } else throw new Error(`Unexpected mode ${state.mode}`);
        }
        throw new Error("Combat/event did not settle");
      };
      for (; movement < 1500 && controller.getState().mode === "exploration"; movement++) {
        const state = controller.getState();
        state.party.members.forEach((member, index) => {
          if (!member.alive) return;
          if (member.stats.hp < member.stats.maxHp * 0.65) {
            for (const item of ["medkit", "healing_potion", "greater_healing_potion"]) {
              if (!controller.getConsumableUnavailableReason(item, index)) {
                if (controller.useConsumableOutOfCombat(item, index)) consumables++;
                break;
              }
            }
          }
          if (member.stats.sanity < member.stats.maxSanity * 0.45) {
            for (const item of ["sedative", "sanity_tonic"]) {
              if (!controller.getConsumableUnavailableReason(item, index)) {
                if (controller.useConsumableOutOfCombat(item, index)) consumables++;
                break;
              }
            }
          }
        });
        const map = getDepthMap(state.location.depth, state.depthMaps);
        const queue: Array<{ x: number; y: number; route: number[] }> = [
          { x: state.location.x, y: state.location.y, route: [] },
        ];
        const seen = new Set([`${state.location.x},${state.location.y}`]);
        let route: number[] | undefined;
        for (const node of queue) {
          if (map.tiles[node.y][node.x].type === "stairsDown") { route = node.route; break; }
          moves.forEach(({ dx, dy }, index) => {
            const x = node.x + dx, y = node.y + dy, key = `${x},${y}`;
            const tile = map.tiles[y]?.[x];
            if (tile?.passable && !tile.locked && !tile.trap && !seen.has(key)) {
              seen.add(key); queue.push({ x, y, route: [...node.route, index] });
            }
          });
        }
        if (!route) throw new Error(`No safe stair route at depth ${state.location.depth}`);
        if (!route.length) {
          const neighbor = moves.find(({ dx, dy }) => {
            const tile = map.tiles[state.location.y + dy]?.[state.location.x + dx];
            return tile?.passable && !tile.locked && !tile.trap;
          });
          if (!neighbor) throw new Error("Stair has no safe exit");
          neighbor.run();
        } else moves[route[0]].run();
        settle();
      }
      if (process.env.REPORT_COMBAT_BALANCE) console.log("Walking run", { movement, fights, consumables,
        depth: controller.getState().location.depth, mode: controller.getState().mode });
      expect(controller.getState().mode).toBe("ending");
      expect(controller.getState().location.depth).toBe(5);
      expect(controller.getDebugOptions().oneHitKill).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
});
