import { test, expect } from "@playwright/test";

test("character laboratory is gated, uses actual WebGL2 and leaves saved gameplay unchanged", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./?art=1");
  await expect(page.getByRole("button", { name: "Begin Your Descent" })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__CHARACTER_ART_REVIEW__)).toBeUndefined();
  await page.goto("./?qa=1&art=1");
  await page.waitForFunction(() => !!(window as any).__CHARACTER_ART_REVIEW__);
  const saved = await page.evaluate(() => localStorage.getItem("depths-of-the-fractured-mind.run.v1"));
  for (const character of ["keeper", "guard"]) {
    await page.evaluate((character) => (window as any).__CHARACTER_ART_REVIEW__.show({ character, scene: "exploration" }), character);
    await expect(page.locator("canvas")).toHaveAttribute("data-renderer", "webgl2");
    const positions = [];
    for (const [animation, elapsedMs] of [["idle", 0], ["idle", 700], ["attack", 300], ["hit", 130], ["death", 650]] as const) {
      await page.evaluate(({ character, animation, elapsedMs }) => (window as any).__CHARACTER_ART_REVIEW__.show({ character, scene: "exploration", animation, elapsedMs }), { character, animation, elapsedMs });
      const data = await page.evaluate(() => (window as any).__CHARACTER_ART_REVIEW__.diagnostics());
      const actor = data.renderer.characters.find((entry: any) => entry.id === character);
      positions.push(actor.world);
      expect(actor.scaleY).toBe(1);
      expect(data.gameplayUnchanged).toBe(true); expect(data.renderer.assetErrors).toEqual([]);
    }
    expect(positions.every((position) => JSON.stringify(position) === JSON.stringify(positions[0]))).toBe(true);
  }
  expect(await page.evaluate(() => localStorage.getItem("depths-of-the-fractured-mind.run.v1"))).toBe(saved);
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`Keeper and Guard art fits exploration/combat at ${viewport.width}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000); await page.setViewportSize(viewport);
    await page.goto("./?qa=1&art=1");
    await page.waitForFunction(() => !!(window as any).__CHARACTER_ART_REVIEW__);
    for (const character of ["keeper", "guard"]) for (const scene of ["exploration", "combat"]) {
      await page.evaluate(({ character, scene }) => (window as any).__CHARACTER_ART_REVIEW__.show({ character, scene, animation: "idle", elapsedMs: 0 }), { character, scene });
      const canvas = page.locator("canvas"); await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(viewport.width); expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await canvas.screenshot({ path: testInfo.outputPath(`${character}-${scene}-${viewport.width}.png`) });
      expect((await page.evaluate(() => (window as any).__CHARACTER_ART_REVIEW__.diagnostics())).gameplayUnchanged).toBe(true);
    }
  });
}
