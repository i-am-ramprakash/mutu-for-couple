/**
 * Premium Web Audio API Polyphonic Sleep Synthesizer Drone
 */
export class AmbientSynth {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  public isMuted: boolean = false;

  start() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      this.ctx = new AudioContextClass();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      // Soft ambient loop fade in ramp
      this.gainNode.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime + 3);

      // Warm low-pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      filter.Q.setValueAtTime(4, this.ctx.currentTime);

      // Warm celestial drone chords (F# Major 9 / Bb maj chords notes)
      const droneFreqs = [116.54, 174.61, 233.08, 293.66, 349.23];
      droneFreqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Add slightly detuned warmth chorus
        osc.detune.setValueAtTime((idx % 2 === 0 ? 8 : -8), this.ctx.currentTime);
        osc.connect(filter);
        this.oscillators.push(osc);
        osc.start();
      });

      // Ultra slow breathing sweep LFO
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.06, this.ctx.currentTime); // 16 seconds complete cycle

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(70, this.ctx.currentTime);

      this.lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.lfo.start();

      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Synthesizer blocked by autoplay policy or browser lack: ', e);
    }
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.gainNode && this.ctx) {
      try {
        const targetValue = mute ? 0 : 0.08;
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(targetValue, this.ctx.currentTime + 1.2);
      } catch (err) {}
    }
  }

  stop() {
    const list = this.oscillators;
    const l = this.lfo;
    const c = this.ctx;
    
    this.oscillators = [];
    this.lfo = null;
    this.ctx = null;
    this.gainNode = null;

    setTimeout(() => {
      list.forEach(o => {
        try { o.stop(); } catch (err) {}
      });
      if (l) {
        try { l.stop(); } catch (err) {}
      }
      if (c) {
        try { c.close(); } catch (err) {}
      }
    }, 1500);
  }
}
