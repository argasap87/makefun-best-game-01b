// audio.js — every sound in ORBITAL DECAY is synthesized with WebAudio.
// No audio files are shipped; nothing is loaded over the network.

let ctx = null;
let muted = false;
let humNodes = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Call once from the first user gesture so the browser allows sound.
export function unlockAudio() {
  ensureCtx();
  startHum();
}

export function toggleMute() {
  muted = !muted;
  if (humNodes) humNodes.gain.gain.value = muted ? 0 : 0.035;
  return muted;
}

export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol, lowpass) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass || 1200;
  const g = c.createGain();
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

export function playShoot() { tone(880, 0.08, 'square', 0.05, 220); }
export function playHit() { noise(0.12, 0.16, 900); tone(160, 0.12, 'sawtooth', 0.08, 60); }
export function playExplosion() { noise(0.45, 0.28, 700); tone(90, 0.4, 'sawtooth', 0.12, 30); }
export function playPickup() { tone(660, 0.09, 'sine', 0.1); setTimeout(() => tone(990, 0.12, 'sine', 0.1), 70); }
export function playShift() { tone(180, 0.25, 'sine', 0.12, 720); noise(0.18, 0.06, 2400); }
export function playWaveClear() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 90));
}
export function playUpgrade() {
  [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 70));
}
export function playHurt() { tone(220, 0.25, 'sawtooth', 0.16, 55); noise(0.2, 0.14, 500); }
export function playGameOver() {
  [440, 349, 294, 220].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.12), i * 160));
}
export function playClick() { tone(1200, 0.05, 'sine', 0.06); }

// A low ambient hum whose pitch follows the player's orbital radius.
function startHum() {
  if (humNodes || muted) return;
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  lfo.type = 'sine';
  lfo.frequency.value = 0.4;
  lfoGain.gain.value = 6;
  gain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(c.destination);
  osc.start();
  lfo.start();
  humNodes = { osc, gain };
}

export function setHumFromRadius(r) {
  if (!humNodes) return;
  // Closer to the singularity: higher, tenser hum.
  const f = 55 + Math.max(0, 320 - r) * 0.25;
  humNodes.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.2);
}
