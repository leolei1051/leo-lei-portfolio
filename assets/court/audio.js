// Leo's Court — synthesized sound effects (no audio assets, no licensing).
// Default: OFF. AudioContext is created only after the user opts in.
export function createCourtAudio() {
  let ctx = null;
  let enabled = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Short filtered noise burst — reads like a paddle "pop".
  function playHit() {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    const dur = 0.09;
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(now);
  }

  function setEnabled(on) {
    enabled = on;
    if (on) ensure();
  }

  return {
    get enabled() { return enabled; },
    setEnabled,
    playHit,
  };
}
