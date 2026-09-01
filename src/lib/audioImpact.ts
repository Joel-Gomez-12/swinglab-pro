/* AudioImpactDetector — finds the sharp club–ball "click" inside the user's
   window. Uses an onset-strength (sudden high-frequency energy jump), NOT the
   loudest sample, so shouts/ambient noise don't win. Returns null if no audio. */
export type AudioImpact = { t: number; score: number } | null;

export function detectAudioImpact(audio: AudioBuffer, tStart: number, tEnd: number): AudioImpact {
  const sr = audio.sampleRate;
  if (!sr || !audio.length) return null;

  // mono mix
  const ch0 = audio.getChannelData(0);
  let data: Float32Array = ch0;
  if (audio.numberOfChannels > 1) {
    const ch1 = audio.getChannelData(1);
    data = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) data[i] = (ch0[i] + ch1[i]) * 0.5;
  }

  const hop = Math.max(64, Math.round(sr * 0.005)); // ~5 ms frames
  const nHops = Math.floor(data.length / hop);
  if (nHops < 4) return null;

  // high-pass via first difference → energy per frame (emphasises transients)
  const energy = new Float32Array(nHops);
  for (let k = 0; k < nHops; k++) {
    let e = 0; const base = k * hop;
    for (let i = 1; i < hop; i++) { const d = data[base + i] - data[base + i - 1]; e += d * d; }
    energy[k] = e;
  }

  const i0 = Math.max(1, Math.floor((tStart * sr) / hop));
  const i1 = Math.min(nHops - 1, Math.ceil((tEnd * sr) / hop));
  if (i1 <= i0) return null;

  let best = -1, bestVal = 0, sum = 0, cnt = 0;
  for (let k = i0; k <= i1; k++) {
    const onset = Math.max(0, energy[k] - energy[k - 1]); // positive energy jump
    sum += onset; cnt++;
    if (onset > bestVal) { bestVal = onset; best = k; }
  }
  if (best < 0 || bestVal <= 0) return null;

  const mean = sum / Math.max(1, cnt);
  const prominence = bestVal / (mean + 1e-9);      // how much the click stands out
  const score = Math.max(0, Math.min(100, (prominence - 1) * 12));
  return { t: (best * hop) / sr, score };
}
