import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
const PREF_KEY = "depths-of-the-fractured-mind.preferences.v1";

test("320/390/768 layouts, touch input, keyboard modal and 200% text stay usable", async ({ browser }, testInfo) => {
  test.setTimeout(90_000); // Three independent WebGL contexts on software CI GPUs.
  for (const width of [320, 390, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto("./");
    await page.getByRole("button", { name: "Begin Your Descent" }).tap();
    await expect(page.getByRole("region", { name: "Current objective" })).toBeVisible();
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location.direction, SAVE_KEY);
    if (width < 768) {
      const canvas = await page.locator(".dungeon-viewport").boundingBox();
      const controls = await page.locator(".mobile-controls").boundingBox();
      expect(canvas && controls && controls.y >= canvas.y + canvas.height).toBe(true);
      await page.getByRole("button", { name: "Turn left" }).tap();
      await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location.direction, SAVE_KEY)).not.toBe(before);
      const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location.direction, SAVE_KEY);
      expect(after).not.toBe(before);
    }
    const inventory = page.getByRole("button", { name: "Inventory", exact: true });
    await inventory.click();
    const modal = page.getByRole("dialog", { name: "Inventory" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(inventory).toBeFocused();
    await page.locator(".settings-control summary").click();
    await page.getByLabel("Text size").selectOption("200");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.locator(".settings-control summary").click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`exploration-${width}.png`) });
    await page.getByRole("button", { name: "Save & Return to Title" }).click();
    await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await context.close();
  }
});

test("touch event choice, inventory and resume remain operable with a deterministic event fixture", async ({ browser }) => {
  let context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let page = await context.newPage();
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).tap();
  const raw = await page.evaluate((key) => {
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    snapshot.state.mode = "event";
    snapshot.state.currentEventId = "first_corpse";
    return JSON.stringify(snapshot);
  }, SAVE_KEY);
  const origin = new URL(page.url()).origin;
  await context.close();
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: SAVE_KEY, value: raw }] }] } });
  page = await context.newPage();
  await page.goto("./");
  await page.getByRole("button", { name: /Continue · Depth 1/ }).tap();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(scan.violations.map((violation) => violation.id)).toEqual([]);
  await page.getByRole("button", { name: /Examine the body/ }).tap();
  await expect(page.locator(".dungeon-viewport")).toBeVisible();
  await page.getByRole("button", { name: "Inventory", exact: true }).tap();
  await expect(page.getByRole("dialog", { name: "Inventory" })).toBeVisible();
  await page.getByRole("dialog", { name: "Inventory" }).getByRole("button", { name: "Close" }).tap();
  await page.getByRole("button", { name: "Save & Return to Title" }).tap();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).tap();
  await expect(page.locator(".dungeon-viewport")).toBeVisible();
  await context.close();
});

test("display/audio preferences survive reload and basic WCAG checks pass", async ({ page }) => {
  await page.goto("./");
  await page.locator(".settings-control summary").click();
  await page.getByLabel("Music volume").fill("0");
  await page.getByLabel("SFX volume").fill("0");
  await page.getByLabel("Motion").selectOption("reduced");
  await page.locator(".settings-control summary").click();
  await page.reload();
  await page.locator(".settings-control summary").click();
  await expect(page.getByLabel("Music volume")).toHaveValue("0");
  await expect(page.getByLabel("SFX volume")).toHaveValue("0");
  await expect(page.getByLabel("Motion")).toHaveValue("reduced");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).motion, PREF_KEY)).toBe("reduced");
  for (const mode of ["title", "exploration"] as const) {
    if (mode === "exploration") await page.getByRole("button", { name: "Begin Your Descent" }).click();
    for (const colorScheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      }))).toEqual([]);
    }
  }
});
