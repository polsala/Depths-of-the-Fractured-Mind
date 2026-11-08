import { preview } from "vite";
import { chromium } from "@playwright/test";

// Production-build smoke profile. These figures are diagnostic, not a physical
// phone benchmark: JS heap excludes image decode, GPU and browser process RAM.
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ headless: true });
  for (const spec of [
    { name: "desktop", viewport: { width: 1280, height: 800 }, cpu: 1 },
    { name: "mobile-4x", viewport: { width: 390, height: 844 }, cpu: 4 },
  ]) {
    const context = await browser.newContext({ viewport: spec.viewport });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: spec.cpu });
    const requests = new Map();
    const transfers = [];
    cdp.on("Network.requestWillBeSent", (event) => requests.set(event.requestId, event.request.url));
    cdp.on("Network.loadingFinished", (event) => {
      const url = requests.get(event.requestId);
      if (url) transfers.push({ url, bytes: event.encodedDataLength });
    });
    const snapshot = async (stage, previousBytes) => {
      await page.waitForTimeout(750);
      const total = transfers.reduce((sum, entry) => sum + entry.bytes, 0);
      const metrics = await cdp.send("Performance.getMetrics");
      const heap = metrics.metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? 0;
      const top = transfers.filter((entry) => entry.bytes > 100_000)
        .sort((a, b) => b.bytes - a.bytes).slice(0, 3)
        .map((entry) => `${entry.url.split("/").at(-1)}:${Math.round(entry.bytes / 1024)}KiB`);
      console.log(JSON.stringify({ profile: spec.name, stage,
        incrementalKiB: Math.round((total - previousBytes) / 1024),
        cumulativeKiB: Math.round(total / 1024), jsHeapMiB: +(heap / 1048576).toFixed(1), top }));
      return total;
    };
    await page.goto(`http://127.0.0.1:${port}${server.config.base}`);
    let previous = await snapshot("title", 0);
    await page.getByRole("button", { name: "Begin Your Descent" }).click();
    for (let depth = 1; depth <= 5; depth++) {
      await page.locator(".dungeon-viewport").waitFor();
      previous = await snapshot(`depth-${depth}`, previous);
      if (depth < 5) await page.getByRole("button", { name: "Skip to Next Floor" }).click();
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
