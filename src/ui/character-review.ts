import { characterAtlasUrl, characterAtlasesReady, characterContract, characterFrame, drawCharacter,
  type CharacterAnimation, type ReferenceCharacter } from "../assets/character-sprites";
import { heroAtlasUrl, heroContract, heroFrame, type HeroAnimation } from "../assets/hero-sprites";
import { assetUrl } from "../assets/manifest";
import type { CharacterId } from "../game/state";
import { GameController } from "../game/index";
import { createEnemyState } from "../game/combat/encounters";
import type { CombatState } from "../game/combat/state";
import { ENEMIES } from "../game/enemies";
import { serializeRun } from "../game/save";
import { renderCombatUI } from "../graphics/combat-ui";
import { DungeonRenderer } from "../graphics/dungeon/DungeonRenderer";
import { presentDungeon, type DungeonPresentationSnapshot } from "../graphics/dungeon/types";

type Scene = "exploration" | "combat" | "gallery" | "sequence";
type ReviewCharacter = ReferenceCharacter | CharacterId;
interface Review { character: ReviewCharacter; scene: Scene; animation: CharacterAnimation | HeroAnimation; elapsedMs: number; playing: boolean; reducedMotion: boolean }
const heroes: CharacterId[] = ["elias", "miriam", "subject13", "anya"];

/** QA-only presentation laboratory. No saves, rewards, inputs or combat rules. */
export async function initCharacterReview(root: HTMLDivElement): Promise<void> {
  const controller = new GameController(); controller.newGame(130013);
  const state = controller.getState();
  const fingerprint = () => serializeRun({ ...controller.snapshot(), savedAt: "review-baseline" });
  const pristine = fingerprint();
  const query = new URLSearchParams(location.search);
  let review: Review = { character: query.get("character") === "guard" ? "guard" : "keeper", scene: "gallery",
    animation: "idle", elapsedMs: 0, playing: false, reducedMotion: false };
  let renderer: DungeonRenderer | null = null, frame = 0, clock = 0, canvas: HTMLCanvasElement;
  const images = new Map<string, HTMLImageElement>();
  const image = async (url: string) => {
    if (images.has(url)) return images.get(url)!;
    const value = new Image(); value.src = url; await value.decode(); images.set(url, value); return value;
  };
  await Promise.all([characterAtlasesReady(["keeper", "guard"]), ...heroes.map((id) => image(heroAtlasUrl(id)))]);
  const background = await image(assetUrl("assets/backgrounds/battle/battle_bg1.webp"));
  root.className = "character-review";
  const style = document.createElement("style");
  style.textContent = `.character-review{max-width:1200px;margin:auto;padding:16px;color:#ddd8c3}.character-review h1{font-size:20px;margin:0 0 8px}.character-review p{line-height:1.5}.character-review nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.character-review button,.character-review select{padding:10px;background:#24332e;color:#ddd8c3;border:1px solid #8c9e91;min-height:44px}.character-review canvas{display:block;max-width:100%;height:auto;margin:12px auto;image-rendering:pixelated}.character-review .world{width:min(100%,960px);height:500px;image-rendering:auto}.character-review .review-note{font-size:14px;color:#c4b894;border-left:2px solid #b99b63;padding-left:12px}.character-review .review-status{font:14px monospace}@media(max-width:600px){.character-review{padding:12px}.character-review .world{height:auto;aspect-ratio:4/3}}`;
  document.head.append(style);
  const heading = document.createElement("h1"); heading.textContent = "Character art reference · Phase 01A / 01B";
  const note = document.createElement("p"); note.className = "review-note";
  note.textContent = "Isolated visual fixture · no gameplay consequences or saved changes. Keeper combat is an art preview, not a new encounter. Human approval pending.";
  const nav = document.createElement("nav"); nav.setAttribute("aria-label", "Art review");
  const stage = document.createElement("section"); const status = document.createElement("p"); status.className = "review-status";
  root.replaceChildren(heading, note, nav, stage, status);
  for (const character of [...heroes, "keeper", "guard"] as const) {
    const button = document.createElement("button"); button.textContent = character;
    button.onclick = () => { void show({ character }); }; nav.append(button);
  }
  for (const scene of ["gallery", "exploration", "combat", "sequence"] as const) {
    const button = document.createElement("button"); button.textContent = scene;
    button.onclick = () => { void show({ scene }); }; nav.append(button);
  }
  const select = document.createElement("select"); select.setAttribute("aria-label", "Animation");
  for (const animation of Object.keys(characterContract.animations)) select.add(new Option(animation, animation));
  select.onchange = () => { void show({ animation: select.value as CharacterAnimation, elapsedMs: 0 }); }; nav.append(select);
  const play = document.createElement("button"); play.textContent = "Play / pause";
  play.onclick = () => { void show({ playing: !review.playing }); }; nav.append(play);
  const reduced = document.createElement("button"); reduced.textContent = "Reduced motion";
  reduced.onclick = () => { void show({ reducedMotion: !review.reducedMotion }); }; nav.append(reduced);

  function snapshot(time: number): DungeonPresentationSnapshot {
    const base = presentDungeon(state);
    const hero = heroes.includes(review.character as CharacterId);
    return { ...base, location: review.character === "keeper" ? { depth: 1, x: 4, y: 15, direction: "west" }
      : hero ? { depth: 1, x: 12, y: 7, direction: "north" } : { depth: 1, x: 13, y: 4, direction: "north" },
      map: { ...base.map, tiles: base.map.tiles.map((row) => row.map((tile) => tile.featureId === "release-shutter" ? { ...tile, locked: false } : tile)) },
      flags: { ...base.flags, intakePowerRestored: true },
      characterPreview: hero ? undefined : { id: review.character as ReferenceCharacter, animation: review.animation as CharacterAnimation,
        elapsedMs: review.reducedMotion ? review.animation === "death" ? 650 : 0 : time },
      heroPreview: hero ? { id: review.character as CharacterId, animation: review.animation as HeroAnimation,
        elapsedMs: review.reducedMotion ? review.animation === "death" ? 650 : 0 : time } : undefined };
  }

  function combat(): CombatState {
    const enemy = createEnemyState(ENEMIES.deranged_guard);
    enemy.id = review.character === "keeper" ? "keeper" : "deranged_guard";
    enemy.name = review.character === "keeper" ? "Keeper · art fixture" : "Deranged Guard";
    if (review.animation === "death" && !heroes.includes(review.character as CharacterId)) { enemy.alive = false; enemy.stats.hp = 0; }
    return { party: structuredClone(state.party), encounter: { enemies: [enemy] }, turn: 1, phase: "select-action",
      turnOrder: [{ isPlayer: true, index: 0, speed: 6 }], currentTurnIndex: 0, log: [], shownLowHealthDialogues: [],
      isBossFight: false, combatDepth: 1, enemyIntents: { 0: review.character === "guard"
        ? { targetIndex: 0, abilityId: "baton_strike" } : { targetIndex: 0 } } };
  }

  function gallery(): void {
    const ctx = canvas.getContext("2d")!;
    const width = Math.min(1000, window.innerWidth - 32), columns = width >= 720 ? 6 : 3;
    const groupRows = Math.ceil(6 / columns), cell = width / columns;
    canvas.width = width; canvas.height = groupRows * (172 + 104 + 80);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#121b23"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const names = [...heroes, "keeper", "guard"];
    names.forEach((name, index) => {
      const source = heroes.includes(name as CharacterId) ? images.get(heroAtlasUrl(name as CharacterId)) : undefined;
      const draw = document.createElement("canvas"); draw.width = 128; draw.height = 160;
      const dc = draw.getContext("2d")!;
      if (source) dc.drawImage(source, 0, 0, 128, 160, 0, 0, 128, 160);
      else drawCharacter(dc, name as ReferenceCharacter, "idle", 0, 0, 0, 128, 160, true);
      const data = dc.getImageData(0, 0, 128, 160).data, bounds = [128, 160, 0, 0];
      for (let y = 0; y < 160; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] >= 128) {
        bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1);
      }
      const sw = bounds[2] - bounds[0], sh = bounds[3] - bounds[1];
      const x = index % columns * cell, y = Math.floor(index / columns) * 172;
      ctx.fillStyle = "#ddd8c3"; ctx.font = "13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(name, x + cell / 2, y + 16);
      for (const [offset, rowHeight, height, grayscale] of [[28, 172, 124, false], [groupRows * 172 + 10, 104, 64, false], [groupRows * 276 + 6, 80, 48, true]] as const) {
        const top = offset + Math.floor(index / columns) * rowHeight;
        ctx.filter = grayscale ? "grayscale(1)" : "none";
        ctx.drawImage(draw, bounds[0], bounds[1], sw, sh, x + (cell - sw * height / sh) / 2, top, sw * height / sh, height);
      }
      ctx.filter = "none";
    });
  }

  function sequence(): void {
    canvas.width = 512; canvas.height = 736;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#121b23"; ctx.fillRect(0, 0, 512, 736);
    const clipNames = heroes.includes(review.character as CharacterId)
      ? ["neutral", "breath", "alert", "load", "strike", "recover", "support-load", "support", "support-settle", "brace", "hit", "strain", "give", "kneel", "fall", "defeated"]
      : ["neutral", "breath", "alert", "load", "windup", "strike", "follow", "catch", "settle", "recoil", "fold", "recover", "give", "kneel", "fall", "defeated"];
    const atlas = images.get(heroes.includes(review.character as CharacterId)
      ? heroAtlasUrl(review.character as CharacterId) : characterAtlasUrl(review.character as ReferenceCharacter))!;
    ctx.imageSmoothingEnabled = false; ctx.font = "11px monospace"; ctx.fillStyle = "#ddd8c3";
    for (let i = 0; i < 16; i++) {
      const x = i % 4 * 128, y = Math.floor(i / 4) * 184;
      ctx.drawImage(atlas, i % 4 * 128, Math.floor(i / 4) * 160, 128, 160, x, y, 128, 160);
      ctx.fillText(`${i} ${clipNames[i]}`, x + 6, y + 177);
    }
  }

  async function show(update: Partial<Review> = {}): Promise<void> {
    cancelAnimationFrame(frame); renderer?.dispose(); renderer = null;
    review = { ...review, ...update }; select.value = review.animation;
    const hero = heroes.includes(review.character as CharacterId);
    const animations = hero ? heroContract.animations : characterContract.animations;
    if (!(review.animation in animations)) review.animation = "idle";
    select.replaceChildren(...Object.keys(animations).map((animation) => new Option(animation, animation)));
    select.value = review.animation;
    canvas = document.createElement("canvas"); canvas.setAttribute("aria-label", `${review.character} ${review.scene} visual review`); stage.replaceChildren(canvas);
    if (review.scene === "exploration") {
      canvas.className = "world";
      renderer = new DungeonRenderer(canvas, snapshot(review.elapsedMs), { quality: "balanced", reducedMotion: true,
        onSettled: () => {}, onContextLost: (message) => { throw new Error(message); } });
      await renderer.ready(); renderer.setPaused(true);
    }
    if (review.scene === "gallery") gallery();
    if (review.scene === "sequence") sequence();
    const combatState = combat(); clock = performance.now();
    const draw = (now: number) => {
      const time = review.elapsedMs + (review.playing ? now - clock : 0);
      if (renderer) renderer.update(snapshot(time), true);
      if (review.scene === "combat") renderCombatUI(canvas, combatState, {
        width: Math.min(1260, window.innerWidth - 24), height: window.innerWidth < 650 ? 464 : 328,
        backgroundImage: background, nowMs: review.reducedMotion ? 0 : time, reducedMotion: review.reducedMotion,
        characterPreview: hero ? undefined : { id: review.character as ReferenceCharacter, animation: review.animation as CharacterAnimation, elapsedMs: time },
        heroPreview: hero ? { id: review.character as CharacterId, animation: review.animation as HeroAnimation, elapsedMs: time } : undefined });
      const current = hero ? heroFrame(review.character as CharacterId, review.animation as HeroAnimation, time, review.reducedMotion)
        : characterFrame(review.animation as CharacterAnimation, time, review.reducedMotion);
      status.textContent = `${review.character} · ${review.scene} · ${review.animation} · frame ${current.index} · ${review.reducedMotion ? "reduced motion" : "normal motion"}`;
      frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    // Let the shared hero image cache and the WebGL presentation reach the
    // requested frame before a deterministic screenshot reads pixels.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  await Promise.all([image(characterAtlasUrl("keeper")), image(characterAtlasUrl("guard"))]);
  Object.assign(window, { __CHARACTER_ART_REVIEW__: { show, diagnostics: () => ({ review: { ...review },
    renderer: renderer?.diagnostics(), gameplayUnchanged: fingerprint() === pristine,
    generatedFrames: 16, savedChanges: false }), hideControls: () => { nav.style.display = "none"; } } });
  await show();
}
