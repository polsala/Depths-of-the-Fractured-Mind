import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { evidenceMetadata } from "./evidence-metadata.mjs";

const skillPath = process.env.CAST_QA_INSPECTOR || "/home/psala/.agents/skills/threejs-qa-release/scripts/inspect-threejs-canvas.mjs";
const { inspectPage, readManifestCaptures, summarize } = await import(pathToFileURL(skillPath).href);
const manifest = JSON.parse(await readFile("artifacts/phase01b/inspector-manifest.json"));
const metadata = await evidenceMetadata();
const skillSha256 = createHash("sha256").update(await readFile(skillPath)).digest("hex");
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu"] });
try {
  for (const capture of readManifestCaptures(manifest)) {
    const context = await browser.newContext({ viewport: capture.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", colorScheme: "dark", reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("depths-of-the-fractured-mind.preferences.v1", JSON.stringify({ music: 0, sfx: 0, motion: "reduced", textScale: 100 })));
    const page = await context.newPage();
    // The installed inspector waits for a canvas before applying named hooks.
    // Our intentionally DOM-only title has none. Bootstrap its real QA state
    // after navigation, then let the unmodified inspector reapply/acknowledge it.
    // No placeholder canvas, fabricated acknowledgment or player-build change.
    const adaptedPage = new Proxy(page, { get(target, key) {
      if (key === "goto") return async (...args) => {
        const response = await target.goto(...args);
        await target.waitForFunction(() => !!window.__THREE_GAME_TEST_HOOKS__);
        await target.evaluate(async ({ state }) => {
          window.__THREE_GAME_TEST_HOOKS__.seed(130013);
          await window.__THREE_GAME_TEST_HOOKS__.setState(state);
        }, { state: capture.state });
        return response;
      };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const report = await inspectPage(adaptedPage, { ...capture, seed: 130013, url: "http://127.0.0.1:4173/Depths-of-the-Fractured-Mind/?qa=1",
      screenshotPath: capture.reportPath.replace(/\.json$/, ".png"), wait: 0 });
    Object.assign(report, metadata, { skillPath, skillSha256, bootstrap: "Real named QA state after navigation; installed inspectPage and its assertions/metrics unmodified", browser: browser.version(), dpr: 1 });
    await mkdir(dirname(capture.reportPath), { recursive: true });
    await writeFile(capture.reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(summarize(report, capture.reportPath));
    if (!report.result?.ok || report.consoleErrorCount || report.pageErrorCount) process.exitCode = 1;
    await context.close();
  }
} finally { await browser.close(); }
