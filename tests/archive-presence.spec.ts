import { test, expect } from '@playwright/test';
import { readRun, dungeonReady } from './phase02-browser';
const authoritativeRun = (run: any) => { const { savedAt: _savedAt, ...authoritative } = run; return authoritative; };

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`Archive presence, real interaction, fallback and depth-shell lifetime at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(150_000); await page.setViewportSize(viewport);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('depths-of-the-fractured-mind.preferences.v1', JSON.stringify({ music: 0, sfx: 0, motion: 'full', textScale: 100 })));
    await page.goto('./?qa=1');
    for (const reduced of [false, true]) {
      await page.evaluate(async reduced => { const h = (window as any).__THREE_GAME_TEST_HOOKS__; h.setReducedMotion(reduced); await h.setState('archive-drum-chamber'); }, reduced);
      await dungeonReady(page);
      const baseline = await readRun(page);
      for (const id of ['elias', 'miriam', 'subject13', 'anya']) {
        await page.locator(`.compact-party-member[data-character="${id}"]`).click();
        await expect(page.locator('.physical-presence')).toHaveAttribute('data-character', id);
        await expect(page.locator('.physical-presence')).toHaveAttribute('data-reduced-motion', String(reduced));
        expect(authoritativeRun(await readRun(page))).toEqual(authoritativeRun(baseline));
      }
      await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState('archive-interaction'));
      await page.locator('.compact-party-member[data-character="anya"]').click();
      const before = await readRun(page);
      await page.keyboard.press('f');
      await expect(page.locator('.physical-presence')).toHaveAttribute('data-action', 'interact');
      const committed = await readRun(page);
      expect(committed.state.flags.archiveIndexed).toBe(true);
      expect(committed.randomState).toBe(before.randomState);
      await page.waitForTimeout(900);
      expect(authoritativeRun(await readRun(page))).toEqual(authoritativeRun(committed));
      // Actual browser lifecycle freeze/return; no synthetic gameplay callback.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
      await cdp.send('Page.setWebLifecycleState', { state: 'active' });
      await page.bringToFront(); await page.waitForTimeout(100);
      expect(authoritativeRun(await readRun(page))).toEqual(authoritativeRun(committed));
      await expect(page.locator('.physical-presence')).toHaveAttribute('data-character', 'anya');
      await expect(page.locator('.physical-presence')).toHaveAttribute('data-action', 'idle');
      const diagnostics = await page.evaluate(() => ({ world: (window as any).__DUNGEON_DIAGNOSTICS__(), presence: (window as any).__PRESENCE_DIAGNOSTICS__() }));
      expect(diagnostics.presence.lifecycle.active).toBe(1);
      expect(diagnostics.world.lifecycle.active).toBe(1);
      expect(diagnostics.world.sceneBuilds).toBe(1);
      expect(await page.locator('.physical-presence').count()).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState('opening-room'));
      await page.evaluate(() => (window as any).__THREE_GAME_TEST_HOOKS__.setState('archive-drum-chamber'));
    }
    await page.locator('.dungeon-viewport').evaluate((canvas: HTMLCanvasElement) => canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
    await expect(page.locator('.dungeon-viewport')).toHaveAttribute('data-renderer', 'canvas-fallback');
    const fallback = await readRun(page);
    for (const id of ['elias', 'miriam', 'subject13', 'anya']) {
      await page.locator(`.compact-party-member[data-character="${id}"]`).click();
      await expect(page.locator('.physical-presence')).toHaveAttribute('data-character', id);
    }
    expect(authoritativeRun(await readRun(page))).toEqual(authoritativeRun(fallback));
    expect((await page.evaluate(() => (window as any).__PRESENCE_DIAGNOSTICS__())).lifecycle.active).toBe(1);
    expect(errors).toEqual([]);
  });
}
