import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const outputIndex = process.argv.indexOf("--output");
const output = process.env.HERO_MOTION_OUTPUT || (outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/phase01b/hero-motion");
if (!output) throw new Error("Missing --output path");
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 4186, strictPort: true } });
const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--enable-gpu"] });
const report = { ...await evidenceMetadata(), browser: browser.version(), seed: 130013, dpr: 1,
  method: "Unpaused browser playback of isolated actual world/combat renderer fixtures. No actions, gameplay or save changes. Generated limited key poses, not continuous video-derived character art.",
  utilitySha256: createHash("sha256").update(await readFile(import.meta.filename)).digest("hex"), videos: [], samples: [], errors: [], failures: [] };
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", colorScheme: "dark",
      recordVideo: { dir: `${output}/video`, size: viewport } });
    const page = await context.newPage(), video = page.video();
    page.on("pageerror", (error) => report.errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") report.errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:4186${server.config.base}?qa=1&art=1`);
    await page.waitForFunction(() => !!window.__CHARACTER_ART_REVIEW__);
    for (const character of ["elias", "miriam", "subject13", "anya"]) {
      for (const scene of ["exploration", "combat"]) {
        for (const [animation, duration] of [["idle", 1450], ["attack", 750], ["cast", 750], ["hit", 500], ["death", 800]]) {
          await page.evaluate(async ({ character, scene, animation }) => {
            await window.__CHARACTER_ART_REVIEW__.show({ character, scene, animation, elapsedMs: 0, reducedMotion: false, playing: true });
            window.__CHARACTER_ART_REVIEW__.hideControls();
          }, { character, scene, animation });
          await page.waitForTimeout(duration);
          const diagnostics = await page.evaluate(() => window.__CHARACTER_ART_REVIEW__.diagnostics());
          if (!diagnostics.gameplayUnchanged || diagnostics.savedChanges) throw new Error("Motion playback mutated gameplay");
          if (scene === "exploration" && (diagnostics.renderer.backend !== "webgl2" || diagnostics.renderer.assetErrors.length)) throw new Error("Motion fixture failed WebGL2");
          report.samples.push({ viewport, character, scene, animation, holdMs: duration, diagnostics });
          if (animation === "attack" || animation === "death") await page.locator("canvas").screenshot({ path: `${output}/${viewport.width}-${character}-${scene}-${animation}.png` });
        }
      }
    }
    await context.close(); await video.saveAs(`${output}/${viewport.width}-hero-motion.webm`);
    report.videos.push({ viewport, path: `${viewport.width}-hero-motion.webm`, audio: "muted", sha256: createHash("sha256").update(await readFile(`${output}/${viewport.width}-hero-motion.webm`)).digest("hex") });
    console.log(JSON.stringify({ viewport, samples: report.samples.length, complete: true }));
  }
} catch (error) { report.failures.push(error.stack || String(error)); }
finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + "\n"); }
if (report.errors.length || report.failures.length) { console.error(JSON.stringify({ errors: report.errors, failures: report.failures })); process.exitCode = 1; }
