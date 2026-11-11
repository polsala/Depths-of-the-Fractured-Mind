import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const output = process.env.GOLDEN_OUTPUT || "artifacts/phase01/current";
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4177, strictPort: true } });
const browserChannel = process.env.DUNGEON_BROWSER_CHANNEL || undefined;
const launchArgs = process.env.DUNGEON_ENABLE_GPU === "1" ? ["--enable-gpu"] : [];
const browser = await chromium.launch({ headless: true, channel: browserChannel, args: launchArgs });
const report = { ...await evidenceMetadata(), capturedAt: new Date().toISOString(), browser: browser.version(), browserChannel: browserChannel || "headless-shell", launchArgs, seed: 130013,
  settings: "DPR1, en-US, UTC, dark, muted, reduced motion, paused presentation, production build", captures: [], errors: [], failures: [] };
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US", timezoneId: "UTC",
      reducedMotion: "reduce", isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    await context.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })));
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push({ viewport, type: "page", message: error.message }));
    page.on("console", (message) => { if (message.type() === "error") report.errors.push({ viewport, type: "console", message: message.text() }); });
    page.on("response", (response) => { if (response.status() >= 400) report.errors.push({ viewport, type: "http", status: response.status(), url: response.url() }); });
    page.on("requestfailed", (request) => report.errors.push({ viewport, type: "network", url: request.url(), message: request.failure()?.errorText }));
    const cdp = await context.newCDPSession(page); await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    const requests = new Map(); const transfers = [];
    cdp.on("Network.requestWillBeSent", (event) => requests.set(event.requestId, event.request.url));
    cdp.on("Network.loadingFinished", (event) => transfers.push({ url: requests.get(event.requestId), bytes: event.encodedDataLength }));
    await page.goto(`http://127.0.0.1:4177${server.config.base}?qa=1`, { waitUntil: "networkidle" });
    const titleBytes = transfers.filter((entry) => !entry.url?.endsWith(".ogg")).reduce((sum, entry) => sum + entry.bytes, 0);
    const scenes = viewport.width < 500 ? ["opening-room", "corridor", "door-occlusion", "npc"] : ["opening-room", "corridor", "door-occlusion", "interaction", "npc", "evidence-bay"];
    for (const state of scenes) {
      await page.evaluate(async (state) => { const hooks = window.__THREE_GAME_TEST_HOOKS__; await hooks.setState(state); hooks.setPausedForScreenshot(true); hooks.hideDebugUi(); }, state);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
      const name = `${viewport.width}-${state}`;
      await page.screenshot({ path: `${output}/${name}.png` });
      await page.locator(".dungeon-viewport").screenshot({ path: `${output}/${name}-world.png` });
      const diagnostics = await page.evaluate(() => window.__DUNGEON_DIAGNOSTICS__());
      if (diagnostics.backend !== "webgl2" || diagnostics.ready !== "true") throw new Error(`${name}: not real WebGL2`);
      if (diagnostics.assetErrors.length) throw new Error(`${name}: missing textures`);
      const png = PNG.sync.read(await readFile(`${output}/${name}-world.png`));
      const luminances = []; const colors = new Map(); let edges = 0;
      for (let y = 0; y < png.height; y += 2) for (let x = 0; x < png.width; x += 2) {
        const i = (y * png.width + x) * 4, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
        const l = .2126 * r + .7152 * g + .0722 * b; luminances.push(l);
        const bin = `${r >> 4},${g >> 4},${b >> 4}`; colors.set(bin, (colors.get(bin) || 0) + 1);
        if (x > 0 && Math.abs(l - (.2126 * png.data[i - 8] + .7152 * png.data[i - 7] + .0722 * png.data[i - 6])) > 18) edges++;
      }
      const n = luminances.length; luminances.sort((a, b) => a - b);
      const entropy = -[...colors.values()].reduce((sum, count) => sum + count / n * Math.log2(count / n), 0);
      const metrics = { colorEntropyBits: entropy, dominantColorShare: Math.max(...colors.values()) / n,
        edgeDensity: edges / n, luminance: { p05: luminances[Math.floor(n * .05)], p95: luminances[Math.floor(n * .95)], contrast: luminances[Math.floor(n * .95)] - luminances[Math.floor(n * .05)] } };
      const bytes = transfers.filter((entry) => !entry.url?.endsWith(".ogg")).reduce((sum, entry) => sum + entry.bytes, 0);
      report.captures.push({ state, viewport, screenshot: `${name}.png`, worldScreenshot: `${name}-world.png`,
        sha256: createHash("sha256").update(await readFile(`${output}/${name}.png`)).digest("hex"), metrics, diagnostics,
        ...(state === "opening-room" ? { titleNonAudioBytes: titleBytes, depth1NonAudioBytes: bytes } : {}) });
      if (state === "opening-room" && (titleBytes >= 512 * 1024 || bytes >= 2 * 1024 * 1024)) report.failures.push(`${viewport.width}: transfer budget exceeded`);
      console.log(JSON.stringify({ state, viewport, calls: diagnostics.calls, triangles: diagnostics.triangles, metrics }));
    }
    await context.close();
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n"); }
if (report.errors.length || report.failures.length) { console.error(JSON.stringify({ errors: report.errors, failures: report.failures }, null, 2)); process.exitCode = 1; }
