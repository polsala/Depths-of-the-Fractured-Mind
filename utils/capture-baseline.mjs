import { preview } from "vite";
import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpus, platform, release, totalmem } from "node:os";
import { resolve, join } from "node:path";

const browserChannel = process.env.DUNGEON_BROWSER_CHANNEL || undefined;
const launchArgs = process.env.DUNGEON_ENABLE_GPU === "1" ? ["--enable-gpu"] : [];
const output = resolve(process.env.BASELINE_OUTPUT || "artifacts/baseline/latest");
const fixtures = new URL("../tests/fixtures/saves/v1/", import.meta.url);
const saveKey = "depths-of-the-fractured-mind.run.v1";
const preferencesKey = "depths-of-the-fractured-mind.preferences.v1";
const fixedTime = "2026-11-09T12:00:00.000Z";
const hash = (data) => createHash("sha256").update(data).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]))).flat();
}
const sourcePaths = [...await files("src"), "public/data/events.json", "package.json", "package-lock.json", "vite.config.ts", "utils/capture-baseline.mjs"];
const report = {
  schemaVersion: 1, capturedAt: new Date().toISOString(), sourceHead: git("rev-parse", "HEAD"),
  workingTree: git("status", "--short"), seed: 130013, fixedTime,
  lockSha256: hash(await readFile("package-lock.json")),
  sourceHashes: Object.fromEntries(await Promise.all(sourcePaths.sort().map(async (path) => [path, hash(await readFile(path))]))),
  environment: { node: process.version, npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
    os: platform(), kernel: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length,
    hostMemoryMiB: Math.round(totalmem() / 1048576) },
  settings: { headless: true, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC",
    colorScheme: "dark", reducedMotion: "reduce", music: 0, sfx: 0, cpuThrottle: 1,
    networkThrottle: "none", browserChannel: browserChannel || "headless-shell", launchArgs },
  captures: [], diagnostics: [], failures: [],
};
await mkdir(output, { recursive: true });
const exploration = JSON.parse(await readFile(new URL("exploration.json", fixtures), "utf8"));
// Select a reachable straight corridor from the frozen real generated map.
// Camera repositioning isolates composition; this is not a player-completion claim.
function corridorFixture() {
  const save = structuredClone(exploration);
  const map = save.state.depthMaps[0][1];
  const start = save.state.location;
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const seen = new Set([`${start.x},${start.y}`]);
  const passable = (x, y) => map.tiles[y]?.[x]?.passable && !map.tiles[y][x].locked;
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index];
    for (const [dx, dy, direction] of [[0, -1, "north"], [1, 0, "east"], [0, 1, "south"], [-1, 0, "west"]]) {
      if (cell.path.length > 5 && !passable(cell.x + dy, cell.y - dx) && !passable(cell.x - dy, cell.y + dx)
          && [1, 2, 3, 4].every((d) => passable(cell.x + dx * d, cell.y + dy * d))) {
        save.state.location = { depth: 1, x: cell.x, y: cell.y, direction };
        return { raw: JSON.stringify(save), path: cell.path, location: save.state.location };
      }
      const x = cell.x + dx, y = cell.y + dy, key = `${x},${y}`;
      if (passable(x, y) && !seen.has(key)) {
        seen.add(key); queue.push({ x, y, path: [...cell.path, direction] });
      }
    }
  }
  throw new Error("Frozen map has no suitable reachable corridor");
}
const corridor = corridorFixture();
await writeFile(join(output, "corridor-checkpoint.json"), corridor.raw + "\n");
const server = await preview({ preview: { host: "127.0.0.1", port: 4175, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: browserChannel, args: launchArgs });
  report.environment.browser = browser.version();
  const baseURL = `http://127.0.0.1:4175${server.config.base}`;
  for (const spec of [
    { name: "title", width: 1280, height: 900 },
    { name: "first-room", width: 1280, height: 900, fixture: "exploration.json" },
    { name: "corridor", width: 1280, height: 900, raw: corridor.raw },
    { name: "combat", width: 1280, height: 900, fixture: "combat.json" },
    { name: "inventory-party", width: 1280, height: 900, fixture: "progressed.json", inventory: true },
    { name: "mobile", width: 390, height: 844, fixture: "exploration.json" },
  ]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height },
      deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", colorScheme: "dark", reducedMotion: "reduce",
      isMobile: spec.width < 500, hasTouch: spec.width < 500 });
    const raw = spec.raw ?? (spec.fixture ? await readFile(new URL(spec.fixture, fixtures), "utf8") : null);
    await context.addInitScript(({ saveKey, preferencesKey, raw, fixedTime }) => {
      localStorage.setItem(preferencesKey, JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 }));
      if (raw) localStorage.setItem(saveKey, raw);
      // Visual fallback texture noise has a separate stream from gameplay RNG.
      let seed = 9001;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      // Freeze only decorative wall-torch time; leave RAF/performance clocks real.
      Date.now = () => Date.parse(fixedTime);
    }, { saveKey, preferencesKey, raw, fixedTime });
    const page = await context.newPage();
    const diagnostics = { capture: spec.name, console: [], pageErrors: [], failedRequests: [], httpErrors: [], invalidMedia: [] };
    page.on("console", (message) => diagnostics.console.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
    page.on("requestfailed", (request) => diagnostics.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    page.on("response", (response) => {
      if (response.status() >= 400) diagnostics.httpErrors.push({ url: response.url(), status: response.status() });
      if (/\.(png|webp|ogg)$/.test(response.url()) && !/^(image|audio)\//.test(response.headers()["content-type"] || "")) {
        diagnostics.invalidMedia.push({ url: response.url(), contentType: response.headers()["content-type"] });
      }
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    const requests = new Map();
    const transfers = [];
    cdp.on("Network.requestWillBeSent", (event) => requests.set(event.requestId, event.request.url));
    cdp.on("Network.loadingFinished", (event) => transfers.push({ url: requests.get(event.requestId), bytes: event.encodedDataLength }));
    await page.goto(baseURL, { waitUntil: "networkidle" });
    if (raw) {
      await page.getByRole("button", { name: /Continue · Depth/ }).click();
      await page.locator(spec.name === "combat" ? ".combat-container canvas" : ".dungeon-viewport").waitFor();
    }
    if (spec.inventory) await page.getByRole("button", { name: "Inventory", exact: true }).click();
    // Resolve images and fonts, then require an idle network before freezing the view.
    await page.waitForLoadState("networkidle");
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode().catch(() => {}))); });
    const details = await page.evaluate(async () => {
      const gl = document.createElement("canvas").getContext("webgl2");
      const extension = gl?.getExtension("WEBGL_debug_renderer_info");
      const webgl2 = gl ? { available: true, version: gl.getParameter(gl.VERSION),
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) } : { available: false };
      const frames = [];
      let previous;
      for (let index = 0; index < 61; index++) {
        const now = await new Promise((resolve) => requestAnimationFrame(resolve));
        if (previous !== undefined) frames.push(now - previous);
        previous = now;
      }
      frames.sort((a, b) => a - b);
      return { webgl2, userAgent: navigator.userAgent,
        frameIntervals: { samples: frames.length, medianMs: frames[30], p95Ms: frames[57], scope: "idle RAF; not GPU time or movement rendering" },
        canvases: [...document.querySelectorAll("canvas")].map((canvas) => ({ class: canvas.className, width: canvas.width, height: canvas.height })),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    details.resourceBytes = transfers.reduce((sum, entry) => sum + entry.bytes, 0);
    details.nonAudioResourceBytes = transfers.filter((entry) => !entry.url?.endsWith(".ogg")).reduce((sum, entry) => sum + entry.bytes, 0);
    details.transferMethod = "CDP Network.loadingFinished encodedDataLength; cold cache; includes document";
    await page.screenshot({ path: join(output, `${spec.name}-viewport.png`), fullPage: false, animations: "disabled" });
    await page.screenshot({ path: join(output, `${spec.name}.png`), fullPage: true, animations: "disabled" });
    // For the inventory capture, preserve a second image of the party it overlays.
    if (spec.inventory) {
      await page.getByRole("dialog", { name: "Inventory" }).getByRole("button", { name: "Close" }).click();
      await page.locator(".party-vitals summary").click();
      await page.locator(".party-panel").screenshot({ path: join(output, "party.png") });
    }
    const metrics = await cdp.send("Performance.getMetrics");
    const screenshot = await readFile(join(output, `${spec.name}.png`));
    report.captures.push({ name: spec.name, viewport: { width: spec.width, height: spec.height },
      fixture: spec.fixture ?? (spec.raw ? "corridor-checkpoint.json (camera only)" : null),
      fixtureSha256: raw ? hash(raw) : null, screenshotSha256: hash(screenshot),
      location: raw ? JSON.parse(raw).state.location : null,
      corridorRoute: spec.name === "corridor" ? corridor.path : undefined,
      jsHeapUsedBytes: metrics.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value,
      ...details });
    report.diagnostics.push(diagnostics);
    if (diagnostics.pageErrors.length || diagnostics.httpErrors.length || diagnostics.failedRequests.length || diagnostics.invalidMedia.length || diagnostics.console.some((entry) => entry.type === "error")) {
      report.failures.push(`${spec.name}: browser or network errors`);
    }
    if (details.horizontalOverflow) report.failures.push(`${spec.name}: horizontal overflow`);
    if (spec.name === "title" && details.nonAudioResourceBytes >= 512 * 1024) report.failures.push("title: transfer budget");
    if (spec.name === "first-room" && details.nonAudioResourceBytes >= 2 * 1024 * 1024) report.failures.push("depth1: transfer budget");
    await expect(page.locator("body")).toBeVisible();
    await context.close();
  }
} catch (error) {
  report.failures.push(error.stack || String(error));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
  // A report survives failures so missing evidence cannot look like a passing run.
  report.files = await readdir(output);
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ output, captures: report.captures.length, failures: report.failures }, null, 2));
if (report.failures.length) process.exitCode = 1;
