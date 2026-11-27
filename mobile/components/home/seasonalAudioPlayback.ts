export interface SeasonalAudioPlayer {
  loop: boolean;
  volume: number;
  replace(source: unknown): void;
  play(): void;
  pause(): void;
}

export class SeasonalAudioPlayback {
  private generation = 0;
  private sourceKey: string | null = null;
  private sourceFailed = false;
  private disposed = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly player: SeasonalAudioPlayer,
    private readonly setAudioMode: () => Promise<void>,
    private readonly isAppActive: () => boolean,
    private readonly reportError: (error: unknown) => void = () => undefined,
  ) {}

  private setSource(key: string, source: unknown): boolean {
    if (this.disposed) return false;
    if (this.sourceKey === key && !this.sourceFailed) return true;

    this.stop();
    this.sourceFailed = false;
    try {
      this.player.replace(source);
      this.sourceKey = key;
      return true;
    } catch (error) {
      this.sourceFailed = true;
      this.notifyError(error);
      return false;
    }
  }

  async start(key: string, source: unknown, volume: number): Promise<void> {
    if (this.disposed || !this.isAppActive() || !this.setSource(key, source)) return;

    const generation = ++this.generation;
    this.clearFade();
    try {
      await this.setAudioMode();
      if (!this.isCurrent(generation)) return;

      this.player.loop = true;
      this.player.volume = 0;
      this.player.play();
      const targetVolume = Math.max(0, Math.min(0.08, Number.isFinite(volume) ? volume : 0.08));
      if (targetVolume === 0) return;

      let step = 0;
      this.fadeTimer = setInterval(() => {
        if (!this.isCurrent(generation)) {
          this.clearFade();
          return;
        }
        try {
          step += 1;
          this.player.volume = Math.min(targetVolume, (step * targetVolume) / 20);
          if (step >= 20) this.clearFade();
        } catch (error) {
          this.stop();
          this.notifyError(error);
        }
      }, 100);
    } catch (error) {
      if (this.isCurrent(generation)) this.stop();
      this.notifyError(error);
    }
  }

  stop(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.clearFade();
    if (this.sourceKey === null) return;
    try {
      this.player.volume = 0;
      this.player.pause();
    } catch (error) {
      this.notifyError(error);
    }
  }

  /** The hook releases the native player on unmount; dispose only invalidates pending work. */
  dispose(): void {
    this.generation += 1;
    this.clearFade();
    this.disposed = true;
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed && generation === this.generation && this.isAppActive();
  }

  private notifyError(error: unknown): void {
    try {
      this.reportError(error);
    } catch {
      // Error reporting is optional and must never escape into app navigation.
    }
  }

  private clearFade(): void {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeTimer = null;
  }
}
