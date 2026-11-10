import { DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";
import type { Camera, Scene, Texture } from "three";
import { assetUrl, OBJECT_SPRITES } from "../../assets/manifest";
import { RenderAssetManager } from "./RenderAssetManager";
import type { DungeonPresentationSnapshot } from "./types";
import { characterAtlasUrl, characterContract, characterFrame, type ReferenceCharacter } from "../../assets/character-sprites";

interface WorldSprite {
  readonly group: Group;
  readonly x: number;
  readonly y: number;
  readonly kind: "npc" | "chest" | "vendor" | "echo" | "guard";
  readonly material: MeshStandardMaterial;
  readonly atlas?: Texture;
  readonly character?: ReferenceCharacter;
  frame?: number;
}

/** Upright alpha-tested cards participate in the same depth buffer as walls. */
export class WorldSpriteSystem {
  private readonly sprites: WorldSprite[] = [];
  private readonly geometry = new PlaneGeometry(1, 1);
  private disposed = false;

  constructor(scene: Scene, snapshot: DungeonPresentationSnapshot, assets: RenderAssetManager) {
    try {
    for (let y = 0; y < snapshot.map.height; y++) for (let x = 0; x < snapshot.map.width; x++) {
      const tile = snapshot.map.tiles[y][x];
      const kind = tile.npcId ? "npc" : tile.vendor ? "vendor" : tile.chest ? "chest" : null;
      if (!kind) continue;
      if (kind === "npc") {
        this.addCharacter(scene, assets, "keeper", x, y,
          snapshot.map.layoutId === "depth1-intake-v1" ? x * 2 - 0.75 : x * 2 + 0.4,
          snapshot.map.layoutId === "depth1-intake-v1" ? y * 2 - 0.5 : y * 2 - 0.4);
        continue;
      }
      const url = kind === "chest" ? OBJECT_SPRITES.chest : OBJECT_SPRITES.vendor;
      const texture = assets.loadTexture(url, true);
      const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.55,
        transparent: false, side: DoubleSide, roughness: 0.95, metalness: 0, color: 0xe1e2cd,
        emissive: 0x93a28e, emissiveMap: texture, emissiveIntensity: 0.16 });
      material.name = `world-sprite:${kind}`;
      const height = kind === "chest" ? 0.7 : 1.8;
      const width = kind === "chest" ? 0.85 : 1.2;
      const group = new Group(); group.name = `${kind}:${x},${y}`;
      group.position.set(x * 2 + (kind === "chest" ? 0 : 0.4), 0, y * 2 - (kind === "chest" ? 0 : 0.4));
      // Humanoids stand between grid travel lines, never on the moving eye.
      const sprite = new Mesh(this.geometry, material);
      sprite.scale.set(width, height, 1);
      // Vendor source feet end at the image bottom; all vertical motion is a
      // tiny scale about this fixed ground pivot rather than floating bob.
      sprite.position.y = height / 2 - (kind === "chest" ? 0 : 0.02);
      group.add(sprite); scene.add(group);
      this.sprites.push({ group, x, y, kind, material });
    }
    if (snapshot.map.layoutId === "depth1-intake-v1") {
      if (snapshot.guardPresent) this.addCharacter(scene, assets, "guard", 13, 2, 26.6, 3.6);
      const atlas = assets.ownTexture(assets.loadTexture(assetUrl("assets/sprites/characters/subject13/hero-atlas.png"), true).clone());
      atlas.repeat.set(128 / 512, 160 / 512);
      atlas.offset.set(0, 1 - 160 / 512);
      // Alpha test includes material opacity: a 0.5 cutoff erased the entire
      // high-SAN (0.42 opacity) figure instead of making it uncertain.
      const material = new MeshStandardMaterial({ map: atlas, alphaTest: 0.1, side: DoubleSide,
        transparent: true, opacity: 0.67, depthWrite: false, roughness: 1, color: 0x92bdb0 });
      material.name = "world-sprite:queue-echo";
      const group = new Group(); group.name = "perception:queue-echo";
      group.position.set(24.4, 0, 20.2);
      const sprite = new Mesh(this.geometry, material);
      sprite.scale.set(1.4, 1.75, 1);
      sprite.position.y = 1.75 * (0.92 - 0.5);
      group.add(sprite); scene.add(group);
      this.sprites.push({ group, x: 12, y: 11, kind: "echo", material, atlas });
      void assets.whenReady().then(() => { if (!this.disposed) atlas.needsUpdate = true; });
    }
    } catch (error) { this.dispose(); throw error; }
  }

  private addCharacter(scene: Scene, assets: RenderAssetManager, id: ReferenceCharacter,
    x: number, y: number, worldX: number, worldZ: number): void {
    const atlas = assets.ownTexture(assets.loadTexture(characterAtlasUrl(id), true).clone());
    atlas.repeat.set(characterContract.frameWidth / characterContract.width, characterContract.frameHeight / characterContract.height);
    atlas.offset.set(0, 1 - characterContract.frameHeight / characterContract.height);
    const material = new MeshStandardMaterial({ map: atlas, alphaTest: 0.5, transparent: false,
      side: DoubleSide, roughness: 1, metalness: 0, color: 0xffffff,
      emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.18 });
    material.name = `world-character:${id}`;
    const group = new Group(); group.name = `character:${id}:${x},${y}`;
    group.position.set(worldX, 0, worldZ);
    const height = characterContract.characters[id].worldHeight * characterContract.frameHeight / characterContract.standingPixels;
    const sprite = new Mesh(this.geometry, material);
    sprite.scale.set(height * characterContract.frameWidth / characterContract.frameHeight, height, 1);
    sprite.position.y = height * (characterContract.pivot[1] - 0.5);
    group.add(sprite); scene.add(group);
    this.sprites.push({ group, x, y, kind: id === "keeper" ? "npc" : "guard", material, atlas, character: id, frame: 0 });
    void assets.whenReady().then(() => { if (!this.disposed) atlas.needsUpdate = true; });
  }

  update(snapshot: DungeonPresentationSnapshot, camera: Camera, elapsed: number, reducedMotion: boolean): void {
    for (const sprite of this.sprites) {
      const tile = snapshot.map.tiles[sprite.y]?.[sprite.x];
      sprite.group.visible = sprite.kind === "echo"
        ? snapshot.flags.intakePerceptionSeen === true && snapshot.flags.intakeComplete !== true
        : sprite.kind === "chest" ? !!tile?.chest && !tile.chest.opened
        : sprite.kind === "guard" ? snapshot.guardPresent : true;
      if (sprite.kind === "echo") {
        // SAN changes the optional figure's certainty, never collision, fog,
        // prompts or required information. The ordinary shelf clue remains.
        const certainty = snapshot.perception === "low" ? 0.78 : snapshot.perception === "mid" ? 0.6 : 0.42;
        const distance = Math.hypot(camera.position.x - sprite.group.position.x, camera.position.z - sprite.group.position.z);
        // It waits beyond the junction threshold and dissolves on approach;
        // never put a full-height billboard through the moving camera.
        sprite.material.opacity = certainty * Math.min(1, Math.max(0, (distance - 2) / 1.2));
      }
      sprite.group.rotation.y = Math.atan2(camera.position.x - sprite.group.position.x, camera.position.z - sprite.group.position.z);
      sprite.group.scale.y = reducedMotion || sprite.character || sprite.kind === "chest" || sprite.kind === "echo" ? 1 : 1 + Math.sin(elapsed * 1.4 + sprite.x) * 0.003;
      if (sprite.character && sprite.atlas) {
        const preview = snapshot.characterPreview?.id === sprite.character ? snapshot.characterPreview : undefined;
        const frame = characterFrame(preview?.animation ?? "idle", preview?.elapsedMs ?? elapsed * 1000, preview ? false : reducedMotion);
        sprite.atlas.offset.set(frame.x / characterContract.width, 1 - (frame.y + frame.height) / characterContract.height);
        sprite.frame = frame.index;
        continue;
      }
      // Two real authored idle poses, cells 0 and 3 of the unchanged atlas.
      // The frame's feet pivot stays fixed while only its UV changes.
      if (sprite.atlas) sprite.atlas.offset.x = reducedMotion || Math.floor(elapsed / 0.5) % 2 === 0 ? 0 : 3 * 128 / 512;
    }
  }

  get materialCount(): number { return this.sprites.length; }
  diagnostics() {
    return this.sprites.filter((sprite) => sprite.character).map((sprite) => ({ id: sprite.character,
      visible: sprite.group.visible, frame: sprite.frame, world: sprite.group.position.toArray(),
      pivot: characterContract.pivot, worldHeight: characterContract.characters[sprite.character!].worldHeight,
      scaleY: sprite.group.scale.y }));
  }
  dispose(): void {
    this.disposed = true;
    this.geometry.dispose();
    for (const sprite of this.sprites) { sprite.group.removeFromParent(); sprite.material.dispose(); }
    this.sprites.length = 0;
  }
}
