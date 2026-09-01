/* ImpactFusionEngine — combines the audio, club-motion and ball-motion signals
   (each with its own 0..100 confidence) into a single impact estimate. Missing
   signals are dropped and the weights renormalised. Because a 30 fps clip may
   not contain the exact contact frame, it returns frameBefore / estimated /
   frameAfter and an impactBetweenFrames flag. */
import { frameIndexAtTime, type Frame } from "./pose";
import { getWeights, type FusionWeights } from "./config";

export type Signal = { t: number; score: number } | null;

export type ImpactResult = {
  t: number;
  estimatedImpactFrame: number;
  frameBeforeImpact: number;
  frameAfterImpact: number;
  impactBetweenFrames: boolean;
  impactConfidenceScore: number;
  breakdown: { audio: number | null; club: number | null; ball: number | null };
  weights: { audio: number; club: number; ball: number };
};

export function fuseImpact(
  frames: Frame[],
  signals: { audio: Signal; club: Signal; ball: Signal },
  fallbackT: number,   // pose-based "hands return to ball" estimate
): ImpactResult {
  const BASE = getWeights(); // runtime-configurable (spec point 4)
  const present: { name: keyof FusionWeights; t: number; score: number; w: number }[] = [];
  (["audio", "club", "ball"] as const).forEach((name) => {
    const s = signals[name];
    if (s && s.score > 0) present.push({ name, t: s.t, score: s.score, w: BASE[name] });
  });

  let fusedT = fallbackT;
  let confidence = 0;
  const weights = { audio: 0, club: 0, ball: 0 };

  if (present.length) {
    // renormalise reported weights across available signals
    const wSum = present.reduce((a, p) => a + p.w, 0) || 1;
    present.forEach((p) => { weights[p.name] = p.w / wSum; });

    // anchor on the strongest (weight × confidence) signal, keep those that agree
    const scored = present.map((p) => ({ ...p, v: p.w * (p.score / 100) }));
    scored.sort((a, b) => b.v - a.v);
    const anchor = scored[0];
    const agree = scored.filter((p) => Math.abs(p.t - anchor.t) <= 0.15);
    const num = agree.reduce((a, p) => a + p.v * p.t, 0);
    const den = agree.reduce((a, p) => a + p.v, 0) || 1;
    fusedT = num / den;

    // confidence = weighted average confidence of the agreeing signals (0..100)
    const cW = agree.reduce((a, p) => a + p.w, 0) || 1;
    confidence = Math.round(agree.reduce((a, p) => a + p.w * p.score, 0) / cW);
  }

  const br = frameBracket(frames, fusedT);

  return {
    t: fusedT,
    estimatedImpactFrame: br.estimatedImpactFrame,
    frameBeforeImpact: br.frameBeforeImpact,
    frameAfterImpact: br.frameAfterImpact,
    impactBetweenFrames: br.impactBetweenFrames,
    impactConfidenceScore: confidence,
    breakdown: {
      audio: signals.audio ? Math.round(signals.audio.score) : null,
      club: signals.club ? Math.round(signals.club.score) : null,
      ball: signals.ball ? Math.round(signals.ball.score) : null,
    },
    weights,
  };
}

/* Fallback pose estimate: index of the frame closest to a time. */
export function frameAt(frames: Frame[], t: number): number { return frameIndexAtTime(frames, t); }

/* Given a time, find the bracketing frames + whether impact falls between two
   frames (a 30 fps clip may not hold the exact contact frame). */
export function frameBracket(frames: Frame[], t: number) {
  const n = frames.length;
  let iA = 0;
  for (let i = 0; i < n - 1; i++) { if (frames[i].t <= t && frames[i + 1].t >= t) { iA = i; break; } if (frames[i].t > t) { iA = Math.max(0, i - 1); break; } iA = i; }
  const iB = Math.min(n - 1, iA + 1);
  const dA = Math.abs(frames[iA].t - t), dB = Math.abs(frames[iB].t - t);
  const estimated = dA <= dB ? iA : iB;
  const gap = Math.max(1e-6, frames[iB].t - frames[iA].t);
  const between = iB !== iA && Math.min(dA, dB) > gap * 0.3;
  return { estimatedImpactFrame: estimated, frameBeforeImpact: Math.max(0, estimated - 1), frameAfterImpact: Math.min(n - 1, estimated + 1), impactBetweenFrames: between };
}
