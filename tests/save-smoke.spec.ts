import { test, expect } from "@playwright/test";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";

test("title does not download dungeon props and exploration loads optimized art", async ({ page }) => {
  const assets: string[] = [];
  const missing: string[] = [];
  page.on("response", (response) => {
    if (!response.url().includes("/Depths-of-the-Fractured-Mind/assets/")) return;
    assets.push(response.url());
    if (!response.ok()) missing.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  await page.waitForTimeout(400);
  expect(assets.filter((url) => /\/(chest|strais_up|strais_down|vendor)\./.test(url))).toEqual([]);
  const nonAudioBytes = () => page.evaluate(() => performance.getEntriesByType("resource")
    .filter((entry) => !entry.name.endsWith(".ogg"))
    .reduce((total, entry) => total + (entry as PerformanceResourceTiming).transferSize, 0));
  expect(await nonAudioBytes()).toBeLessThan(512 * 1024);
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await expect(page.locator(".dungeon-viewport")).toBeVisible();
  await expect.poll(() => assets.some((url) => url.endsWith(".webp"))).toBe(true);
  expect(await nonAudioBytes()).toBeLessThan(2 * 1024 * 1024);
  expect(missing).toEqual([]);
});

test("four authored protagonist atlases load into the HUD on mobile", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  const loaded = new Set<string>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().endsWith("hero-atlas.png") && response.ok()) loaded.add(response.url());
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).tap();
  // Compact party summaries stay in the viewport; full portraits are now an
  // intentional disclosure so they do not crowd the mobile exploration view.
  await page.locator(".party-vitals summary").tap();
  await expect(page.locator(".party-panel")).toBeVisible();
  await expect.poll(() => loaded.size).toBe(4);
  const fits = await page.locator(".party-panel").evaluate((canvas: HTMLCanvasElement) => canvas.height >= 4 * 84 + 8);
  expect(fits).toBe(true);
  expect(errors).toEqual([]);
  await context.close();
});

test("Begin → progress → reload → Continue keeps the exploration screen and map view", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  const viewport = await page.locator(".viewport-container").elementHandle();
  await page.keyboard.press("q");
  expect(await viewport?.evaluate((node) => node === document.querySelector(".viewport-container"))).toBe(true);
  // The first intent may wait for the lazy 3D viewport. Observe the committed
  // action before reloading; the direction/save assertion remains unchanged.
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location.direction, SAVE_KEY)).toBe("west");
  const beforeReload = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location, SAVE_KEY);
  expect(beforeReload.direction).toBe("west");
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
  const afterReload = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location, SAVE_KEY);
  expect(afterReload).toEqual(beforeReload);
  await expect(page.locator(".dungeon-viewport")).toBeVisible();
  expect(errors).toEqual([]);
});

test("export/import, explicit deletion and corrupt-save recovery", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Save & Return to Title" }).click();
  const original = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Save" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("depths-of-the-fractured-mind-save.json");

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(original);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Save" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.locator("input[type=file]").setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(original!) });
  await expect(page.getByRole("button", { name: "Save & Return to Title" })).toBeVisible();

  await page.evaluate((key) => localStorage.setItem(key, "{broken"), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: /Continue/ })).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(original!) });
  await expect(page.getByRole("button", { name: "Save & Return to Title" })).toBeVisible();
});

test("touch NPC conversation survives reload and keyboard can reopen it", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).tap();
  await page.getByRole("button", { name: "Talk to the Keeper" }).tap();
  await expect(page.locator(".dialogue-portrait")).toBeVisible();
  await page.getByRole("button", { name: /Tell us where the director hid the evidence/ }).tap();
  await expect(page.getByText(/Look behind the resignation letter/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).tap();
  await expect(page.getByText(/Look behind the resignation letter/)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Talk to the Keeper" })).toBeVisible();
  await page.keyboard.press("t");
  await expect(page.getByText(/What have you learned/)).toBeVisible();
  await page.getByRole("button", { name: "Leave conversation" }).tap();
  expect(errors).toEqual([]);
  await context.close();
});

test("final choice and epilogue render on mobile and survive reload", async ({ browser }) => {
  let context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).tap();
  await expect(page.getByRole("region", { name: "Current objective" })).toContainText("Find a witness");
  await expect(page.getByText(/Map: blue = you/)).toBeVisible();

  // A valid persisted post-victory checkpoint isolates the ending UI from the
  // separate combat rules tested in campaign-endings.test.ts.
  const raw = await page.evaluate((key) => {
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const map = structuredClone(snapshot.state.depthMaps[0][1]);
    map.depth = 5;
    // This synthetic ending checkpoint is not the authored Depth-1 intake.
    delete map.layoutId;
    for (const row of map.tiles) for (const tile of row) delete tile.featureId;
    snapshot.state.depthMaps.push([5, map]);
    snapshot.state.location.depth = 5;
    snapshot.state.flags.bossDefeatedDepths = [5];
    snapshot.state.mode = "ending";
    return JSON.stringify(snapshot);
  }, SAVE_KEY);
  const origin = new URL(page.url()).origin;
  await context.close();
  // A fresh browser context prevents the previous pagehide handler from
  // overwriting the fixture with its still-active depth-one state.
  context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: SAVE_KEY, value: raw }] }] },
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: /Continue · Depth 5/ }).tap();
  await expect(page.getByRole("heading", { name: /Engine is silent/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Broadcast the evidence" })).toBeDisabled();
  await page.getByRole("button", { name: "Seal the Engine" }).tap();
  await expect(page.getByRole("heading", { name: "Containment" })).toBeVisible();
  await expect(page.getByText(/Survivors: Elias Ward/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 5/ }).tap();
  await expect(page.getByRole("heading", { name: "Containment" })).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
