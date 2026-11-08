import { assetUrl } from "../assets/manifest";
import { readPreferences, updatePreferences } from "./preferences";

// Semantic cues reuse the recordings already in the repository. Rights and
// provenance still require the separate release review in pack 10.
const SFX_FILES: Record<string, string> = {
  step: "step", ui_click: "ui_click", event_choice: "event_choice",
  hit_light: "hit_light", hit_heavy: "hit_heavy",
  sanity_tick: "sanity_tick", sanity_break: "sanity_break",
  miss: "step", cast: "event_choice", defend: "ui_click",
  item_use: "event_choice", victory: "event_choice",
  defeat: "sanity_break", level_up: "event_choice",
  status: "sanity_tick", boss_phase: "sanity_break",
};

// ffmpeg ebur128 measured inter-sample peaks of +1.0/+1.5 dBTP for these
// legacy Ogg files. Attenuate on playback rather than transcoding lossy audio.
const SFX_GAIN: Record<string, number> = { hit_light: 0.65, ui_click: 0.6 };

type AudioElement = Pick<HTMLAudioElement,
  "loop" | "preload" | "volume" | "paused" | "currentTime" | "play" | "pause">;

export class AudioManager {
  private currentMusic?: AudioElement;
  private outgoingMusic?: AudioElement;
  private currentTrackName?: string;
  private musicVolume = readPreferences().music / 100;
  private sfxVolume = readPreferences().sfx / 100;
  private fadeTimer?: ReturnType<typeof setInterval>;
  private transition = 0;
  private sfxPool = new Map<string, AudioElement[]>();
  private createAudio: (url: string) => AudioElement;

  constructor(createAudio: (url: string) => AudioElement = (url) => new Audio(url)) {
    this.createAudio = createAudio;
  }

  private clampVolume(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  }

  private cancelFade(): void {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeTimer = undefined;
    this.outgoingMusic?.pause();
    this.outgoingMusic = undefined;
  }

  public playMusic(trackName: string): void {
    if (trackName === this.currentTrackName && this.currentMusic) {
      if (this.musicVolume > 0 && this.currentMusic.paused) {
        this.currentMusic.volume = this.musicVolume;
        void this.currentMusic.play().catch(() => {});
      }
      return;
    }

    const previous = this.currentMusic;
    this.cancelFade();
    const token = ++this.transition;
    this.currentTrackName = trackName;
    if (this.musicVolume === 0) {
      previous?.pause();
      this.currentMusic = undefined;
      return; // A muted title screen need not fetch music at all.
    }
    const next = this.createAudio(assetUrl(`audio/music/${trackName}.ogg`));
    next.loop = true;
    next.preload = "auto";
    next.volume = previous && !previous.paused ? 0 : this.musicVolume;
    this.currentMusic = next;
    void next.play().then(() => {
      if (token !== this.transition) { next.pause(); return; }
      if (!previous || previous.paused) { next.volume = this.musicVolume; return; }
      this.outgoingMusic = previous;
      const start = Date.now();
      const oldVolume = previous.volume;
      this.fadeTimer = setInterval(() => {
        if (token !== this.transition) { this.cancelFade(); return; }
        const fraction = Math.min(1, (Date.now() - start) / 800);
        next.volume = this.musicVolume * fraction;
        previous.volume = oldVolume * (1 - fraction);
        if (fraction === 1) this.cancelFade();
      }, 40);
    }).catch(() => {
      if (token !== this.transition) return;
      // Autoplay may be denied; don't cut off the old track in that case.
      if (previous && !previous.paused) {
        this.currentMusic = previous;
        this.currentTrackName = undefined;
      }
    });
  }

  public stopMusic(): void {
    ++this.transition;
    this.cancelFade();
    this.currentMusic?.pause();
    this.currentMusic = undefined;
    this.currentTrackName = undefined;
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = this.clampVolume(volume);
    updatePreferences({ music: Math.round(this.musicVolume * 100) });
    if (this.musicVolume === 0) {
      this.cancelFade();
      this.currentMusic?.pause();
    } else if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
      if (this.currentMusic.paused) void this.currentMusic.play().catch(() => {});
    } else if (this.currentTrackName) {
      this.playMusic(this.currentTrackName);
    }
  }

  public playSfx(name: string): void {
    const file = SFX_FILES[name];
    if (!file || this.sfxVolume === 0) return;
    const pool = this.sfxPool.get(file) ?? [];
    let sound = pool.find((item) => item.paused);
    if (!sound) {
      if (pool.length < 3) {
        sound = this.createAudio(assetUrl(`audio/sfx/${file}.ogg`));
        sound.preload = "auto";
        pool.push(sound);
        this.sfxPool.set(file, pool);
      } else {
        sound = pool.shift()!;
        pool.push(sound);
        sound.pause();
      }
    }
    sound.currentTime = 0;
    sound.volume = this.sfxVolume * (SFX_GAIN[file] ?? 1);
    void sound.play().catch(() => {});
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = this.clampVolume(volume);
    updatePreferences({ sfx: Math.round(this.sfxVolume * 100) });
    for (const [file, pool] of this.sfxPool) for (const sound of pool) {
      sound.volume = this.sfxVolume * (SFX_GAIN[file] ?? 1);
      if (this.sfxVolume === 0) sound.pause();
    }
  }
}

export const audioManager = new AudioManager();
