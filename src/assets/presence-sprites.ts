import type { CharacterId } from "../game/state";
import { assetUrl } from "./manifest";
import contract from "./presence-atlas-contract.json";

export const presenceContract = contract;
export type PresencePose = typeof contract.poses[number];
const images = new Map<CharacterId, HTMLImageElement>();
const pending = new Map<CharacterId, Promise<void>>();

export function presenceAtlasUrl(id: CharacterId): string {
  return assetUrl(`assets/sprites/characters/${contract.characters[id].atlas}`);
}

export function presenceFrame(pose: number) {
  const index = Math.max(0, Math.min(contract.poses.length - 1, Number.isFinite(pose) ? Math.floor(pose) : 0));
  return { index, x: index % contract.columns * contract.frameWidth,
    y: Math.floor(index / contract.columns) * contract.frameHeight, width: contract.frameWidth, height: contract.frameHeight };
}

export function presenceImage(id: CharacterId): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = images.get(id);
  if (!image) {
    image = new Image(); images.set(id, image);
    const target = image;
    pending.set(id, new Promise<void>((resolve, reject) => {
      target.onload = () => target.naturalWidth === contract.width && target.naturalHeight === contract.height
        ? resolve() : reject(new Error(`Presence atlas dimensions invalid: ${id}`));
      target.onerror = () => reject(new Error(`Presence atlas failed to load: ${id}`));
    }));
    void pending.get(id)!.catch((error: Error) => console.error(error.message));
    image.src = presenceAtlasUrl(id);
  }
  return image.complete && image.naturalWidth === contract.width && image.naturalHeight === contract.height ? image : null;
}

export async function presenceAtlasesReady(ids: readonly CharacterId[]): Promise<void> {
  ids.forEach(presenceImage);
  await Promise.all(ids.map((id) => pending.get(id)));
}

export function drawPresence(ctx: CanvasRenderingContext2D, id: CharacterId, pose: number,
  x: number, y: number, width: number, height: number): boolean {
  const image = presenceImage(id);
  if (!image) return false;
  const frame = presenceFrame(pose);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x, y, width, height);
  ctx.restore(); return true;
}
