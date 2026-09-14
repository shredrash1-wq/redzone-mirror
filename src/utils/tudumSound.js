// Web Audio API Synthesizer for the authentic cinematic Netflix-style "Ta-Dum" sound
// Generates deep sub-bass impact, dual percussive transients, and a warm resonant ambient swell

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playTudumSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.9, now);
    masterGain.connect(ctx.destination);

    // ── 1. The Deep Sub-Bass Thud ("Ta") at now + 0.05s ──────────────
    const subOsc1 = ctx.createOscillator();
    const subGain1 = ctx.createGain();
    subOsc1.type = "sine";
    subOsc1.frequency.setValueAtTime(95, now + 0.05);
    subOsc1.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    subGain1.gain.setValueAtTime(0.001, now);
    subGain1.gain.setValueAtTime(0.85, now + 0.05);
    subGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc1.connect(subGain1);
    subGain1.connect(masterGain);
    subOsc1.start(now + 0.05);
    subOsc1.stop(now + 0.6);

    // ── 2. The Primary Heavy Impact ("DUM!") at now + 0.28s ──────────
    const subOsc2 = ctx.createOscillator();
    const subGain2 = ctx.createGain();
    subOsc2.type = "sine";
    subOsc2.frequency.setValueAtTime(115, now + 0.28);
    subOsc2.frequency.exponentialRampToValueAtTime(38, now + 0.75);

    subGain2.gain.setValueAtTime(0.001, now);
    subGain2.gain.setValueAtTime(1.0, now + 0.28);
    subGain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc2.connect(subGain2);
    subGain2.connect(masterGain);
    subOsc2.start(now + 0.28);
    subOsc2.stop(now + 1.25);

    // ── 3. Anvil / Metallic Transient Click for the cinematic snap ─────
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = "bandpass";
    clickFilter.frequency.setValueAtTime(1800, now);
    clickFilter.Q.setValueAtTime(3, now);

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(320, now + 0.28);
    clickGain.gain.setValueAtTime(0.001, now);
    clickGain.gain.setValueAtTime(0.4, now + 0.28);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterGain);
    clickOsc.start(now + 0.28);
    clickOsc.stop(now + 0.5);

    // ── 4. Warm Cello / Ambient Resonant Swell (F - A - D chord) ────────
    const chordNotes = [
      { freq: 146.83, delay: 0.28, duration: 2.8, gain: 0.32 }, // D3
      { freq: 220.0, delay: 0.32, duration: 2.6, gain: 0.28 },  // A3
      { freq: 293.66, delay: 0.35, duration: 2.7, gain: 0.22 }, // D4
      { freq: 349.23, delay: 0.38, duration: 2.4, gain: 0.18 }, // F4
    ];

    chordNotes.forEach(({ freq, delay, duration, gain: targetGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + delay);

      // Lowpass filter creates warm, non-harsh cinematic texture
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now + delay);
      filter.frequency.exponentialRampToValueAtTime(1200, now + delay + 0.8);
      filter.frequency.exponentialRampToValueAtTime(200, now + delay + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(targetGain, now + delay + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });

    // ── 5. Shimmering High Harmonic Chime ─────────────────────────────
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = "sine";
    chimeOsc.frequency.setValueAtTime(880, now + 0.35); // A5
    chimeOsc.frequency.exponentialRampToValueAtTime(885, now + 2.5);

    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.08, now + 0.6);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(masterGain);
    chimeOsc.start(now + 0.35);
    chimeOsc.stop(now + 2.6);
  } catch (err) {
    console.warn("Could not play Netflix Tudum sound:", err);
  }
}
