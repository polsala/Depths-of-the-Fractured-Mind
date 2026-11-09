import type { WebGLRenderer } from "three";

export const rendererLifecycle = { created: 0, disposed: 0, active: 0 };
export class PerformanceDiagnostics {
  private frames = new Float64Array(4096);
  private renders = new Float64Array(4096);
  private index = 0;
  private count = 0;
  private warmup = 45;
  private previous = 0;
  private acknowledgements: number[] = [];
  recordAcknowledgement(milliseconds: number): void {
    if (this.acknowledgements.length < 4096) this.acknowledgements.push(milliseconds);
  }
  record(timestamp: number, renderMs: number): void {
    const interval = this.previous ? timestamp - this.previous : 0;
    this.previous = timestamp;
    if (this.warmup > 0) { this.warmup--; return; }
    if (interval <= 0) return;
    this.frames[this.index] = interval;
    this.renders[this.index] = renderMs;
    this.index = (this.index + 1) % this.frames.length;
    this.count = Math.min(this.count + 1, this.frames.length);
  }
  // The explicit benchmark reset follows its warmup, so all subsequent frames
  // belong to the measurement window. Initial renderer startup still drops 45.
  reset(): void { this.count = 0; this.index = 0; this.previous = 0; this.warmup = 0; this.acknowledgements.length = 0; }
  snapshot(renderer: WebGLRenderer) {
    const frames = Array.from(this.frames.subarray(0, this.count)).sort((a, b) => a - b);
    const renders = Array.from(this.renders.subarray(0, this.count)).sort((a, b) => a - b);
    const acknowledgements = [...this.acknowledgements].sort((a, b) => a - b);
    return { samples: this.count, medianFrameMs: frames[Math.floor(frames.length * 0.5)] ?? null,
      p95FrameMs: frames[Math.floor(frames.length * 0.95)] ?? null,
      maxFrameMs: frames.at(-1) ?? null, framesOver20Ms: frames.filter((ms) => ms > 20).length,
      framesOver40Ms: frames.filter((ms) => ms > 40).length, stallsOver250Ms: frames.filter((ms) => ms > 250).length,
      commitToFrame: { samples: acknowledgements.length, medianMs: acknowledgements[Math.floor(acknowledgements.length * .5)] ?? null,
        p95Ms: acknowledgements[Math.floor(acknowledgements.length * .95)] ?? null,
        scope: "committed grid transition to first changed camera frame submitted; excludes OS input and queued-intent waiting" },
      medianRenderMs: renders[Math.floor(renders.length * 0.5)] ?? null,
      p95RenderMs: renders[Math.floor(renders.length * 0.95)] ?? null,
      calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0, pixelRatio: renderer.getPixelRatio(),
      lifecycle: { ...rendererLifecycle } };
  }
}
