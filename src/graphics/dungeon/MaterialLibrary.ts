import { CanvasTexture, Color, DoubleSide, FrontSide, MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import type { Material, Texture } from "three";
import { DEPTH_TEXTURES, GLOBAL_TEXTURES } from "../../assets/manifest";
import { RenderAssetManager } from "./RenderAssetManager";

export type MaterialRole = "wall" | "enamel" | "floor" | "ceiling" | "trim" | "steel" | "dark" | "brass" | "paper" | "red" | "light" | "warmLight" | "glass" | "cloth" | "skin";

/** Named material roles make the architecture, props and signals one family. */
export class MaterialLibrary {
  readonly materials = new Set<Material>();
  private readonly roles = new Map<MaterialRole, MeshStandardMaterial>();
  private readonly labels = new Map<string, Material>();
  private readonly assets: RenderAssetManager;

  constructor(assets: RenderAssetManager, depth: number, semanticArchive = false) {
    this.assets = assets;
    try {
    const palette = [0x59685d, 0x59685d, 0x71664e, 0x607d70, 0x625e79, 0x764b4b][depth] ?? 0x59685d;
    const paths = DEPTH_TEXTURES[depth] ?? DEPTH_TEXTURES[1];
    const wall = semanticArchive ? this.archiveSurface("concrete") : assets.loadTexture(paths.wall);
    const floor = semanticArchive ? this.archiveSurface("floor") : assets.loadTexture(paths.floor);
    const ceiling = semanticArchive ? wall : assets.loadTexture(GLOBAL_TEXTURES.ceiling);
    this.add("wall", { color: 0xc1bda9, map: wall, roughness: 0.94, metalness: 0 });
    this.add("enamel", { color: palette, map: this.paintWear(), roughness: 0.64, metalness: 0.13 });
    this.add("floor", { color: 0x9d9f8b, map: floor, roughness: 0.71, metalness: 0.03 });
    this.add("ceiling", { color: 0x696d65, map: ceiling, roughness: 0.92 });
    this.add("trim", { color: 0x3d4846, roughness: 0.48, metalness: 0.4 });
    this.add("steel", { color: 0x74817b, roughness: 0.37, metalness: 0.65 });
    this.add("dark", { color: 0x172322, roughness: 0.89 });
    this.add("brass", { color: 0xae8650, roughness: 0.48, metalness: 0.5 });
    this.add("paper", { color: 0xc7bf9e, roughness: 0.96, side: DoubleSide });
    this.add("red", { color: 0x7c3d35, roughness: 0.58, metalness: 0.22 });
    this.add("light", { color: 0xd7e7d6, emissive: new Color(0xd5e7d7), emissiveIntensity: 1.5, roughness: 0.54 });
    this.add("warmLight", { color: 0xebc18a, emissive: new Color(0xe8b875), emissiveIntensity: 1.2, roughness: 0.54 });
    this.add("glass", { color: 0x567066, roughness: 0.3, metalness: 0.32 });
    this.add("cloth", { color: 0x999b86, roughness: 0.98, metalness: 0 });
    this.add("skin", { color: 0xb8b09a, roughness: 0.96, metalness: 0 });
    if (semanticArchive) {
      // Archive changes material roles, not the established Intake family.
      const colors: Partial<Record<MaterialRole, number>> = { wall: 0xa99b87, enamel: 0x4b6970,
        floor: 0x64584a, ceiling: 0x685b4d, trim: 0x2c231d, steel: 0x837d69,
        dark: 0x211c18, brass: 0xd2ad69, paper: 0xa99b7c, glass: 0x445c5d };
      for (const [role, color] of Object.entries(colors)) this.get(role as MaterialRole).color.setHex(color!);
      this.get("steel").metalness = 0.32; this.get("steel").roughness = 0.62;
      this.get("enamel").roughness = 0.73;
      this.get("light").emissive.setHex(0x9ab0ac); this.get("light").emissiveIntensity = 0.65;
      this.get("warmLight").emissive.setHex(0xd2ad69); this.get("warmLight").emissiveIntensity = 0.9;
      for (const material of this.materials) material.name = material.name.replace(/^intake:/, "archive:");
    }
    } catch (error) { this.dispose(); throw error; }
  }

  private add(role: MaterialRole, options: ConstructorParameters<typeof MeshStandardMaterial>[0]): void {
    const material = new MeshStandardMaterial(options);
    material.name = `intake:${role}`;
    this.roles.set(role, material);
    this.materials.add(material);
  }

  get(role: MaterialRole): MeshStandardMaterial { return this.roles.get(role)!; }

  private archiveSurface(kind: "concrete" | "floor"): Texture {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = kind === "floor" ? "#a99d88" : "#c3baa6"; ctx.fillRect(0, 0, 256, 256);
    // Broad finish variation is deterministic and restrained. No random speckle
    // or baked perspective; one 256px surface corresponds to a two metre bay.
    for (let band = 0; band < 16; band++) {
      ctx.fillStyle = `rgba(70,55,38,${0.012 + (band % 5) * 0.004})`;
      ctx.fillRect(0, band * 16, 256, 16);
    }
    ctx.strokeStyle = kind === "floor" ? "#786f60" : "#a59b87"; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);
    if (kind === "floor") {
      ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
      ctx.fillStyle = "rgba(210,192,154,.12)"; ctx.fillRect(46, 0, 164, 256);
    } else {
      ctx.fillStyle = "rgba(89,76,52,.06)"; ctx.fillRect(0, 235, 256, 21);
      ctx.fillStyle = "#aaa08c"; ctx.fillRect(13, 13, 3, 3); ctx.fillRect(240, 13, 3, 3);
    }
    const texture = this.assets.ownTexture(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 4; return texture;
  }

  private paintWear(): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#d3d7cf"; ctx.fillRect(0, 0, 256, 256);
    // Placement follows surface edges and handle-height abrasion, not random noise.
    ctx.fillStyle = "#a6aea1";
    for (let index = 0; index < 18; index++) {
      const x = (index * 71 + 9) % 256;
      const y = index < 10 ? 242 + index % 5 : 18 + index % 4;
      ctx.fillRect(x, y, 3 + index % 11, 1 + index % 3);
    }
    ctx.strokeStyle = "#b8bfb3"; ctx.lineWidth = 1;
    for (const [x, y, length] of [[25, 153, 31], [160, 83, 27], [105, 202, 49], [52, 31, 11]]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y - 2); ctx.stroke();
    }
    const texture = this.assets.ownTexture(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    return texture;
  }

  sign(text: string, options: { background?: string; color?: string; width?: number; height?: number; fontSize?: number; emissive?: boolean; frontOnly?: boolean } = {}): Material {
    const key = JSON.stringify([text, options]);
    const existing = this.labels.get(key);
    if (existing) return existing;
    const canvas = document.createElement("canvas");
    canvas.width = options.width ?? 768; canvas.height = options.height ?? 192;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = options.background ?? "#233731"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#738078"; ctx.lineWidth = 4; ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    ctx.fillStyle = options.color ?? "#e5ddbb";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `600 ${options.fontSize ?? 52}px sans-serif`;
    const lines = text.split("\n");
    lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, canvas.height * (index + 0.5) / lines.length, canvas.width - 42));
    const texture = this.assets.ownTexture(new CanvasTexture(canvas));
    texture.colorSpace = SRGBColorSpace;
    const side = options.frontOnly ? FrontSide : DoubleSide;
    const material = options.emissive ? new MeshBasicMaterial({ map: texture, side })
      : new MeshStandardMaterial({ map: texture, roughness: 0.8, side });
    // Three places material.name in a GLSL preprocessor definition. Newlines
    // and punctuation in content must never become shader source.
    material.name = `intake_sign_${text.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    material.userData.label = text;
    this.materials.add(material); this.labels.set(key, material);
    return material;
  }

  dispose(): void { for (const material of this.materials) material.dispose(); this.materials.clear(); }
}
