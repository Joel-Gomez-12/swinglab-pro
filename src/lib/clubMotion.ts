/* ClubMotionDetector — the club is fastest at impact, so the frame-to-frame
   image difference spikes sharply there. We look for the sharpest spike inside
   the window. Works on the small grayscale buffers captured per frame. */
import type { Frame } from "./pose";

export type MotionImpact = { idx: number; t: number; score: number } | null;

/* Block-based motion: split each frame into a grid and take the MOST-changed
   block between consecutive frames. The club is small and very fast, so it lights
   up a single block, while body motion is spread out — this isolates the club
   far better than a whole-frame average (a coarse optical-flow proxy). */
export function clubMotionSeries(frames: Frame[]): number[] {
  const n = frames.length; const s = new Array(n).fill(0);
  const g0 = frames.find((f) => f.gray)?.gray; if (!g0) return s;
  const W = g0.w, H = g0.h, BC = 4, BR = 5;
  for (let i = 1; i < n; i++) {
    const a = frames[i].gray, b = frames[i - 1].gray;
    if (!a || !b || a.w !== W || a.data.length !== b.data.length) { s[i] = 0; continue; }
    let maxBlock = 0;
    for (let by = 0; by < BR; by++) for (let bx = 0; bx < BC; bx++) {
      const x0 = Math.floor(bx * W / BC), x1 = Math.floor((bx + 1) * W / BC);
      const y0 = Math.floor(by * H / BR), y1 = Math.floor((by + 1) * H / BR);
      let d = 0, c = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = y * W + x; d += Math.abs(a.data[p] - b.data[p]); c++; }
      const m = c ? d / c : 0; if (m > maxBlock) maxBlock = m;
    }
    s[i] = maxBlock;
  }
  return s;
}

export function detectClubImpact(frames: Frame[], series: number[], i0: number, i1: number): MotionImpact {
  const lo = Math.max(1, i0), hi = Math.min(frames.length - 1, i1);
  let best = -1, bestVal = 0, sum = 0, cnt = 0;
  for (let i = lo; i <= hi; i++) { sum += series[i]; cnt++; if (series[i] > bestVal) { bestVal = series[i]; best = i; } }
  if (best < 0 || bestVal <= 0) return null;
  const mean = sum / Math.max(1, cnt);
  const prom = bestVal / (mean + 1e-9);
  const score = Math.max(0, Math.min(100, (prom - 1) * 30));
  return { idx: best, t: frames[best].t, score };
}
