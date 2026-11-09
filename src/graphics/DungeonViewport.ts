import { createRenderContext, renderDungeonView, type RenderContext } from "./renderer";
import type { GameState } from "../game/state";
import { presentDungeon, type DungeonPresentationSnapshot, type QualityPreset } from "./dungeon/types";
import type { DungeonRenderer } from "./dungeon/DungeonRenderer";
import { generateDepthMap } from "./map";

// Owns the asynchronous renderer boundary and its deliberately labeled fallback.
// Three.js is loaded on entering exploration, never on the title screen.
export class DungeonViewport {
  private renderer: DungeonRenderer | null = null;
  private fallback: RenderContext | null = null;
  private snapshot: DungeonPresentationSnapshot;
  private state: GameState;
  private canvas: HTMLCanvasElement;
  private disposed = false;
  private loading = true;
  private loadingNotice: HTMLParagraphElement;
  private reducedMotion: boolean;
  private onSettled: () => void;
  readonly quality: QualityPreset;
  readonly ready: Promise<void>;
  constructor(canvas: HTMLCanvasElement, state: GameState, quality: QualityPreset, reducedMotion: boolean, onSettled: () => void) {
    this.canvas = canvas;
    this.state = state;
    this.snapshot = presentDungeon(state);
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.onSettled = onSettled;
    canvas.dataset.renderer = "loading";
    this.loadingNotice = document.createElement("p");
    this.loadingNotice.className = "renderer-loading";
    this.loadingNotice.setAttribute("role", "status");
    this.loadingNotice.textContent = "Preparing the room…";
    canvas.after(this.loadingNotice);
    this.ready = this.initialize();
  }
  private async initialize(): Promise<void> {
    if (new URLSearchParams(location.search).get("renderer") === "canvas") { this.useFallback("Compatibility viewport selected."); return; }
    try {
      const { DungeonRenderer } = await import("./dungeon/DungeonRenderer");
      if (this.disposed) return;
      this.renderer = new DungeonRenderer(this.canvas, this.snapshot, {
        quality: this.quality, reducedMotion: this.reducedMotion, onSettled: this.onSettled,
        onContextLost: (reason) => this.useFallback(reason),
      });
      await this.renderer.ready();
      this.loading = false;
      this.loadingNotice.remove();
      if (!this.disposed) this.onSettled();
    } catch (error) {
      if (!this.disposed) this.useFallback(`3D view unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  update(state: GameState, reducedMotion: boolean): void {
    this.state = state;
    this.snapshot = presentDungeon(state);
    this.reducedMotion = reducedMotion;
    if (this.renderer) this.renderer.update(this.snapshot, reducedMotion);
    else if (this.fallback) this.drawFallback();
  }
  private useFallback(reason: string): void {
    if (this.disposed) return;
    this.renderer?.dispose(); this.renderer = null;
    const replacement = this.canvas.cloneNode() as HTMLCanvasElement;
    this.canvas.replaceWith(replacement); this.canvas = replacement;
    replacement.dataset.renderer = "canvas-fallback";
    replacement.dataset.ready = "true";
    const notice = document.createElement("p");
    notice.className = "renderer-notice"; notice.setAttribute("role", "status"); notice.textContent = reason;
    replacement.parentElement?.querySelector(".renderer-notice")?.remove();
    replacement.after(notice);
    this.fallback = createRenderContext(replacement, { width: replacement.width || 800, height: replacement.height || 600, fov: 62 }, this.state.depthMaps);
    this.loading = false;
    this.loadingNotice.remove();
    this.drawFallback(); this.onSettled();
  }
  private drawFallback(): void {
    if (!this.fallback) return;
    // The caller already owns/generated this current map.
    const map = this.state.depthMaps?.get(this.state.location.depth);
    if (!map) return;
    // Existing adapter is passive when a cache is supplied.
    this.fallback.depthMaps.set(map.depth, generateDepthMap(map.depth, this.state.depthMaps));
    renderDungeonView(this.fallback, this.snapshot.location);
  }
  get moving(): boolean { return this.renderer?.moving ?? false; }
  get busy(): boolean { return this.loading || this.moving; }
  setPaused(paused: boolean): void { this.renderer?.setPaused(paused); }
  resetMetrics(): void { this.renderer?.performance.reset(); }
  diagnostics() { return this.renderer?.diagnostics() ?? { backend: this.fallback ? "canvas-fallback" : "loading", moving: false }; }
  dispose(): void { this.disposed = true; this.loadingNotice.remove(); this.renderer?.dispose(); this.renderer = null; this.fallback = null; }
}
