import type { CharacterId } from "../game/state";
import { assetUrl } from "./manifest";
import contract from "./hero-atlas-contract.json";

export type HeroAnimation = keyof typeof contract.animations;
export interface HeroFrame { x: number; y: number; width: number; height: number; flipX: boolean }
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
  const step = reducedMotion ? 0 : Math.floor(Math.max(0, elapsedMs) / clip.frameMs);
  const frameIndex = clip.frames[clip.loop ? step % clip.frames.length : Math.min(step, clip.frames.length - 1)];
  return {
    x: (frameIndex % contract.columns) * contract.frameWidth,
    y: Math.floor(frameIndex / contract.columns) * contract.frameHeight,
    width: contract.frameWidth,
    height: contract.frameHeight,
    flipX: "flipX" in clip && clip.flipX === true,
  };
}

function heroImage(id: CharacterId): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = images.get(id);
  if (!image) {
    image = new Image();
    images.set(id, image);
    image.onload = () => {
      if (image?.naturalWidth === contract.size && image.naturalHeight === contract.size) {
        for (const listener of listeners) listener();
      }
    };
    image.onerror = () => console.error(`Hero atlas failed to load: ${id}`);
    image.src = heroAtlasUrl(id);
  }
  return image.complete && image.naturalWidth === contract.size && image.naturalHeight === contract.size ? image : null;
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
