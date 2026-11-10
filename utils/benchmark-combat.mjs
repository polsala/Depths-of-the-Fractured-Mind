import { createServer } from "vite";
import { chromium } from "@playwright/test";

// Reproducible Canvas render proxy, not a claim about a physical handset.
// Four-times CPU throttling approximates a mid-range mobile browser.
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ headless: true });
  for (const spec of [
    { name: "desktop", width: 1280, height: 800, cpu: 1, budgetMs: 16.7 },
    { name: "mobile-4x", width: 390, height: 456, cpu: 4, budgetMs: 33 },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: 844 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: spec.cpu });
    await page.goto(`http://127.0.0.1:${port}${server.config.base}`);
    const samples = await page.evaluate(async ({ width, height, base }) => {
      const root = `${base.replace(/\/$/, "")}/src`;
      const [{ renderCombatUI }, { createCombatState }, { createDefaultParty },
        { createEnemyState }, { ENEMIES }, { characterAtlasesReady }] = await Promise.all([
        import(`${root}/graphics/combat-ui.ts`), import(`${root}/game/combat/state.ts`),
        import(`${root}/game/characters/party.ts`), import(`${root}/game/combat/encounters.ts`),
        import(`${root}/game/enemies.ts`),
        import(`${root}/assets/character-sprites.ts`),
      ]);
      const encounter = { enemies: ["deranged_guard", "corrupted_rat", "threshold_warden"]
        .map((id) => createEnemyState(ENEMIES[id])) };
      const state = createCombatState(createDefaultParty(), encounter, false, undefined, 1);
      const canvas = document.createElement("canvas");
      renderCombatUI(canvas, state, { width, height, nowMs: 0 });
      await characterAtlasesReady(["guard"]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const durations = [];
      for (let index = 0; index < 85; index++) {
        const start = performance.now();
        renderCombatUI(canvas, state, { width, height, nowMs: index * 120 });
        if (index >= 5) durations.push(performance.now() - start);
      }
      return durations;
    }, { width: spec.width, height: spec.height, base: server.config.base });
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const median = samples[Math.floor(samples.length * 0.5)];
    console.log(JSON.stringify({ profile: spec.name, samples: samples.length,
      medianMs: +median.toFixed(2), p95Ms: +p95.toFixed(2), budgetMs: spec.budgetMs }));
    await context.close();
    if (p95 > spec.budgetMs) process.exitCode = 1;
  }
} finally {
  await browser?.close();
  await server.close();
}
