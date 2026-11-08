import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioManager } from "../src/ui/audio";

class FakeAudio {
  loop = false;
  preload = "none";
  volume = 1;
  paused = true;
  currentTime = 0;
  plays = 0;
  pauses = 0;
  rejectPlay = false;
  constructor(readonly url: string) {}
  play(): Promise<void> {
    this.plays++;
    if (this.rejectPlay) return Promise.reject(new Error("Autoplay blocked"));
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void { this.paused = true; this.pauses++; }
}

afterEach(() => { vi.useRealTimers(); });

describe("AudioManager", () => {
  it("crossfades once, keeps the same track playing, and cleans up the outgoing track", async () => {
    vi.useFakeTimers();
    const tracks: FakeAudio[] = [];
    const audio = new AudioManager((url) => {
      const track = new FakeAudio(url);
      tracks.push(track);
      return track;
    });
    audio.playMusic("main_theme");
    await Promise.resolve();
    audio.playMusic("main_theme");
    expect(tracks).toHaveLength(1);
    audio.playMusic("depth1_ambient");
    await Promise.resolve();
    expect(tracks).toHaveLength(2);
    expect(tracks[1].volume).toBe(0);
    vi.advanceTimersByTime(400);
    expect(tracks[0].volume).toBeGreaterThan(0);
    expect(tracks[0].volume).toBeLessThan(0.7);
    expect(tracks[1].volume).toBeGreaterThan(0);
    vi.advanceTimersByTime(400);
    expect(tracks[0].paused).toBe(true);
    expect(tracks[1].volume).toBeCloseTo(0.7);
    audio.stopMusic();
  });

  it("preserves the previous track if the replacement cannot start", async () => {
    const tracks: FakeAudio[] = [];
    const audio = new AudioManager((url) => {
      const track = new FakeAudio(url);
      track.rejectPlay = url.includes("battle_normal");
      tracks.push(track);
      return track;
    });
    audio.playMusic("depth1_ambient");
    await Promise.resolve();
    audio.playMusic("battle_normal");
    await Promise.resolve();
    expect(tracks[0].paused).toBe(false);
    audio.stopMusic();
  });

  it("respects mute and limits overlapping SFX to three voices per recording", () => {
    const tracks: FakeAudio[] = [];
    const audio = new AudioManager((url) => {
      const track = new FakeAudio(url);
      tracks.push(track);
      return track;
    });
    audio.setMusicVolume(0);
    audio.playMusic("main_theme");
    expect(tracks).toHaveLength(0);
    audio.playSfx("miss");
    audio.playSfx("step");
    audio.playSfx("step");
    audio.playSfx("step");
    expect(tracks).toHaveLength(3);
    audio.setSfxVolume(0);
    audio.playSfx("hit_heavy");
    expect(tracks).toHaveLength(3);
    expect(tracks.every((track) => track.paused)).toBe(true);
    audio.stopMusic();
  });

  it("maps phase and status cues to available recordings and attenuates hot legacy clips", () => {
    const tracks: FakeAudio[] = [];
    const audio = new AudioManager((url) => {
      const track = new FakeAudio(url);
      tracks.push(track);
      return track;
    });
    audio.playSfx("boss_phase");
    audio.playSfx("status");
    audio.playSfx("hit_light");
    audio.playSfx("ui_click");
    expect(tracks.map((track) => track.url.split("/").at(-1))).toEqual([
      "sanity_break.ogg", "sanity_tick.ogg", "hit_light.ogg", "ui_click.ogg",
    ]);
    expect(tracks[2].volume).toBeLessThan(0.6);
    expect(tracks[3].volume).toBeLessThan(0.6);
  });
});
