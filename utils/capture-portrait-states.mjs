import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/phase01b/portrait-states";
if (!output) throw new Error("Missing --output path");
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4187, strictPort: true } });
const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--enable-gpu"] });
const report = { ...await evidenceMetadata(), browser: browser.version(), seed: 130013, dpr: 1,
  method: "Dedicated browser-only derived save fixtures loaded through Continue. Wounded/stressed values are explicit injected QA scalars, not claimed player damage. Historical files and player storage untouched.", captures: [], errors: [], failures: [] };
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", timezoneId: "UTC" });
    await context.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })));
    const page = await context.newPage(); page.on("pageerror", (error) => report.errors.push(error.message));
    const url = `http://127.0.0.1:4187${server.config.base}?qa=1`;
    await page.goto(url);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
    const base = await page.evaluate(() => localStorage.getItem("depths-of-the-fractured-mind.run.v1"));
    for (const state of ["normal", "wounded", "stressed"]) {
      await page.getByRole("button", { name: "Save & Return to Title", exact: true }).click();
      await page.evaluate(({ base, state }) => {
        const save = JSON.parse(base);
        for (const member of save.state.party.members) {
          member.stats.hp = state === "wounded" ? Math.max(1, Math.floor(member.stats.maxHp * .25)) : member.stats.maxHp;
          member.stats.sanity = state === "stressed" ? Math.floor(member.stats.maxSanity * .25) : member.stats.maxSanity;
        }
        localStorage.setItem("depths-of-the-fractured-mind.run.v1", JSON.stringify(save));
      }, { base, state });
      await page.goto(url);
      await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
      await page.locator('.dungeon-viewport[data-renderer="webgl2"][data-ready="true"]').waitFor();
      await page.evaluate(() => { window.__THREE_GAME_TEST_HOOKS__.hideDebugUi(); window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true); });
      await page.locator(".party-vitals summary").click();
      await page.waitForTimeout(200);
      const portraits = await page.locator(".compact-party .protagonist-portrait").evaluateAll((elements) => elements.map((element) => ({ id: element.dataset.character, state: element.dataset.portraitState })));
      if (portraits.length !== 4 || portraits.some((portrait) => portrait.state !== state)) throw new Error(`Portrait state mismatch: ${state}/${JSON.stringify(portraits)}`);
      const presence = await page.locator(".physical-presence").getAttribute("data-action");
      if (presence !== ({ normal: "idle", wounded: "hurt", stressed: "tension" })[state]) throw new Error(`Body/status mismatch: ${state}/${presence}`);
      await page.locator(".viewport-container").screenshot({ path: `${output}/${viewport.width}-${state}-world-hud.png` });
      await page.locator(".party-wrapper").screenshot({ path: `${output}/${viewport.width}-${state}-portraits.png` });
      report.captures.push({ viewport, state, world: `${viewport.width}-${state}-world-hud.png`, portraits: `${viewport.width}-${state}-portraits.png`,
        diagnostics: await page.evaluate(() => window.__DUNGEON_DIAGNOSTICS__()), presence, states: portraits });
    }
    await context.close();
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n"); }
console.log(JSON.stringify({ captures: report.captures.length, errors: report.errors, failures: report.failures }));
if (report.errors.length || report.failures.length) process.exitCode = 1;
