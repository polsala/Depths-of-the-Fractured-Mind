import { test, expect } from "@playwright/test";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";

test("desktop and mobile combat show enemy bodies, telegraphs, and skippable effects", async ({ browser }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    let context = await browser.newContext({ viewport, reducedMotion: viewport.width < 500 ? "reduce" : "no-preference" });
    let page = await context.newPage();
    const errors: string[] = [];
    await page.goto("./");
    await page.getByRole("button", { name: "Begin Your Descent" }).click();
    const raw = await page.evaluate((key) => {
      const save = JSON.parse(localStorage.getItem(key)!);
      const enemy = (id: string, name: string, hp: number) => ({
        id, name, alive: true, statusEffects: [], stats: {
          hp, maxHp: hp, sanity: 5, maxSanity: 10, attack: 6, defense: 4, will: 2, focus: 4,
        },
      });
      save.state.mode = "combat";
      save.state.combatState = {
        party: save.state.party,
        encounter: { enemies: [enemy("deranged_guard", "Deranged Guard", 20),
          enemy("corrupted_rat", "Corrupted Rat", 10), enemy("threshold_warden", "Threshold Warden", 80)] },
        turn: 1, phase: "select-action", currentTurnIndex: 0,
        turnOrder: [{ isPlayer: true, index: 0, speed: 6 }],
        enemyIntents: { 0: { targetIndex: 0, abilityId: "baton_strike" },
          1: { targetIndex: 1, abilityId: "bite" }, 2: { targetIndex: 2, abilityId: "crushing_blow" } },
        shownLowHealthDialogues: [], log: [{ message: "Combat begins!", type: "system" }],
        isBossFight: false, combatDepth: 1,
      };
      return JSON.stringify(save);
    }, SAVE_KEY);
    const origin = new URL(page.url()).origin;
    await context.close();
    context = await browser.newContext({ viewport, reducedMotion: viewport.width < 500 ? "reduce" : "no-preference",
      storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: SAVE_KEY, value: raw }] }] } });
    page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
    const canvas = page.locator(".combat-container canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByRole("button", { name: "Toggle combat motion effects" }))
      .toHaveText(viewport.width < 500 ? "Effects: Off" : "Effects: On");
    await page.getByRole("button", { name: "Toggle combat motion effects" }).click();
    await expect(page.getByRole("button", { name: "Toggle combat motion effects" }))
      .toHaveText(viewport.width < 500 ? "Effects: On" : "Effects: Off");
    const pixels = await canvas.evaluate((element: HTMLCanvasElement) => {
      const ctx = element.getContext("2d")!;
      const w = element.width, h = element.height;
      const countLime = (x: number) => {
        const data = ctx.getImageData(Math.floor(w * x), Math.floor(h * 0.2),
          Math.max(1, Math.floor(w * 0.2)), Math.max(1, Math.floor(h * 0.24))).data;
        let visible = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Corrupted Rat's lime outline, excluding red HP/blue SAN bars.
          if (data[i + 1] > 115 && data[i + 1] > data[i] * 1.1 && data[i + 2] < 180) visible++;
        }
        return visible;
      };
      return { center: countLime(0.4), left: countLime(0.25) };
    });
    expect(pixels.center).toBeGreaterThan(8);
    expect(pixels.center).toBeGreaterThan(pixels.left);
    if (process.env.CAPTURE_COMBAT) await page.screenshot({ path: `/tmp/pack6-${viewport.width}.png`, fullPage: true });
    expect(errors).toEqual([]);
    await context.close();
  }
});
