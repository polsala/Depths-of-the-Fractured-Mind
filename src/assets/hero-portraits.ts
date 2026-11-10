import type { CharacterId, CharacterState } from "../game/state";
import { heroAtlasUrl, heroFrame, heroImage } from "./hero-sprites";
import contract from "./hero-atlas-contract.json";
import "../ui/protagonist-portraits.css";

export type HeroPortraitState = "normal" | "wounded" | "stressed" | "fallen";
interface PortraitPose { frame: number; crop: number[] }
interface PortraitCharacter { portrait?: Partial<Record<Exclude<HeroPortraitState, "fallen">, PortraitPose>> }

export const PORTRAIT_STATE_LABELS: Readonly<Record<HeroPortraitState, string>> = Object.freeze({
  normal: "Composed", wounded: "Wounded", stressed: "Stressed", fallen: "Fallen",
});

/** A passive status projection: no portrait has its own health or sanity state. */
export function heroPortraitState(character: CharacterState): HeroPortraitState {
  if (!character.alive) return "fallen";
  if (character.stats.hp < character.stats.maxHp * 0.3) return "wounded";
  if (character.stats.sanity < character.stats.maxSanity * 0.3) return "stressed";
  return "normal";
}

/** Fixed head/shoulder compositions, never a walking body enlarged into a HUD. */
export function heroPortraitRegion(id: CharacterId, state: HeroPortraitState) {
  const pose = (contract.characters[id] as PortraitCharacter).portrait?.[state === "fallen" ? "normal" : state];
  const frame = pose ? {
    x: pose.frame % contract.columns * contract.frameWidth,
    y: Math.floor(pose.frame / contract.columns) * contract.frameHeight,
  } : heroFrame(id, state === "wounded" ? "hit" : "idle", 0, true);
  const crop = pose?.crop ?? [32, 16, 64, 64];
  // A square display preserves anatomy even when an authored crop is taller.
  const side = Math.min(Math.max(crop[2], crop[3]), contract.frameWidth, contract.frameHeight);
  const cropX = Math.max(0, Math.min(contract.frameWidth - side, crop[0] + (crop[2] - side) / 2));
  const cropY = Math.max(0, Math.min(contract.frameHeight - side, crop[1] + (crop[3] - side) / 2));
  return { x: frame.x + cropX, y: frame.y + cropY, width: side, height: side };
}

export function drawHeroPortrait(ctx: CanvasRenderingContext2D, character: CharacterState,
  x: number, y: number, size: number): boolean {
  const image = heroImage(character.id);
  if (!image) return false;
  const state = heroPortraitState(character);
  const region = heroPortraitRegion(character.id, state);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (state === "fallen") ctx.globalAlpha *= 0.45;
  ctx.drawImage(image, region.x, region.y, region.width, region.height, x, y, size, size);
  ctx.restore();
  return true;
}

/** CSS atlas crop: no timers/listeners or duplicate decoded image cache to clean up. */
export function createHeroPortrait(character: CharacterState, size = 40): HTMLSpanElement {
  const portrait = document.createElement("span");
  const state = heroPortraitState(character);
  const region = heroPortraitRegion(character.id, state);
  const dimensions = contract as { width?: number; height?: number; size?: number };
  const width = dimensions.width ?? dimensions.size ?? contract.columns * contract.frameWidth;
  const height = dimensions.height ?? dimensions.size ?? contract.rows * contract.frameHeight;
  portrait.className = "protagonist-portrait";
  portrait.dataset.character = character.id;
  portrait.dataset.portraitState = state;
  portrait.setAttribute("role", "img");
  portrait.setAttribute("aria-label", `${character.name}, ${PORTRAIT_STATE_LABELS[state].toLowerCase()}`);
  portrait.style.setProperty("--portrait-size", `${size}px`);
  portrait.style.backgroundImage = `url("${heroAtlasUrl(character.id)}")`;
  portrait.style.backgroundSize = `${width / region.width * 100}% ${height / region.height * 100}%`;
  portrait.style.backgroundPosition = `${region.x / (width - region.width) * 100}% ${region.y / (height - region.height) * 100}%`;
  return portrait;
}
