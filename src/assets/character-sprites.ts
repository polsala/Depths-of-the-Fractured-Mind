import contract from "./character-atlas-contract.json";
import { assetUrl } from "./manifest";

export type ReferenceCharacter = keyof typeof contract.characters;
export type CharacterAnimation = keyof typeof contract.animations;
export interface CharacterFrame { index: number; x: number; y: number; width: number; height: number }
export const characterContract = contract;
const images = new Map<ReferenceCharacter, HTMLImageElement>();
const pending = new Map<ReferenceCharacter, Promise<void>>();

export function characterAtlasUrl(id: ReferenceCharacter): string {
  return assetUrl(`assets/sprites/characters/${contract.characters[id].atlas}`);
}

/** Presentation time only. Frame selection cannot advance combat or gameplay RNG. */
export function characterFrame(animation: CharacterAnimation, elapsedMs = 0, reducedMotion = false): CharacterFrame {
  const clip = contract.animations[animation];
  const total = clip.durations.reduce((sum, ms) => sum + ms, 0);
  let time = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (clip.loop) time %= total;
  let step = 0;
  if (!reducedMotion) {
    while (step < clip.frames.length - 1 && time >= clip.durations[step]) {
      time -= clip.durations[step]; step++;
    }
  }
  // A defeated actor remains fallen in reduced motion, rather than kneeling
  // indefinitely. Other clips use their first stable readable pose.
  const index = reducedMotion && animation === "death" ? 15 : clip.frames[step];
  return { index, x: index % contract.columns * contract.frameWidth,
    y: Math.floor(index / contract.columns) * contract.frameHeight,
    width: contract.frameWidth, height: contract.frameHeight };
}

export function referenceCharacter(id: string): ReferenceCharacter | null {
  return id === "keeper" ? "keeper" : id === "deranged_guard" || id === "guard" ? "guard" : null;
}

function imageFor(id: ReferenceCharacter): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = images.get(id);
  if (!image) {
    image = new Image(); images.set(id, image);
    pending.set(id, new Promise<void>((resolve, reject) => {
      image!.onload = () => {
        if (image!.naturalWidth !== contract.width || image!.naturalHeight !== contract.height) {
          reject(new Error(`Character atlas dimensions invalid: ${id}`)); return;
        }
        resolve();
      };
      image!.onerror = () => reject(new Error(`Character atlas failed to load: ${id}`));
    }));
    // Keep an error observable without an unhandled rejection in the normal
    // render loop. Review/readiness callers still receive the rejection.
    void pending.get(id)!.catch((error: Error) => console.error(error.message));
    image.src = characterAtlasUrl(id);
  }
  return image.complete && image.naturalWidth === contract.width && image.naturalHeight === contract.height ? image : null;
}

export async function characterAtlasesReady(ids: readonly ReferenceCharacter[]): Promise<void> {
  for (const id of ids) imageFor(id);
  await Promise.all(ids.map((id) => pending.get(id)));
}

export function drawCharacter(ctx: CanvasRenderingContext2D, id: ReferenceCharacter, animation: CharacterAnimation,
  elapsedMs: number, x: number, y: number, width: number, height: number, reducedMotion = false): boolean {
  const image = imageFor(id);
  if (!image) return false;
  const frame = characterFrame(animation, elapsedMs, reducedMotion);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
  ctx.restore(); return true;
}
