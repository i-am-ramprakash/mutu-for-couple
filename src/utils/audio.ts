/**
 * Pure Web Audio API synthesized sweet sounds for MuTu.
 * This guarantees audio works instantly without needing external assets or network.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended (browser security autostart policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 1. Gentle high bell chime for incoming messages
 */
export function playSweetMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Note 1: E5 (659.25 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659.25, now);
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.8);

  // Note 2: B5 (987.77 Hz) slightly delayed
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(987.77, now + 0.1);
  gain2.gain.setValueAtTime(0.0, now);
  gain2.gain.setValueAtTime(0.1, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.9);

  // Note 3: E6 (1318.51 Hz) slightly delayed
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(1318.51, now + 0.2);
  gain3.gain.setValueAtTime(0.0, now);
  gain3.gain.setValueAtTime(0.08, now + 0.2);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now + 0.2);
  osc3.stop(now + 1.2);
}

/**
 * 2. Rapid upward twinkle stars for received sparks
 */
export function playSweetSparkSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6

  notes.forEach((freq, idx) => {
    const time = now + idx * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Triangle wave has a sweet wooden bell acoustic quality
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.4);
  });
}

/**
 * 3. Soft warm romantic heartbeat sound for cuddles and hug notifications
 */
export function playSweetHeartbeat() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First thud
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(60, now); // soft low Frequency
  osc1.frequency.exponentialRampToValueAtTime(10, now + 0.15); // slide down
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.linearRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.16);

  // Second thud (like a real lub-dub heartbeat, 120ms later)
  const delay = 0.15;
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(55, now + delay);
  osc2.frequency.exponentialRampToValueAtTime(10, now + delay + 0.18);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.35, now + delay);
  gain2.gain.linearRampToValueAtTime(0.01, now + delay + 0.18);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + delay);
  osc2.stop(now + delay + 0.19);
}

/**
 * 4. Harmonized warm melody for sleep mode transitions (Lullaby start)
 */
export function playSweetLullaby() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [349.23, 440.00, 523.25, 659.25, 523.25, 440.00]; // F4, A4, C5, E5... slow arpeggio

  notes.forEach((freq, idx) => {
    const time = now + idx * 0.3;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(time);
    osc.stop(time + 1.2);
  });
}

/**
 * 5. Morning bird chirp / sweet wake-up notification sound
 */
export function playBirdChirp() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const burstTime = now + i * 0.25;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Frequency sweeps upward extremely quickly, sounding like a bird tweet
    osc.frequency.setValueAtTime(2000, burstTime);
    osc.frequency.exponentialRampToValueAtTime(4500, burstTime + 0.12);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.04, burstTime);
    gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(burstTime);
    osc.stop(burstTime + 0.12);
  }
}
