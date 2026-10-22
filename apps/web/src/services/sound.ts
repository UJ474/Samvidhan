// Web Audio API Synthesizer for tactile civic clicks, wheel peg ticks, and answer chimes

class SoundService {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public hapticsEnabled: boolean = true;

  private initCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Peg tick sound (mechanical click)
  public playPegTick(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);

      if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // AudioContext policy fallback
    }
  }

  // Wheel landing fanfare
  public playWheelLand(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.42);
      });

      if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 40, 60]);
      }
    } catch {}
  }

  // Correct answer chime
  public playCorrect(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.36);

      if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 20, 40]);
      }
    } catch {}
  }

  // Wrong answer thud
  public playWrong(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.26);

      if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch {}
  }

  // Dice roll
  public playDiceRoll(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          this.playPegTick();
        }, i * 65);
      }
    } catch {}
  }
}

export const sounds = new SoundService();
