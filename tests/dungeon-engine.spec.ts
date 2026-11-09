import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
const snapshot = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const diagnostics = (page: Page) => page.evaluate(() => (window as any).__DUNGEON_DIAGNOSTICS__());
async function ready(page: Page) {
  await expect(page.locator(".dungeon-viewport")).toHaveAttribute("data-renderer", "webgl2");
  await expect(page.locator(".dungeon-viewport")).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
}
async function begin(page: Page, motion = "reduced") {
  await page.addInitScript((motion) => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1",
    JSON.stringify({ music: 0, sfx: 0, motion, textScale: 100 })), motion);
  await page.goto("./?qa=1");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await ready(page);
}

async function walk(page: Page, tx: number, ty: number) {
  const save = await snapshot(page);
  const map = save.state.depthMaps.find((entry: any[]) => entry[0] === 1)[1];
  const start = save.state.location;
  const queue = [{ x: start.x, y: start.y, path: [] as string[] }];
  const seen = new Set([`${start.x},${start.y}`]);
  let route: string[] | undefined;
  for (const node of queue) {
    if (node.x === tx && node.y === ty) { route = node.path; break; }
    for (const [dx, dy, direction] of [[0, -1, "north"], [1, 0, "east"], [0, 1, "south"], [-1, 0, "west"]] as const) {
      const x = node.x + dx, y = node.y + dy, tile = map.tiles[y]?.[x], key = `${x},${y}`;
      if (tile?.passable && !tile.locked && !seen.has(key)) { seen.add(key); queue.push({ x, y, path: [...node.path, direction] }); }
    }
  }
  if (!route) throw new Error(`No legal route to ${tx},${ty}`);
  const facing = ["north", "east", "south", "west"];
  let x = start.x, y = start.y;
  for (const direction of route) {
    const turn = (facing.indexOf(direction) - facing.indexOf(start.direction) + 4) % 4;
    await page.keyboard.press(["w", "d", "s", "a"][turn]);
    if (direction === "north") y--; else if (direction === "south") y++; else if (direction === "east") x++; else x--;
    await expect.poll(async () => (await snapshot(page)).state.location).toMatchObject({ x, y });
  }
  await expect.poll(async () => (await diagnostics(page)).moving).toBe(false);
}

test("actual WebGL2 camera serializes rapid input, resizes, blocks a closed door and safely falls back on context loss", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await begin(page, "full");
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.evaluate(() => {
    for (const key of ["w", "e", "d"]) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  await expect.poll(async () => (await diagnostics(page)).moving).toBe(false);
  await expect.poll(async () => (await snapshot(page)).state.location).toMatchObject({ x: 4, y: 14, direction: "east" });
  expect((await diagnostics(page)).sceneBuilds).toBe(1);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect.poll(async () => page.locator(".dungeon-viewport").evaluate((canvas: HTMLCanvasElement) => Math.abs(canvas.width / canvas.height - canvas.clientWidth / canvas.clientHeight))).toBeLessThan(0.02);
  await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState("door-occlusion"));
  const before = (await snapshot(page)).state.location;
  await page.keyboard.press("w");
  expect((await snapshot(page)).state.location).toEqual(before);
  expect((await diagnostics(page)).moving).toBe(false);
  const captures = new Map<string, Buffer>();
  for (const state of ["door-occlusion", "sprite-occlusion", "door-open", "sprite-visible"]) {
    await page.evaluate(async (state) => {
      const hooks = (window as any).__THREE_GAME_TEST_HOOKS__;
      await hooks.setState(state); hooks.setReducedMotion(true); hooks.setPausedForScreenshot(true);
    }, state);
    const path = testInfo.outputPath(`${state}.png`);
    const capture = await page.locator(".dungeon-viewport").screenshot({ path });
    captures.set(state, capture);
    await testInfo.attach(`${state}.png`, { path, contentType: "image/png" });
  }
  // Adding a card entirely behind the closed shutter changes zero pixels;
  // lifting that shutter makes the same card visible in the real WebGL pass.
  expect(captures.get("door-occlusion")!.equals(captures.get("sprite-occlusion")!)).toBe(true);
  expect(captures.get("door-open")!.equals(captures.get("sprite-visible")!)).toBe(false);
  const perception = new Map<string, Buffer>();
  for (const state of ["perception-clear", "perception"]) {
    await page.evaluate(async (state) => {
      const hooks = (window as any).__THREE_GAME_TEST_HOOKS__;
      await hooks.setState(state); hooks.setReducedMotion(true); hooks.setPausedForScreenshot(true);
    }, state);
    perception.set(state, await page.locator(".dungeon-viewport").screenshot({ path: testInfo.outputPath(`${state}.png`) }));
  }
  // High SAN is the default: the optional figure must actually survive alpha
  // testing at its intended faint opacity, with real walls still occluding it.
  expect(perception.get("perception-clear")!.equals(perception.get("perception")!)).toBe(false);
  await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
  await page.locator(".dungeon-viewport").evaluate((canvas: HTMLCanvasElement) => canvas.getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext());
  await expect(page.locator(".dungeon-viewport")).toHaveAttribute("data-renderer", "canvas-fallback");
  await page.keyboard.press("q");
  expect((await snapshot(page)).state.location.direction).toBe("west");
  expect(errors).toEqual([]);
});

test("real input completes intake mechanisms, story choice, combat and return payoff without debug actions", async ({ browser }, testInfo) => {
  test.setTimeout(210_000);
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 1280, height: 800 },
    recordVideo: process.env.RECORD_GAMEPLAY === "1" ? { dir: testInfo.outputPath("video"), size: { width: 1280, height: 800 } } : undefined });
  const page = await context.newPage();
  const video = page.video();
  try {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  let combatActions = 0;
  await page.setViewportSize({ width: 1280, height: 800 });
  await begin(page, process.env.RECORD_GAMEPLAY === "1" ? "full" : "reduced");
  await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
  await page.keyboard.press("t");
  await page.getByRole("button", { name: /Tell us where the director hid the evidence/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await ready(page);
  await walk(page, 18, 7);
  await page.keyboard.press("f");
  expect((await snapshot(page)).state.flags.intakePowerRestored).toBe(true);
  await walk(page, 12, 4);
  await page.keyboard.press("f");
  await page.getByRole("button", { name: /Examine the body/ }).click();
  await ready(page);
  await page.keyboard.press("f");
  await expect(page.locator(".combat-container canvas")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("intake-combat.png") });
  for (let action = 0; action < 100; action++) {
    const save = await snapshot(page);
    if (save.state.combatState?.phase === "victory") break;
    expect(save.state.mode).toBe("combat");
    const target = save.state.combatState.encounter.enemies.find((enemy: any) => enemy.alive);
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.getByRole("dialog", { name: "Select enemy" }).getByRole("button", { name: new RegExp(target.name) }).click();
    combatActions++;
  }
  expect((await snapshot(page)).state.combatState.phase).toBe("victory");
  const rewards = page.getByRole("dialog", { name: "Victory rewards" });
  if (await rewards.count()) await rewards.getByRole("button", { name: "Continue", exact: true }).click();
  else await page.getByRole("button", { name: "Continue", exact: true }).click();
  await ready(page);
  await walk(page, 4, 13);
  await page.keyboard.press("f");
  const end = await snapshot(page);
  expect(end.state.flags.intakeComplete).toBe(true);
  expect(end.state.depthMaps.length).toBe(1);
  expect(end.state.debugOptions.oneHitKill).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("intake-payoff.png") });
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
  await ready(page);
  expect((await snapshot(page)).state.flags.intakeComplete).toBe(true);
  expect(errors).toEqual([]);
  const journeyPath = testInfo.outputPath("intake-journey.json");
  writeFileSync(journeyPath, JSON.stringify({ seed: 130013, debug: false, combatActions,
    flags: end.state.flags, party: end.state.party.members.map((member: any) => ({ name: member.name, hp: member.stats.hp, sanity: member.stats.sanity })), errors }, null, 2));
  await testInfo.attach("intake-journey.json", { path: journeyPath, contentType: "application/json" });
  } finally {
    await context.close();
    if (video) {
      const path = testInfo.outputPath("intake-walkthrough.webm");
      await video.saveAs(path);
      await testInfo.attach("intake-walkthrough.webm", { path, contentType: "video/webm" });
    }
  }
});

test("a modal discards queued input and a cold renderer load queues only one grid action", async ({ page }) => {
  test.setTimeout(60_000);
  await page.route(/DungeonRenderer-.*\.js/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "full", textScale: 100 })));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await expect(page.locator(".renderer-loading")).toHaveText("Preparing the room…");
  await page.keyboard.press("w"); await page.keyboard.press("w"); await page.keyboard.press("e");
  await ready(page);
  await expect(page.locator(".renderer-loading")).toHaveCount(0);
  await expect.poll(async () => (await diagnostics(page)).moving).toBe(false);
  expect((await snapshot(page)).state.location).toMatchObject({ x: 4, y: 14, direction: "north" });
  await page.evaluate(() => {
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w", bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true }));
    [...document.querySelectorAll("button")].find((button) => button.textContent === "Inventory")!.click();
    document.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click();
  });
  await expect.poll(async () => (await diagnostics(page)).moving).toBe(false);
  expect((await snapshot(page)).state.location).toMatchObject({ x: 4, y: 13, direction: "north" });
  const inventory = page.getByRole("button", { name: "Inventory", exact: true });
  await inventory.click();
  await page.keyboard.press("s");
  expect((await snapshot(page)).state.location.y).toBe(13);
  await page.keyboard.press("Escape");
  await expect(inventory).toBeFocused();
  await page.keyboard.press("s");
  await expect.poll(async () => (await snapshot(page)).state.location.y).toBe(14);
  await expect.poll(async () => (await diagnostics(page)).moving).toBe(false);
});

test("v1 browser continuation keeps the saved map and random stream; repeated screen transitions own one renderer", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const raw = readFileSync(new URL("./fixtures/saves/v1/exploration.json", import.meta.url), "utf8");
  await page.addInitScript(({ raw, key }) => { localStorage.setItem(key, raw); localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })); }, { raw, key: SAVE_KEY });
  await page.goto("./");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const cycles = [];
  for (let index = 0; index < 10; index++) {
    await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
    await ready(page);
    const save = await snapshot(page);
    expect(save.randomState).toBe(JSON.parse(raw).randomState);
    expect(save.state.depthMaps).toEqual(JSON.parse(raw).state.depthMaps);
    const metrics = await diagnostics(page);
    expect(metrics.lifecycle.active).toBe(1);
    expect(metrics.lifecycle.created - metrics.lifecycle.disposed).toBe(1);
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Performance.getMetrics");
    cycles.push({ cycle: index + 1, lifecycle: metrics.lifecycle, geometries: metrics.geometries, textures: metrics.textures,
      jsHeapUsedBytes: heap.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value });
    await page.getByRole("button", { name: "Save & Return to Title" }).click();
  }
  const lifecyclePath = testInfo.outputPath("renderer-lifecycle.json");
  writeFileSync(lifecyclePath, JSON.stringify(cycles, null, 2));
  await testInfo.attach("renderer-lifecycle.json", { path: lifecyclePath, contentType: "application/json" });
});

test("unavailable WebGL2 starts a labeled playable fallback without consuming presentation RNG", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind: any, ...options: any[]) {
      if (kind === "webgl2") return null;
      return (original as any).call(this, kind, ...options);
    } as any;
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await expect(page.locator(".dungeon-viewport")).toHaveAttribute("data-renderer", "canvas-fallback");
  await expect(page.getByRole("status").filter({ hasText: "WebGL2 is unavailable" })).toBeVisible();
  const before = await snapshot(page);
  await page.keyboard.press("w");
  const after = await snapshot(page);
  expect(after.state.location).toMatchObject({ x: 4, y: 14 });
  expect(after.randomState).toBe(before.randomState);
  expect(after.state.depthMaps).toHaveLength(1);
});
