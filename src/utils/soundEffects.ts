class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gm_chess_muted');
      if (saved) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuffer) {
      try {
        const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * 0.02));
        const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buf.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        this.noiseBuffer = buf;
      } catch {
        return null;
      }
    }
    return this.noiseBuffer;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('gm_chess_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Wooden tap for standard move (non-blocking, instant execution)
  public playMove() {
    if (this.isMuted) return;
    setTimeout(() => {
      this.initCtx();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        const noiseBuf = this.getNoiseBuffer();
        if (noiseBuf) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuf;
          const noiseGain = this.ctx.createGain();
          noiseGain.gain.setValueAtTime(0.15, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

          noise.connect(noiseGain);
          noiseGain.connect(this.ctx.destination);
          noise.start(now);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch {
        // ignore audio errors
      }
    }, 0);
  }

  // Solid thud for piece capture
  public playCapture() {
    if (this.isMuted) return;
    setTimeout(() => {
      this.initCtx();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } catch {
        // ignore
      }
    }, 0);
  }

  // Castling swoosh
  public playCastle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.playMove();
      setTimeout(() => this.playMove(), 110);
    } catch {
      // ignore
    }
  }

  // King check alert: 2-tone melodic chime
  public playCheck() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const playTone = (freq: number, start: number, dur: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };

      playTone(523.25, now, 0.14); // C5
      playTone(659.25, now + 0.09, 0.22); // E5
    } catch {
      // ignore
    }
  }

  // Game over sound
  public playGameOver(result: 'victory' | 'defeat' | 'draw') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const playTone = (freq: number, start: number, dur: number, vol = 0.25) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };

      if (result === 'victory') {
        playTone(523.25, now, 0.2); // C5
        playTone(659.25, now + 0.15, 0.2); // E5
        playTone(783.99, now + 0.3, 0.25); // G5
        playTone(1046.5, now + 0.45, 0.45); // C6
      } else if (result === 'defeat') {
        playTone(440.0, now, 0.25); // A4
        playTone(415.3, now + 0.18, 0.25); // Ab4
        playTone(369.99, now + 0.36, 0.4); // F#4
        playTone(293.66, now + 0.54, 0.6); // D4
      } else {
        playTone(440.0, now, 0.3); // A4
        playTone(554.37, now + 0.15, 0.35); // C#5
        playTone(440.0, now + 0.35, 0.4); // A4
      }
    } catch {
      // ignore
    }
  }

  // Notify for opponent join or action
  public playNotify() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEngine();
