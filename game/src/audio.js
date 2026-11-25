// audio.js — WebAudio synth sounds + mute. No audio files.
let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function audioCtx() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.12, freq = 1200) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
}

export const sfx = {
  chop() { noise(0.07, 0.2, 2500); tone(180, 0.06, 'square', 0.06); },
  pickup() { tone(520, 0.08, 'sine', 0.12, 760); },
  place() { tone(340, 0.08, 'sine', 0.12, 260); },
  sizzle() { noise(0.35, 0.1, 5000); },
  crackle() { noise(0.2, 0.09, 1800); },
  serve() { tone(660, 0.12, 'sine', 0.16); setTimeout(() => tone(880, 0.18, 'sine', 0.16), 90); },
  perfect() { tone(880, 0.1, 'sine', 0.16); setTimeout(() => tone(1174, 0.2, 'sine', 0.16), 80); },
  error() { tone(160, 0.18, 'sawtooth', 0.1, 110); },
  burn() { noise(0.4, 0.14, 700); tone(90, 0.3, 'sawtooth', 0.08, 60); },
  rush() { tone(440, 0.15, 'square', 0.12, 660); setTimeout(() => tone(660, 0.15, 'square', 0.12, 880), 130); },
  click() { tone(700, 0.05, 'sine', 0.1); },
  coin() { tone(990, 0.08, 'sine', 0.14); setTimeout(() => tone(1320, 0.14, 'sine', 0.14), 70); },
};
