import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const outputIndex = process.argv.indexOf("--output");
const output = process.env.PRESENCE_OUTPUT || (outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/phase01b/current");
if (!output) throw new Error("Missing --output path");
const hardware = process.argv.includes("--hardware");
const browserChannel = process.env.DUNGEON_BROWSER_CHANNEL || (hardware ? "chromium" : undefined);
const launchArgs = process.env.DUNGEON_ENABLE_GPU === "1" || hardware ? ["--enable-gpu"] : [];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function files(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat(); }
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4185, strictPort: true } });
const browser = await chromium.launch({ headless: true, channel: browserChannel, args: launchArgs });
const url = `http://127.0.0.1:4185${server.config.base}`;
const report = { ...await evidenceMetadata(), capturedAt: new Date().toISOString(), browser: browser.version(),
  browserChannel: browserChannel || "headless-shell", launchArgs, seed: 130013, dpr: 1,
  settings: "en-US, UTC, dark, muted. Viewpoint selection is real UI; forced poses/statuses are explicitly isolated scalar presentation fixtures and never saved. Motion captures use unpaused real input.",
  runtimeHashes: {}, buildHashes: {}, captures: [], motion: [], errors: [], failures: [] };
report.captureUtilitySha256 = hash(await readFile(import.meta.filename));
for (const path of (await files("public/assets/sprites/characters")).filter((p) => /atlas.png$/.test(p))) report.runtimeHashes[path] = hash(await readFile(path));
for (const path of await files("dist")) report.buildHashes[path] = hash(await readFile(path));
const heroes = ["elias", "miriam", "subject13", "anya"];
function observe(page, label) {
  page.on("pageerror", (e) => report.errors.push({ label, message: e.message }));
  page.on("console", (m) => { if (m.type() === "error") report.errors.push({ label, message: m.text() }); });
  page.on("requestfailed", (r) => report.errors.push({ label, url: r.url(), error: r.failure()?.errorText }));
  page.on("response", (r) => { if (r.status() >= 400) report.errors.push({ label, url: r.url(), status: r.status() }); });
}
async function settle(page) {
  await page.evaluate(async () => {
    const urls = [...document.querySelectorAll('.presence-hands,.protagonist-portrait')].map((e) => getComputedStyle(e).backgroundImage).filter((v) => v.startsWith('url(')).map((v) => v.slice(5, -2));
    await Promise.all(urls.map(async (src) => { const i = new Image(); i.src = src; await i.decode(); }));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function capture(page, name, kind, selector = '.presence-stage') {
  await settle(page);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  await page.locator(selector).first().screenshot({ path: `${output}/${name}-crop.png` });
  const diagnostics = await page.evaluate(() => ({ renderer: window.__DUNGEON_DIAGNOSTICS__?.(), presence: window.__PRESENCE_DIAGNOSTICS__?.(), art: window.__CHARACTER_ART_REVIEW__?.diagnostics(), overflow: document.documentElement.scrollWidth > innerWidth }));
  if (diagnostics.overflow) throw new Error(`${name}: horizontal overflow`);
  const renderer = diagnostics.art?.renderer || diagnostics.renderer;
  if (kind.includes('world') && (renderer?.backend !== 'webgl2' || renderer.assetErrors?.length)) throw new Error(`${name}: unhealthy WebGL2`);
  report.captures.push({ name, kind, viewport: page.viewportSize(), path: `${name}.png`, crop: `${name}-crop.png`, sha256: hash(await readFile(`${output}/${name}.png`)), diagnostics });
  console.log(JSON.stringify({ name, kind }));
}
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", colorScheme: "dark", isMobile: viewport.width < 500, hasTouch: viewport.width < 500,
      recordVideo: { dir: `${output}/video`, size: viewport } });
    await context.addInitScript(() => localStorage.setItem('depths-of-the-fractured-mind.preferences.v1', JSON.stringify({ music: 0, sfx: 0, motion: 'full', textScale: 100 })));
    const page = await context.newPage(); observe(page, viewport.width); const video = page.video();
    await page.goto(`${url}?qa=1`);
    await page.evaluate(async () => { const h = window.__THREE_GAME_TEST_HOOKS__; await h.setState('opening-room'); h.hideDebugUi(); });
    for (const id of heroes) {
      await page.locator(`.compact-party-member[data-character="${id}"]`).click();
      await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true));
      await capture(page, `${viewport.width}-${id}-idle`, 'actual-world-viewpoint-UI');
      await page.evaluate(({ id }) => window.__THREE_GAME_TEST_HOOKS__.setPresence({ id, action: 'hurt', elapsedMs: 250, wounded: true, distressed: true }), { id });
      await capture(page, `${viewport.width}-${id}-hurt-tension`, 'world-isolated-scalar-body-state-fixture');
      await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
    }
    await page.evaluate(async () => { const h = window.__THREE_GAME_TEST_HOOKS__; await h.setState('interaction'); h.hideDebugUi(); });
    await page.locator('.compact-party-member[data-character="miriam"]').click();
    await page.keyboard.press('f');
    await page.waitForTimeout(180);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true));
    await capture(page, `${viewport.width}-interaction`, 'world-real-keyboard-inspect');
    await page.evaluate(() => { const h = window.__THREE_GAME_TEST_HOOKS__; h.setPausedForScreenshot(false); h.setReducedMotion(true); h.setPresence({ id: 'subject13', action: 'interact', elapsedMs: 250, distressed: true }); });
    await capture(page, `${viewport.width}-reduced-motion`, 'world-isolated-reduced-motion');
    await page.evaluate(() => document.querySelector('#app').style.filter = 'grayscale(1)');
    await capture(page, `${viewport.width}-grayscale`, 'world-isolated-grayscale');
    await page.evaluate(() => document.querySelector('#app').style.filter = '');
    await page.evaluate(async () => { const h = window.__THREE_GAME_TEST_HOOKS__; h.setPausedForScreenshot(false); h.setReducedMotion(false); await h.setState('evidence-bay'); h.hideDebugUi(); });
    await page.keyboard.press('f'); await page.getByRole('button', { name: /Examine the body/ }).click();
    await page.locator('.dungeon-viewport[data-ready="true"]').waitFor(); await page.keyboard.press('f');
    await page.locator('.combat-container canvas').waitFor(); await page.waitForTimeout(350);
    await capture(page, `${viewport.width}-combat-ready`, 'actual-event-entered-combat');
    await page.getByRole('button', { name: 'Attack', exact: true }).click();
    await page.getByRole('dialog', { name: 'Select enemy' }).getByRole('button', { name: /Deranged Guard/ }).click();
    await page.waitForTimeout(180);
    await capture(page, `${viewport.width}-combat-action`, 'actual-combat-action');
    for (const id of heroes) {
      await page.evaluate(({ id }) => window.__THREE_GAME_TEST_HOOKS__.setPresence({ id, action: 'cast', elapsedMs: 250 }), { id });
      await capture(page, `${viewport.width}-${id}-combat-support`, 'isolated-passive-combat-hand-fixture');
    }
    await context.close(); await video.saveAs(`${output}/${viewport.width}-presence-motion.webm`);
    report.motion.push({ path: `${viewport.width}-presence-motion.webm`, viewport, kind: 'actual-browser-unpaused-input-plus-labeled-pose-fixtures', audio: 'muted' });
    const artContext = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'dark' });
    const art = await artContext.newPage(); observe(art, `art-${viewport.width}`);
    await art.goto(`${url}?qa=1&art=1`); await art.waitForFunction(() => !!window.__CHARACTER_ART_REVIEW__);
    await art.evaluate(async () => { await window.__CHARACTER_ART_REVIEW__.show({ scene: 'gallery' }); window.__CHARACTER_ART_REVIEW__.hideControls(); });
    await capture(art, `${viewport.width}-six-character-family`, 'isolated-native-grayscale-gallery', 'canvas');
    for (const id of heroes) {
      for (const scene of ['exploration', 'combat', 'sequence']) {
        await art.evaluate(async ({ id, scene }) => { await window.__CHARACTER_ART_REVIEW__.show({ character: id, scene, animation: 'idle', elapsedMs: 0 }); window.__CHARACTER_ART_REVIEW__.hideControls(); }, { id, scene });
        await capture(art, `${viewport.width}-${id}-${scene}`, scene === 'exploration' ? 'isolated-world-hero-fixture' : `isolated-shared-${scene}-hero-fixture`, 'canvas');
      }
    }
    await artContext.close();
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.failures.length) { console.error(JSON.stringify({ errors: report.errors, failures: report.failures }, null, 2)); process.exitCode = 1; }
