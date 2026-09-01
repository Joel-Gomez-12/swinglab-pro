/* BallMotionDetector — best-effort. Watches a region around where the ball sits
   at address (below the hands, low in frame). When the ball leaves, that ROI
   shows a sharp localised motion spike; the frame just before it is the impact
   candidate. This is the least reliable signal, so it returns null unless the
   spike clearly stands out — the fusion engine then re-weights without it. */
import type { Frame, LM } from "./pose";

export type MotionImpact = { idx: number; t: number; score: number } | null;

export function detectBallImpact(frames: Frame[], i0: number, i1: number, addressLm: LM[] | null): MotionImpact {
  if (!addressLm || !addressLm[15] || !addressLm[16]) return null;
  const g0 = frames.find(f => f.gray)?.gray; if (!g0) return null;
  const W = g0.w, H = g0.h;

  // ROI around the ball: centred on the hands' x, spanning from hand height down.
  const cx = (addressLm[15].x + addressLm[16].x) / 2;
  const handY = (addressLm[15].y + addressLm[16].y) / 2;
  const x0 = Math.max(0, Math.floor((cx - 0.14) * W)), x1 = Math.min(W, Math.ceil((cx + 0.14) * W));
  const y0 = Math.max(0, Math.floor(Math.min(0.62, handY) * H)), y1 = Math.min(H, Math.ceil(0.99 * H));
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;

  const roiMotion = (a: Frame, b: Frame): number => {
    const ga = a.gray, gb = b.gray; if (!ga || !gb || ga.w !== W || gb.w !== W) return 0;
    let d = 0, c = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = y * W + x; d += Math.abs(ga.data[p] - gb.data[p]); c++; }
    return c ? d / c : 0;
  };

  const lo = Math.max(1, i0), hi = Math.min(frames.length - 1, i1);
  let best = -1, bestVal = 0, sum = 0, cnt = 0;
  for (let i = lo; i <= hi; i++) { const m = roiMotion(frames[i], frames[i - 1]); sum += m; cnt++; if (m > bestVal) { bestVal = m; best = i; } }
  if (best < 0 || bestVal <= 0) return null;
  const mean = sum / Math.max(1, cnt);
  const prom = bestVal / (mean + 1e-9);
  if (prom < 2.2) return null;                       // too weak → treat as "no ball signal"
  const score = Math.max(0, Math.min(100, (prom - 1) * 22));
  // impact is the instant just BEFORE the ball departs
  return { idx: Math.max(lo, best - 1), t: frames[Math.max(lo, best - 1)].t, score };
}
