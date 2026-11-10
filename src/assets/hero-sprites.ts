import type { CharacterId } from "../game/state";
import { assetUrl } from "./manifest";
import contract from "./hero-atlas-contract.json";

export type HeroAnimation = keyof typeof contract.animations;
export interface HeroFrame { index: number; x: number; y: number; width: number; height: number; flipX: boolean }
export const heroContract = contract;
const images = new Map<CharacterId, HTMLImageElement>();
const listeners = new Set<() => void>();

export function onHeroAtlasReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function heroAtlasUrl(id: CharacterId): string {
  return assetUrl(`assets/sprites/characters/${contract.characters[id].atlas}`);
}

export function heroFrame(id: CharacterId, animation: HeroAnimation, elapsedMs = 0, reducedMotion = false): HeroFrame {
  // The contract is shared with the build/validation step. No per-character
  // cropping is needed: every hero uses the same cell and feet pivot.
  void id;
  const clip = contract.animations[animation];
  const durations: readonly number[] = clip.durations;
  const total = durations.reduce((sum, ms) => sum + ms, 0);
  let time = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (clip.loop) time %= total;
  let step = 0;
  if (!reducedMotion) while (step < clip.frames.length - 1 && time >= durations[step]) {
    time -= durations[step]; step++;
  }
  const frameIndex = reducedMotion && animation === "death" ? clip.frames[clip.frames.length - 1] : clip.frames[step];
  return {
    index: frameIndex,
    x: (frameIndex % contract.columns) * contract.frameWidth,
    y: Math.floor(frameIndex / contract.columns) * contract.frameHeight,
    width: contract.frameWidth,
    height: contract.frameHeight,
    flipX: "flipX" in clip && clip.flipX === true,
  };
}

export function heroImage(id: CharacterId): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = images.get(id);
  if (!image) {
    image = new Image();
    images.set(id, image);
    image.onload = () => {
      if (image?.naturalWidth === contract.width && image.naturalHeight === contract.height) {
        for (const listener of listeners) listener();
      }
    };
    image.onerror = () => console.error(`Hero atlas failed to load: ${id}`);
    image.src = heroAtlasUrl(id);
  }
  return image.complete && image.naturalWidth === contract.width && image.naturalHeight === contract.height ? image : null;
}

export function drawHero(
  ctx: CanvasRenderingContext2D, id: CharacterId, animation: HeroAnimation,
  elapsedMs: number, x: number, y: number, width: number, height: number,
  reducedMotion = false,
): boolean {
  const image = heroImage(id);
  if (!image) return false;
  const frame = heroFrame(id, animation, elapsedMs, reducedMotion);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (frame.flipX) {
    ctx.translate(x + width, 0);
    ctx.scale(-1, 1);
    x = 0;
  }
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
  ctx.restore();
  return true;
}
