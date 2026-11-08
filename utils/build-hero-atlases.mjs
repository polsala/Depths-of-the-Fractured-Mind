import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(await readFile(resolve(root, "src/assets/hero-atlas-contract.json"), "utf8"));
const sourceBase = resolve(root, "source-assets/assets/sprites/characters");
const outputBase = resolve(root, "public/assets/sprites/characters");
const check = process.argv.includes("--check");

if (contract.version !== 1 || contract.columns !== 4 || contract.rows !== 3 || contract.size !== 512 || contract.sourceSize !== 1024 || contract.frameWidth !== 128 || contract.frameHeight !== 160) {
  throw new Error("Unsupported hero atlas contract");
}
for (const [name, animation] of Object.entries(contract.animations)) {
  if (!animation.frames.length || animation.frameMs < 60) throw new Error(`Invalid ${name} animation`);
  for (const index of animation.frames) {
    if (!Number.isInteger(index) || index < 0 || index >= 12) throw new Error(`Invalid ${name} frame ${index}`);
  }
}

function removeCheckerMatte(image) {
  const { width, height, data } = image;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const canRemove = (pixel) => {
    const i = pixel * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const mean = (r + g + b) / 3;
    return spread <= 9 && mean >= 38 && mean <= 78;
  };
  const enqueue = (pixel) => {
    if (seen[pixel] || !canRemove(pixel)) return;
    seen[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel < width * (height - 1)) enqueue(pixel + width);
  }
  for (let pixel = 0; pixel < seen.length; pixel++) {
    if (seen[pixel]) data[pixel * 4 + 3] = 0;
  }
  // The source also contains opaque checker seams and isolated dark noise.
  // They are not attached to a pose; retain the largest 8-connected silhouette
  // in each cell after clearing the grid gutters.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const left = col * contract.sourceFrameWidth;
      const top = row * contract.sourceFrameHeight;
      const right = left + contract.sourceFrameWidth;
      const bottom = top + contract.sourceFrameHeight;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          if (x < left + 5 || x >= right - 5 || y < top + 5 || y >= bottom - 9) {
            data[(y * width + x) * 4 + 3] = 0;
          }
        }
      }
      const visited = new Uint8Array(contract.sourceFrameWidth * contract.sourceFrameHeight);
      const components = [];
      const pending = [];
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const local = (y - top) * contract.sourceFrameWidth + x - left;
        if (visited[local] || data[(y * width + x) * 4 + 3] === 0) continue;
        const component = [];
        visited[local] = 1;
        pending.push([x, y]);
        while (pending.length) {
          const [cx, cy] = pending.pop();
          component.push(cy * width + cx);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < left || nx >= right || ny < top || ny >= bottom) continue;
            const ni = (ny - top) * contract.sourceFrameWidth + nx - left;
            if (visited[ni] || data[(ny * width + nx) * 4 + 3] === 0) continue;
            visited[ni] = 1;
            pending.push([nx, ny]);
          }
        }
        components.push(component);
      }
      const largest = components.reduce((best, component) => component.length > best.length ? component : best, []);
      if (largest.length < 1500) throw new Error(`Anya frame ${row * 4 + col}: silhouette missing`);
      for (const component of components) {
        if (component === largest) continue;
        for (const pixel of component) data[pixel * 4 + 3] = 0;
      }
    }
  }
  for (let y = contract.rows * contract.sourceFrameHeight; y < height; y++) {
    for (let x = 0; x < width; x++) data[(y * width + x) * 4 + 3] = 0;
  }
  return tail;
}

function downsample(source) {
  if (source.width !== contract.sourceSize || source.height !== contract.sourceSize) {
    throw new Error("Hero source dimensions must be 1024 × 1024");
  }
  const atlas = new PNG({ width: contract.size, height: contract.size, colorType: 6 });
  for (let y = 0; y < atlas.height; y++) for (let x = 0; x < atlas.width; x++) {
    let alpha = 0, red = 0, green = 0, blue = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sourceIndex = ((y * 2 + dy) * source.width + x * 2 + dx) * 4;
      const a = source.data[sourceIndex + 3];
      alpha += a;
      red += source.data[sourceIndex] * a;
      green += source.data[sourceIndex + 1] * a;
      blue += source.data[sourceIndex + 2] * a;
    }
    const index = (y * atlas.width + x) * 4;
    atlas.data[index] = alpha ? Math.round(red / alpha) : 0;
    atlas.data[index + 1] = alpha ? Math.round(green / alpha) : 0;
    atlas.data[index + 2] = alpha ? Math.round(blue / alpha) : 0;
    atlas.data[index + 3] = Math.round(alpha / 4);
  }
  return atlas;
}

export function validateFrames(name, image) {
  const { width, height, data } = image;
  if (width !== contract.size || height !== contract.size) throw new Error(`${name}: wrong dimensions`);
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
  if (transparent < width * height * 0.45) throw new Error(`${name}: missing true transparency`);
  for (let frame = 0; frame < 12; frame++) {
    const left = (frame % 4) * contract.frameWidth;
    const top = Math.floor(frame / 4) * contract.frameHeight;
    const bottom = top + contract.frameHeight;
    let pixels = 0;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < left + contract.frameWidth; x++) if (data[(y * width + x) * 4 + 3] >= 128) pixels++;
    }
    if (pixels < 1500) throw new Error(`${name}: missing or empty frame ${frame}`);
    for (const x of [left, left + contract.frameWidth - 1]) {
      for (const y of [top, bottom - 1]) {
        if (data[(y * width + x) * 4 + 3] > 0) throw new Error(`${name}: opaque frame corner ${frame}`);
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const atlases = [];
  for (const [name, entry] of Object.entries(contract.characters)) {
    const source = PNG.sync.read(await readFile(resolve(sourceBase, entry.source)));
    if (entry.matte === "dark-checker") removeCheckerMatte(source);
    const atlas = downsample(source);
    validateFrames(name, atlas);
    atlases.push(atlas);
    const encoded = PNG.sync.write(atlas, { colorType: 6, inputColorType: 6, deflateLevel: 9 });
    const destination = resolve(outputBase, entry.atlas);
    if (check) {
      const current = await readFile(destination).catch(() => null);
      if (!current?.equals(encoded)) throw new Error(`${name}: generated atlas is stale; run npm run sprites:build`);
    } else {
      await writeFile(destination, encoded);
    }
    process.stdout.write(`${name}: 12 validated RGBA frames${check ? " (current)" : " (built)"}\n`);
  }
  const sample = new PNG({ width: 640, height: 800, colorType: 6 });
  for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
    const i = (y * sample.width + x) * 4;
    sample.data[i] = 18; sample.data[i + 1] = 27; sample.data[i + 2] = 35; sample.data[i + 3] = 255;
  }
  for (const [column, atlas] of atlases.entries()) for (const [row, frame] of [0, 7, 9, 11].entries()) {
    const sourceX = (frame % 4) * contract.frameWidth;
    const sourceY = Math.floor(frame / 4) * contract.frameHeight;
    const left = column * 160 + 16, top = row * 200 + 20;
    for (let y = 0; y < contract.frameHeight; y++) for (let x = 0; x < contract.frameWidth; x++) {
      const sourceIndex = ((sourceY + y) * atlas.width + sourceX + x) * 4;
      const targetIndex = ((top + y) * sample.width + left + x) * 4;
      const alpha = atlas.data[sourceIndex + 3] / 255;
      for (let channel = 0; channel < 3; channel++) {
        sample.data[targetIndex + channel] = Math.round(atlas.data[sourceIndex + channel] * alpha + sample.data[targetIndex + channel] * (1 - alpha));
      }
    }
  }
  const samplePath = resolve(root, "docs/art/hero-reference.png");
  const sampleBytes = PNG.sync.write(sample, { colorType: 6, inputColorType: 6, deflateLevel: 9 });
  if (check) {
    const current = await readFile(samplePath).catch(() => null);
    if (!current?.equals(sampleBytes)) throw new Error("Hero art reference is stale; run npm run sprites:build");
  } else {
    await mkdir(resolve(root, "docs/art"), { recursive: true });
    await writeFile(samplePath, sampleBytes);
  }
}
