import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, release } from "node:os";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const output = process.env.DUNGEON_BENCH_OUTPUT || "artifacts/phase01/performance";
const durationSeconds = Number(process.env.DUNGEON_SECONDS || 60);
if (!Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 120) throw new Error("DUNGEON_SECONDS must be 5..120");
const recordVideo = process.env.DUNGEON_RECORD_VIDEO === "1";
const browserChannel = process.env.DUNGEON_BROWSER_CHANNEL || undefined;
const launchArgs = process.env.DUNGEON_ENABLE_GPU === "1" ? ["--enable-gpu"] : [];
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4178, strictPort: true } });
const browser = await chromium.launch({ headless: true, channel: browserChannel, args: launchArgs });
const report = { ...await evidenceMetadata(), capturedAt: new Date().toISOString(), browser: browser.version(), cpu: cpus()[0].model, kernel: release(),
  durationSeconds, recordVideo, browserChannel: browserChannel || "headless-shell", launchArgs,
  method: "production build, seed130013, actual keyboard movement/turns after 5-second warmup; software/hardware identified, mobile CPU4x is not a device", profiles: [] };
try {
  for (const spec of [{ name: "desktop", width: 1280, height: 800, cpu: 1 }, { name: "mobile-4x", width: 390, height: 844, cpu: 4 }]) {
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
      recordVideo: recordVideo && spec.cpu === 1 ? { dir: `${output}/video`, size: { width: 1280, height: 800 } } : undefined });
    await context.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "full", textScale: 100 })));
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const cdp = await context.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: spec.cpu });
    await page.goto(`http://127.0.0.1:4178${server.config.base}?qa=1`);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("opening-room"));
    await page.waitForTimeout(5000);
    await page.waitForFunction(() => window.__DUNGEON_DIAGNOSTICS__().samples > 0);
    await page.evaluate(() => {
      window.__DUNGEON_LONG_TASKS__ = [];
      new PerformanceObserver((list) => {
        for (const task of list.getEntries()) window.__DUNGEON_LONG_TASKS__.push({ startTime: task.startTime, duration: task.duration });
      }).observe({ type: "longtask" });
    });
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.resetMetrics());
    await cdp.send("Performance.enable");
    const startMetrics = new Map((await cdp.send("Performance.getMetrics")).metrics.map((metric) => [metric.name, metric.value]));
    if (process.env.DUNGEON_PROFILE === "1") { await cdp.send("Profiler.enable"); await cdp.send("Profiler.start"); }
    const latency = [], waypointsReached = [];
    const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem("depths-of-the-fractured-mind.run.v1")));
    const map = checkpoint.state.depthMaps.find(([depth]) => depth === 1)[1];
    const waypoints = [{ x: 18, y: 7, facing: "north", breaker: true, name: "breaker" },
      { x: 12, y: 4, facing: "north", name: "evidence-bay" }, { x: 4, y: 13, facing: "north", name: "counter-return" },
      { x: 12, y: 7, facing: "north", name: "shutter-return" }, { x: 4, y: 15, facing: "west", name: "keeper-return" }];
    const facing = ["north", "east", "south", "west"];
    function nextDirection(start, target) {
      const queue = [{ x: start.x, y: start.y, first: null }], seen = new Set([`${start.x},${start.y}`]);
      for (const cell of queue) {
        if (cell.x === target.x && cell.y === target.y) return cell.first;
        for (const [dx, dy, direction] of [[0, -1, "north"], [1, 0, "east"], [0, 1, "south"], [-1, 0, "west"]]) {
          const x = cell.x + dx, y = cell.y + dy, key = `${x},${y}`, tile = map.tiles[y]?.[x];
          if (tile?.passable && !tile.locked && !seen.has(key)) { seen.add(key); queue.push({ x, y, first: cell.first || direction }); }
        }
      }
      throw new Error(`Benchmark has no legal route to ${target.name}`);
    }
    const start = Date.now(); let index = 0, waypointIndex = 0;
    while (Date.now() - start < durationSeconds * 1000) {
      const current = await page.evaluate(() => window.__DUNGEON_DIAGNOSTICS__());
      if (current.moving) { await page.waitForTimeout(50); continue; }
      const location = current.authoritative, target = waypoints[waypointIndex % waypoints.length];
      const arrived = location.x === target.x && location.y === target.y;
      const direction = arrived ? target.facing : nextDirection(location, target);
      const turn = (facing.indexOf(direction) - facing.indexOf(location.direction) + 4) % 4;
      let key = turn === 3 ? "q" : turn ? "e" : "w";
      if (arrived && !turn) {
        if (target.breaker && map.tiles[6][12].locked) {
          key = "f"; map.tiles[6][12].locked = false;
        } else {
          waypointsReached.push({ name: target.name, elapsedMs: Date.now() - start });
          waypointIndex++; continue;
        }
      }
      const t = Date.now(); await page.keyboard.press(key); index++; latency.push(Date.now() - t);
      await page.waitForTimeout(450);
    }
    const diagnostics = await page.evaluate(() => window.__DUNGEON_DIAGNOSTICS__());
    latency.sort((a, b) => a - b);
    const longTasks = await page.evaluate(() => window.__DUNGEON_LONG_TASKS__);
    const browserTaskSeconds = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics
      .filter((metric) => ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].includes(metric.name))
      .map((metric) => [metric.name, metric.value - (startMetrics.get(metric.name) || 0)]));
    if (process.env.DUNGEON_PROFILE === "1") {
      const { profile } = await cdp.send("Profiler.stop");
      await writeFile(`${output}/${spec.name}.cpuprofile`, JSON.stringify(profile));
    }
    const result = { ...spec, diagnostics, longTasks, browserTaskSeconds, waypointsReached, commands: index, inputDispatchMedianMs: latency[Math.floor(latency.length * .5)],
      inputDispatchP95Ms: latency[Math.floor(latency.length * .95)], errors };
    report.profiles.push(result); console.log(JSON.stringify({ ...spec, frames: diagnostics.samples,
      medianMs: diagnostics.medianFrameMs, p95Ms: diagnostics.p95FrameMs, p95RenderMs: diagnostics.p95RenderMs,
      longTasks: longTasks.length, calls: diagnostics.calls, errors }));
    const video = page.video(); await context.close();
    if (video) await video.saveAs(`${output}/desktop-motion.webm`);
  }
} finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n"); }
if (report.profiles.some((profile) => profile.errors.length || profile.diagnostics.backend !== "webgl2")) process.exitCode = 1;
