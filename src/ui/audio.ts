class AudioManager {
  private currentMusic?: HTMLAudioElement;
  private musicVolume = 0.7;
  private sfxVolume = 0.8;

  private clampVolume(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  public playMusic(trackName: string): void {
    this.stopMusic();

    const audio = new Audio(`/audio/music/${trackName}.ogg`);
    audio.loop = true;
    audio.volume = this.musicVolume;
    this.currentMusic = audio;

    // Autoplay may be blocked; ignore rejected promises.
    void audio.play().catch(() => {});
  }

  public stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic = undefined;
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = this.clampVolume(volume);
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  public playSfx(name: string): void {
    const sfx = new Audio(`/audio/sfx/${name}.ogg`);
    sfx.volume = this.sfxVolume;
    void sfx.play().catch(() => {});
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = this.clampVolume(volume);
  }
}

export const audioManager = new AudioManager();
