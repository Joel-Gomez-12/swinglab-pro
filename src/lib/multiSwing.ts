/* Multi-swing segmentation (V3 "session"): finds EACH swing in a long clip so
   the user can hit 10–50 balls in one recording and get Swing 1, 2, 3… Each
   swing is a burst of hand motion; its impact is the lowest-hands frame just
   after the top. All in-browser. */
import { frameIndexAtTime, type Frame } from "./pose";

/* Returns the impact frame index of every detected swing, in time order. */
export function detectSwings(frames: Frame[]): number[] {
  const n = frames.length; if (n < 8) return [];
  const wy = frames.map((f) => (f.lm[15].y + f.lm[16].y) / 2);
  const wx = frames.map((f) => (f.lm[15].x + f.lm[16].x) / 2);

  const mot = new Array(n).fill(0);
  for (let i = 1; i < n; i++) mot[i] = Math.abs(wy[i] - wy[i - 1]) + Math.abs(wx[i] - wx[i - 1]);
  const en = mot.map((_, i) => { let s = 0, c = 0; for (let j = -2; j <= 2; j++) { const k = i + j; if (k >= 0 && k < n) { s += mot[k]; c++; } } return s / c; });
  let mx = 0; for (const v of en) if (v > mx) mx = v; if (!mx) return [];
  const thr = mx * 0.22;

  // active motion regions
  const regions: [number, number][] = [];
  let inR = false, rs = 0;
  for (let i = 0; i < n; i++) {
    if (en[i] > thr) { if (!inR) { inR = true; rs = i; } }
    else if (inR) { inR = false; regions.push([rs, i - 1]); }
  }
  if (inR) regions.push([rs, n - 1]);

  // merge regions <0.7 s apart (same swing), drop bursts shorter than 0.3 s
  const merged: [number, number][] = [];
  for (const r of regions) {
    const last = merged[merged.length - 1];
    if (last && frames[r[0]].t - frames[last[1]].t < 0.7) { last[1] = r[1]; continue; }
    merged.push([r[0], r[1]]);
  }
  const swings = merged.filter((r) => frames[r[1]].t - frames[r[0]].t >= 0.3);

  // impact per swing = lowest hands within 0.7 s after that swing's top
  const impacts: number[] = [];
  for (const [a, b] of swings) {
    let top = a; for (let i = a; i <= b; i++) if (wy[i] < wy[top]) top = i;
    const hi = frameIndexAtTime(frames, frames[top].t + 0.7);
    let imp = top; for (let i = top; i <= Math.min(b, hi); i++) if (wy[i] > wy[imp]) imp = i;
    impacts.push(imp);
  }

  // dedupe impacts closer than 1.5 s
  const out: number[] = [];
  for (const idx of impacts) if (!out.length || frames[idx].t - frames[out[out.length - 1]].t > 1.5) out.push(idx);
  return out;
}
