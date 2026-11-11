import { test, expect } from "@playwright/test";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";
test("a retired title loading poll cannot rewrite an exploration checkpoint", async ({ page }) => {
  await page.route("**/data/events.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto("./?qa=1");
  await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
  const before = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  await page.waitForTimeout(800);
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(before);
});
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`physical presence preserves actions, identity, reduced motion and cleanup at ${viewport.width}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000); await page.setViewportSize(viewport);
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1",
      JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })));
    await page.goto("./?qa=1");
    await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
    await expect(page.locator(".dungeon-viewport")).toHaveAttribute("data-renderer", "webgl2");
    await expect(page.locator(".physical-presence")).toBeVisible();
    const before = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    for (const id of ["elias", "miriam", "subject13", "anya"]) {
      await page.locator(`.compact-party-member[data-character="${id}"]`).click();
      await expect(page.locator(".physical-presence")).toHaveAttribute("data-character", id);
      const image = await page.locator(".presence-hands").evaluate(async (element) => {
        const source = getComputedStyle(element).backgroundImage.slice(5, -2);
        const image = new Image(); image.src = source; await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      });
      expect(image).toEqual([1024, 512]);
      expect(await page.locator(`.compact-party .protagonist-portrait[data-character="${id}"]`).count()).toBe(1);
    }
    expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(before);
    await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setPresence({ id: "subject13", action: "interact", elapsedMs: 250, distressed: true }));
    await expect(page.locator(".physical-presence")).toHaveAttribute("data-pose", "1");
    expect(await page.locator(".presence-hands").evaluate((element) => element.style.transform)).toContain("translate(0px, 0px)");
    expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(before);
    await page.locator(".presence-stage").screenshot({ path: testInfo.outputPath(`presence-${viewport.width}.png`) });

    await page.getByText("Settings", { exact: true }).click();
    await expect(page.locator(".physical-presence")).toBeHidden();
    await page.getByText("Settings", { exact: true }).click();
    await page.evaluate(async () => {
      const hooks = (window as any).__THREE_GAME_TEST_HOOKS__;
      hooks.setPausedForScreenshot(false); await hooks.setState("interaction");
    });
    const randomBefore = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).randomState, SAVE_KEY);
    // A real input resolves the inspect once. Its presentation never replays the controller.
    await page.keyboard.press("f");
    await expect(page.locator(".physical-presence")).toHaveAttribute("data-action", "inspect");
    const committed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(committed.randomState).toBe(randomBefore);
    await page.waitForTimeout(1000);
    const settled = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(settled).toEqual(committed);
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
    }
    const life = await page.evaluate(() => (window as any).__PRESENCE_DIAGNOSTICS__().lifecycle);
    expect(life.active).toBe(1); expect(life.created - life.disposed).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    for (const button of await page.locator(".compact-party-member").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (viewport.width < 500) expect((await page.locator(".mobile-controls").boundingBox())!.y + (await page.locator(".mobile-controls").boundingBox())!.height).toBeLessThanOrEqual(viewport.height);
    expect(errors).toEqual([]);
  });
}

test("normal player build exposes no presentation mutation hooks", async ({ page }) => {
  await page.goto("./");
  expect(await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__)).toBeUndefined();
  expect(await page.evaluate(() => (window as any).__PRESENCE_DIAGNOSTICS__().visible)).toBe(false);
});
