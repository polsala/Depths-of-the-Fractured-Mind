import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from "three";
import { CameraRig } from "./CameraRig";
import { RenderAssetManager } from "./RenderAssetManager";
import { SceneBuilder } from "./SceneBuilder";
import { PerformanceDiagnostics, rendererLifecycle } from "./PerformanceDiagnostics";
import type { DungeonPresentationSnapshot, QualityPreset } from "./types";

export interface DungeonRendererOptions {
  quality: QualityPreset;
  reducedMotion: boolean;
  onSettled: () => void;
  onContextLost: (reason: string) => void;
}

export class DungeonRenderer {
  readonly renderer: WebGLRenderer;
  readonly rig: CameraRig;
  readonly assets = new RenderAssetManager();
  readonly sceneBuilder: SceneBuilder;
  readonly performance = new PerformanceDiagnostics();
  private snapshot: DungeonPresentationSnapshot;
  private options: DungeonRendererOptions;
  private frame = 0;
  private disposed = false;
  private paused = false;
  private elapsed = 0;
  private previous = 0;
  private pixelRatio = 1;
  private width = 0;
  private height = 0;
  private slowFrames = 0;
  private awaitingFrameSince = 0;
  private resizeObserver: ResizeObserver;
  private contextLost: (event: Event) => void;
  readonly gpu: { renderer: string; vendor: string; version: string };

  constructor(canvas: HTMLCanvasElement, snapshot: DungeonPresentationSnapshot, options: DungeonRendererOptions) {
    const context = canvas.getContext("webgl2", { alpha: false, antialias: options.quality !== "low", powerPreference: "high-performance" });
    if (!context) throw new Error("WebGL2 is unavailable");
    this.options = options;
    this.snapshot = snapshot;
    this.renderer = new WebGLRenderer({ canvas, context, antialias: options.quality !== "low", alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, options.quality === "high" ? 1.5 : options.quality === "low" ? 0.8 : 1);
    this.renderer.setPixelRatio(this.pixelRatio);
    const extension = context.getExtension("WEBGL_debug_renderer_info");
    this.gpu = { renderer: String(context.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER)),
      vendor: String(context.getParameter(extension?.UNMASKED_VENDOR_WEBGL ?? context.VENDOR)),
      version: String(context.getParameter(context.VERSION)) };
    this.rig = new CameraRig(snapshot.location);
    try {
      this.sceneBuilder = new SceneBuilder(snapshot, this.assets, options.quality);
    } catch (error) {
      this.assets.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      throw error;
    }
    this.contextLost = (event) => { event.preventDefault(); this.options.onContextLost("The 3D context was lost. The accessible fallback is active."); };
    canvas.addEventListener("webglcontextlost", this.contextLost);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    canvas.dataset.renderer = "webgl2";
    canvas.dataset.ready = "loading";
    rendererLifecycle.created++; rendererLifecycle.active++;
    this.frame = requestAnimationFrame(this.tick);
  }

  async ready(): Promise<void> {
    await this.assets.whenReady();
    if (this.disposed) return;
    this.sceneBuilder.update(this.snapshot, this.rig.camera, 0, this.options.reducedMotion);
    this.renderer.render(this.sceneBuilder.scene, this.rig.camera);
    this.renderer.domElement.dataset.ready = "true";
  }

  update(snapshot: DungeonPresentationSnapshot, reducedMotion: boolean): void {
    this.snapshot = snapshot;
    this.options.reducedMotion = reducedMotion;
    const wasMoving = this.rig.moving;
    const now = performance.now();
    this.rig.transition(snapshot.location, now, reducedMotion);
    if (!wasMoving && this.rig.moving) this.awaitingFrameSince = now;
  }
  get moving(): boolean { return this.rig.moving; }
  setPaused(paused: boolean): void { this.paused = paused; if (paused) this.rig.snap(this.snapshot.location); }
  resize(): void {
    const box = this.renderer.domElement.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    this.width = Math.round(box.width); this.height = Math.round(box.height);
    this.renderer.setSize(this.width, this.height, false);
    this.rig.camera.aspect = this.width / this.height;
    this.rig.camera.updateProjectionMatrix();
  }
  diagnostics() {
    let estimatedTextureBytes = 0;
    for (const texture of this.assets.textures) {
      const source = texture.image as { width?: number; height?: number } | undefined;
      estimatedTextureBytes += (source?.width ?? 0) * (source?.height ?? 0) * 4 * (texture.generateMipmaps ? 4 / 3 : 1);
    }
    return { backend: "webgl2", ready: this.renderer.domElement.dataset.ready, gpu: this.gpu,
      ...this.performance.snapshot(this.renderer), materials: this.sceneBuilder.materialCount,
      loadedAssets: [...this.assets.loadedUrls], assetErrors: [...this.assets.failures],
      quality: this.options.quality, moving: this.moving, sceneBuilds: 1,
      camera: { x: this.rig.camera.position.x, y: this.rig.camera.position.y, z: this.rig.camera.position.z, yaw: this.rig.camera.rotation.y },
      authoritative: { ...this.snapshot.location }, estimatedTextureBytes: Math.round(estimatedTextureBytes),
      timingScope: "real RAF intervals and CPU render submission; initial 45-frame warmup, explicit reset starts a full window; maximum 4096 samples; GPU timer not sampled",
      postPasses: 0, shadowMaps: 0 };
  }
  private tick = (now: number): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    if (document.hidden) { this.previous = 0; return; }
    const frameInterval = this.previous ? now - this.previous : 0;
    const delta = Math.min(0.05, frameInterval / 1000);
    this.previous = now;
    if (!this.paused) this.elapsed += delta;
    const settled = this.rig.sample(now);
    this.sceneBuilder.update(this.snapshot, this.rig.camera, this.paused ? 0 : this.elapsed, this.options.reducedMotion);
    const start = performance.now();
    this.renderer.render(this.sceneBuilder.scene, this.rig.camera);
    const renderMs = performance.now() - start;
    if (this.awaitingFrameSince && now > this.awaitingFrameSince) {
      this.performance.recordAcknowledgement(performance.now() - this.awaitingFrameSince);
      this.awaitingFrameSince = 0;
    }
    this.performance.record(now, renderMs);
    // Reduce fill cost only after sustained measured pressure; never change
    // collision or timing. An explicit high preset keeps its chosen resolution.
    if (!this.paused && this.options.quality !== "high" && (renderMs > 28 || frameInterval > 40)) this.slowFrames++;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.pixelRatio > 0.65) {
      this.pixelRatio = Math.max(0.65, this.pixelRatio - 0.15);
      this.renderer.setPixelRatio(this.pixelRatio); this.resize(); this.slowFrames = 0;
    }
    if (settled) this.options.onSettled();
  };
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.contextLost);
    this.sceneBuilder.dispose();
    this.assets.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    rendererLifecycle.disposed++; rendererLifecycle.active--;
  }
}
