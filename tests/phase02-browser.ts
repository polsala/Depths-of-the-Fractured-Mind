import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const eventData = JSON.parse(readFileSync(new URL("../public/data/events.json", import.meta.url), "utf8"));

export const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
export const readRun = (page: Page): Promise<any> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
export const dungeonReady = async (page: Page) => {
  await expect(page.locator('.dungeon-viewport')).toHaveAttribute('data-renderer', 'webgl2');
  await expect(page.locator('.dungeon-viewport')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
};
export async function pinSeedAndPreferences(page: Page, motion: "full" | "reduced" = "reduced") {
  await page.addInitScript(({ motion }) => {
    localStorage.setItem('depths-of-the-fractured-mind.preferences.v1', JSON.stringify({ music: 0, sfx: 0, motion, textScale: 100 }));
    // Replace only the entropy source: Begin Your Descent creates the run through
    // its normal command. No controller, map, stats or progression is injected.
    Object.defineProperty(crypto, 'getRandomValues', { value: (array: Uint32Array) => { array.fill(130013); return array; } });
  }, { motion });
}

export async function finishCombat(page: Page, metrics: { combatActions: number; fights: string[] }) {
  const opening = (await readRun(page)).state.combatState;
  metrics.fights.push(opening.encounter.enemies.map((e: any) => e.id).join('+'));
  for (let count = 0; count < 200; count++) {
    const run = await readRun(page), state = run.state, combat = state.combatState;
    if (state.mode === 'gameover' || combat?.phase === 'defeat') throw new Error('Party defeated on real-input journey');
    if (state.mode !== 'combat') return;
    if (combat.phase === 'victory' || combat.phase === 'fled') {
      const rewards = page.getByRole('dialog', { name: 'Victory rewards' });
      if (await rewards.count()) await rewards.getByRole('button', { name: 'Continue', exact: true }).click();
      else await page.getByRole('button', { name: 'Continue', exact: true }).click();
      continue;
    }
    const actorRef = combat.turnOrder[combat.currentTurnIndex];
    if (!actorRef?.isPlayer) throw new Error('Combat stalled before player input');
    const actor = state.party.members[actorRef.index];
    const living = state.party.members.filter((m: any) => m.alive);
    const weakest = [...living].sort((a: any, b: any) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp)[0];
    let ability: string | null = null, ally: any = null;
    if (actor.id === 'miriam' && weakest.stats.hp <= weakest.stats.maxHp * .55 && actor.stats.sanity >= 5) {
      ability = 'Field Surgery'; ally = weakest;
    } else if (actor.id === 'anya' && living.filter((m: any) => m.stats.hp <= m.stats.maxHp - 5).length >= 2 && actor.stats.sanity >= 8) {
      ability = 'Prayer of Calm';
    } else if (actor.id === 'subject13' && actor.level >= 2 && actor.stats.sanity >= 5) ability = 'Echo Bolt';
    else if (actor.id === 'elias' && combat.isBossFight && actor.level >= 2 && actor.stats.sanity >= 3 && !combat.encounter.enemies.find((e: any) => e.alive)?.statusEffects.includes('stunned')) ability = 'Crackdown';
    if (ability) {
      await page.getByRole('button', { name: 'Abilities', exact: true }).click();
      await page.getByRole('dialog', { name: 'Select ability' }).getByRole('button', { name: new RegExp(`^${ability}`) }).click();
      if (ally) await page.getByRole('dialog', { name: 'Select ally' }).getByRole('button', { name: new RegExp(ally.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
      else if (ability !== 'Prayer of Calm') await page.getByRole('dialog', { name: 'Select enemy' }).getByRole('button').filter({ hasText: combat.encounter.enemies.find((e: any) => e.alive).name }).click();
    } else {
      await page.getByRole('button', { name: 'Attack', exact: true }).click();
      await page.getByRole('dialog', { name: 'Select enemy' }).getByRole('button').filter({ hasText: combat.encounter.enemies.find((e: any) => e.alive).name }).click();
    }
    metrics.combatActions++;
  }
  throw new Error('Combat action bound exhausted');
}
export async function settleJourney(page: Page, metrics: { combatActions: number; fights: string[]; events: string[] }) {
  for (let index = 0; index < 20; index++) {
    const state = (await readRun(page)).state;
    if (state.mode === 'combat') { await finishCombat(page, metrics); continue; }
    if (state.mode === 'event') {
      metrics.events.push(state.currentEventId);
      const preferred: Record<string, string> = { first_corpse: 'examine', riot_recording_event: 'admit_responsibility', pit_fall_event: 'careful_rescue' };
      const event = eventData.events.find(e => e.id === state.currentEventId)!;
      const choice = event.choices.find(c => c.id === preferred[state.currentEventId]);
      const target = choice ? page.locator('.event-choice-button').filter({ hasText: choice.label }) : page.locator('.event-choice-button:enabled').first();
      if (await target.isEnabled()) await target.click();
      else await page.locator('.event-choice-button:enabled').first().click();
      continue;
    }
    const chest = page.getByRole('dialog', { name: 'Chest loot' });
    if (await chest.count()) { await chest.getByRole('button', { name: 'Close', exact: true }).click(); continue; }
    if (state.mode !== 'exploration') throw new Error(`Unexpected journey mode ${state.mode}`);
    await dungeonReady(page);
    return;
  }
  throw new Error('Journey mode bound exhausted');
}
export async function walkJourney(page: Page, tx: number, ty: number, metrics: { combatActions: number; fights: string[]; events: string[] }) {
  const run = await readRun(page), state = run.state, start = state.location;
  const map = state.depthMaps.find((entry: any[]) => entry[0] === start.depth)[1];
  const queue = [{ x: start.x, y: start.y, route: [] as string[] }], seen = new Set([`${start.x},${start.y}`]);
  let route: string[] | undefined;
  for (const node of queue) {
    if (node.x === tx && node.y === ty) { route = node.route; break; }
    for (const [dx, dy, direction] of [[0, -1, 'north'], [1, 0, 'east'], [0, 1, 'south'], [-1, 0, 'west']] as const) {
      const x = node.x + dx, y = node.y + dy, tile = map.tiles[y]?.[x], key = `${x},${y}`;
      if (tile?.passable && !tile.locked && !seen.has(key) && (tile.type !== 'stairsUp' || (x === tx && y === ty)) && (tile.type !== 'stairsDown' || (x === tx && y === ty))) {
        seen.add(key); queue.push({ x, y, route: [...node.route, direction] });
      }
    }
  }
  if (!route) throw new Error(`No legal route on Depth ${start.depth} to ${tx},${ty}`);
  const facing = ['north', 'east', 'south', 'west'];
  for (const direction of route) {
    const before = (await readRun(page)).state.location;
    if (before.depth !== start.depth) return;
    const turn = (facing.indexOf(direction) - facing.indexOf(before.direction ?? 'north') + 4) % 4;
    await page.keyboard.press(['w', 'd', 's', 'a'][turn]);
    await expect.poll(async () => (await readRun(page)).state.location).not.toEqual(before);
    await settleJourney(page, metrics);
    await expect.poll(() => page.evaluate(() => (window as any).__DUNGEON_DIAGNOSTICS__().moving)).toBe(false);
  }
}
export function findTile(map: any, predicate: (tile: any) => boolean): { x: number; y: number } {
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (predicate(map.tiles[y][x])) return { x, y };
  throw new Error('Required journey tile missing');
}

/** Use earned, finite supplies through the normal inventory UI before a guardian. */
export async function prepareParty(page: Page) {
  for (let index = 0; index < 12; index++) {
    const state = (await readRun(page)).state;
    const living = state.party.members.filter((m: any) => m.alive);
    const health = [...living].sort((a: any, b: any) => a.stats.hp / a.stats.maxHp - b.stats.hp / b.stats.maxHp)[0];
    const sanity = [...living].sort((a: any, b: any) => a.stats.sanity / a.stats.maxSanity - b.stats.sanity / b.stats.maxSanity)[0];
    const healing = state.party.inventory.items.find((entry: any) => ['greater_healing_potion', 'healing_potion', 'medkit'].includes(entry.item.id));
    const calming = state.party.inventory.items.find((entry: any) => ['sanity_tonic', 'sedative'].includes(entry.item.id));
    const item = health.stats.hp <= health.stats.maxHp - 10 && healing ? healing : sanity.stats.sanity <= sanity.stats.maxSanity - 8 && calming ? calming : null;
    if (!item) return;
    const target = item === healing ? health : sanity;
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await page.getByRole('dialog', { name: 'Inventory', exact: true }).getByText(item.item.name, { exact: true }).locator('..').locator('..').getByRole('button', { name: 'Use', exact: true }).click();
    await page.getByRole('dialog', { name: `Use ${item.item.name}`, exact: true }).getByRole('button').filter({ hasText: target.name }).click();
  }
}
