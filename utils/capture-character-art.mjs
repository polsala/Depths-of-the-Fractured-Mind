import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const output = process.env.CHARACTER_OUTPUT || "artifacts/phase01-art/current";
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4183, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const url = `http://127.0.0.1:4183${server.config.base}`;
const hash = (data) => createHash("sha256").update(data).digest("hex");
const assetPaths = ["keeper/character-atlas.png", "keeper/idle.png", "guard/character-atlas.png", "guard/idle.png", "phase01a-build.json"]
  .map((path) => `public/assets/sprites/characters/${path}`);
const report = { ...await evidenceMetadata(), capturedAt: new Date().toISOString(), browser: browser.version(), seed: 130013,
  settings: "DPR1, en-US, UTC, dark, muted; fixed pose times in art fixtures; actual-game captures labeled separately; software GPU is not timing approval",
  runtimeAssets: Object.fromEntries(await Promise.all(assetPaths.map(async (path) => [path, hash(await readFile(path))]))),
  captures: [], videos: [], errors: [], failures: [] };

function errors(page, label) {
  page.on("pageerror", (error) => report.errors.push({ label, type: "page", message: error.message }));
  page.on("console", (message) => { if (message.type() === "error") report.errors.push({ label, type: "console", message: message.text() }); });
  page.on("response", (response) => { if (response.status() >= 400) report.errors.push({ label, type: "http", status: response.status(), url: response.url() }); });
  page.on("requestfailed", (request) => report.errors.push({ label, type: "network", url: request.url(), message: request.failure()?.errorText }));
}

async function capture(page, name, viewport, kind, diagnostics) {
  await page.screenshot({ path: `${output}/${name}.png` });
  await page.screenshot({ path: `${output}/${name}-full.png`, fullPage: true });
  const canvas = page.locator("canvas").first();
  await canvas.screenshot({ path: `${output}/${name}-canvas.png` });
  report.captures.push({ name, viewport, kind, screenshot: `${name}.png`, crop: `${name}-canvas.png`,
    fullPage: `${name}-full.png`, sha256: hash(await readFile(`${output}/${name}.png`)), diagnostics });
  console.log(JSON.stringify({ name, kind }));
}

try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", colorScheme: "dark",
      isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    await context.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })));
    const page = await context.newPage(); errors(page, viewport.width);
    await page.goto(`${url}?qa=1&art=1`); await page.waitForFunction(() => !!window.__CHARACTER_ART_REVIEW__);
    const cases = [{ scene: "gallery", character: "keeper", animation: "idle", elapsedMs: 0 }];
    for (const character of ["keeper", "guard"]) cases.push(
      { character, scene: "sequence", animation: "idle", elapsedMs: 0 },
      { character, scene: "combat", animation: "idle", elapsedMs: 0 },
      { character, scene: "exploration", animation: "attack", elapsedMs: 300 },
      { character, scene: "combat", animation: "hit", elapsedMs: 180 },
      { character, scene: "combat", animation: "death", elapsedMs: 650, reducedMotion: true });
    for (const item of cases) {
      await page.evaluate(async (item) => { await window.__CHARACTER_ART_REVIEW__.show({ ...item, reducedMotion: item.reducedMotion ?? false }); window.__CHARACTER_ART_REVIEW__.hideControls(); }, item);
      const diagnostics = await page.evaluate(() => window.__CHARACTER_ART_REVIEW__.diagnostics());
      if (!diagnostics.gameplayUnchanged || diagnostics.savedChanges) throw new Error("Art fixture changed gameplay");
      if (item.scene === "exploration" && (diagnostics.renderer.backend !== "webgl2" || diagnostics.renderer.assetErrors.length)) throw new Error("Art world is not healthy WebGL2");
      await capture(page, `${viewport.width}-${item.character}-${item.scene}-${item.animation}`, viewport, "isolated-presentation-fixture", diagnostics);
    }
    // Actual application route: witnesses and security detail use the same
    // assets with the real HUD, and combat is entered through the existing event.
    await page.goto(`${url}?qa=1`);
    for (const [name, state] of [["keeper", "npc"], ["guard", "evidence-bay"]]) {
      await page.evaluate(async (state) => { const hooks = window.__THREE_GAME_TEST_HOOKS__; await hooks.setState(state); hooks.setPausedForScreenshot(true); hooks.hideDebugUi(); document.querySelectorAll('.debug-controls').forEach((element) => { element.style.display = 'none'; }); }, state);
      const diagnostics = await page.evaluate(() => window.__DUNGEON_DIAGNOSTICS__());
      if (diagnostics.backend !== "webgl2" || diagnostics.assetErrors.length) throw new Error("Actual game capture is not healthy WebGL2");
      await capture(page, `${viewport.width}-${name}-exploration-actual`, viewport, "actual-application-named-camera-fixture", diagnostics);
    }
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
    await page.keyboard.press("f"); await page.getByRole("button", { name: /Examine the body/ }).click();
    await page.locator('.dungeon-viewport[data-ready="true"]').waitFor();
    await page.keyboard.press("f"); await page.locator(".combat-container canvas").waitFor();
    await page.waitForTimeout(150);
    const combat = await page.evaluate(() => JSON.parse(localStorage.getItem("depths-of-the-fractured-mind.run.v1")).state.combatState);
    await capture(page, `${viewport.width}-guard-combat-actual`, viewport, "actual-game-event-combat", {
      enemies: combat.encounter.enemies.map(({ id, stats }) => ({ id, hp: stats.hp })), party: combat.party.members.map(({ id }) => id) });
    await context.close();
  }

  // Real browser recordings of the shared renderers, not synthetic image GIFs.
  for (const character of ["keeper", "guard"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: "dark",
      recordVideo: { dir: `${output}/video`, size: { width: 1280, height: 800 } } });
    const page = await context.newPage(); errors(page, `${character}-motion`); const video = page.video();
    await page.goto(`${url}?qa=1&art=1`); await page.waitForFunction(() => !!window.__CHARACTER_ART_REVIEW__);
    for (const [animation, duration] of [["idle", 1600], ["alert", 500], ["anticipation", 500], ["attack", 900], ["hit", 650], ["death", 1000]]) {
      await page.evaluate(async ({ character, animation }) => { await window.__CHARACTER_ART_REVIEW__.show({ character, scene: "combat", animation, elapsedMs: 0, playing: true, reducedMotion: false }); window.__CHARACTER_ART_REVIEW__.hideControls(); }, { character, animation });
      await page.waitForTimeout(duration);
    }
    await context.close(); await video.saveAs(`${output}/${character}-animation.webm`);
    report.videos.push({ character, path: `${character}-animation.webm`, kind: "isolated-shared-combat-renderer", viewport: { width: 1280, height: 800 }, audio: "muted" });
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally {
  await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve));
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n");
}
if (report.errors.length || report.failures.length) { console.error(JSON.stringify({ errors: report.errors, failures: report.failures }, null, 2)); process.exitCode = 1; }
