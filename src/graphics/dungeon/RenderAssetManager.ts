import { LinearFilter, LinearMipmapLinearFilter, NearestFilter, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from "three";

/** One viewport owns one cache. Late loads are disposed after teardown. */
export class RenderAssetManager {
  readonly loadedUrls: string[] = [];
  readonly failures: string[] = [];
  readonly textures = new Set<Texture>();
  private readonly cache = new Map<string, Texture>();
  private readonly pending: Promise<void>[] = [];
  private disposed = false;

  loadTexture(url: string, sprite = false): Texture {
    const key = `${url}:${sprite ? "sprite" : "surface"}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    let finish!: () => void;
    this.pending.push(new Promise<void>((resolve) => { finish = resolve; }));
    const texture = new TextureLoader().load(url, (loaded) => {
      if (this.disposed) loaded.dispose();
      else this.loadedUrls.push(url);
      finish();
    }, undefined, () => {
      if (!this.disposed) this.failures.push(url);
      finish();
    });
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = sprite ? NearestFilter : LinearFilter;
    texture.minFilter = sprite ? NearestFilter : LinearMipmapLinearFilter;
    texture.generateMipmaps = !sprite;
    if (!sprite) texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = sprite ? 1 : 4;
    this.cache.set(key, texture);
    this.textures.add(texture);
    return texture;
  }

  ownTexture<T extends Texture>(texture: T): T {
    this.textures.add(texture);
    return texture;
  }

  async whenReady(): Promise<void> { await Promise.all(this.pending); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const texture of this.textures) texture.dispose();
    this.textures.clear();
    this.cache.clear();
  }
}
