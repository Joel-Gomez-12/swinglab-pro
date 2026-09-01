/* MediaPipe pose detection + swing analysis. All pose work runs in the browser;
   nothing is uploaded. Ported verbatim from the original SwingLab-Pro logic. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

export type LM = { x: number; y: number; z?: number; visibility?: number };
export type Gray = { data: Uint8ClampedArray; w: number; h: number };
export type Frame = { t: number; lm: LM[]; thumb: Thumb | null; gray?: Gray | null };
export type Thumb = { img: string; w: number; h: number };
export type View = "front" | "dtl";

export type StoryItem = {
  thumb: string | null;
  iw: number;
  ih: number;
  marks: any[];
  anchor: number[] | null;
  pill: string;
  _key: string;
  _i: number;
  _idx: number;   // source frame index in the analyzed subset (for manual nudging)
  _warn: 0 | 1;
  ref: { hx: number; hy: number; r: number } | null;
};

/* Everything needed to recompute a single phase when the user nudges it. */
export type AnalysisCtx = {
  frames: Frame[];
  A: Record<number, LM>;
  SM: any;
  view: View;
  lang: string;
  refOK: boolean;
};

/* ---- MediaPipe loading (wasm from CDN, model from Google storage) ------- */
let landmarker: PoseLandmarker | null = null;
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export async function initPose(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  return landmarker;
}
export function getLandmarker() { return landmarker; }

/* ---- math helpers ----------------------------------------------------- */
export function ang(a: LM, b: LM, c: LM) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1e-6);
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
}
export function mid(a: LM, b: LM): LM { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
export function clampn(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function smoothAt(frames: Frame[], idx: number): Record<number, LM> {
  const n = frames.length;
  const ids = [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24, 25, 26, 27, 28, 31, 32];
  const acc: any = {}; ids.forEach(i => acc[i] = { x: 0, y: 0, z: 0, w: 0 });
  let cnt = 0;
  for (let d = -2; d <= 2; d++) {
    const k = idx + d; if (k < 0 || k >= n) continue;
    const lm = frames[k].lm; if (!lm) continue;
    ids.forEach(i => { if (!lm[i]) return; const w = (lm[i].visibility != null ? lm[i].visibility! : 1) + 0.05; acc[i].x += lm[i].x * w; acc[i].y += lm[i].y * w; acc[i].z += (lm[i].z || 0) * w; acc[i].w += w; });
    cnt++;
  }
  const out: any = {};
  ids.forEach(i => { const a = acc[i]; out[i] = a.w > 0 ? { x: a.x / a.w, y: a.y / a.w, z: a.z / a.w, visibility: a.w / Math.max(1, cnt) } : { x: .5, y: .5, z: 0, visibility: 0 }; });
  return out;
}
function buildSideMap(A: any) {
  const leftIsScreenLeft = A[11].x <= A[12].x;
  const Larm = leftIsScreenLeft ? { sh: 11, el: 13, wr: 15, hd: 19 } : { sh: 12, el: 14, wr: 16, hd: 20 };
  const Rarm = leftIsScreenLeft ? { sh: 12, el: 14, wr: 16, hd: 20 } : { sh: 11, el: 13, wr: 15, hd: 19 };
  const llIsLeft = A[23].x <= A[24].x;
  const Lleg = llIsLeft ? { hip: 23, kn: 25, an: 27, ft: 31 } : { hip: 24, kn: 26, an: 28, ft: 32 };
  const Rleg = llIsLeft ? { hip: 24, kn: 26, an: 28, ft: 32 } : { hip: 23, kn: 25, an: 27, ft: 31 };
  return { Larm, Rarm, Lleg, Rleg };
}
function elbowAng(lm: any, a: any) { return ang(lm[a.sh], lm[a.el], lm[a.wr]); }

function checkPhase8(k: number, lm: any, A: any, SM: any) {
  const eL = elbowAng(lm, SM.Larm), eR = elbowAng(lm, SM.Rarm);
  // The LEAD arm (the straighter of the two) should stay extended; the TRAIL
  // arm folds naturally in the backswing, so judging the most-bent arm gave
  // false "arm bends" flags. Judge the straighter arm instead.
  const lead = eL >= eR ? { a: eL, f: 'L' } : { a: eR, f: 'R' };
  if (k === 0) return { key: 'ok_address', parts: [] };
  if (k === 1) return { key: 'ok_take', parts: [] };
  if (k === 2) return lead.a < 138 ? { key: 'arms_early', parts: ['foreArm' + lead.f] } : { key: 'ok_mid', parts: [] };
  if (k === 3) return lead.a < 138 ? { key: 'arms_top', parts: ['foreArm' + lead.f] } : { key: 'ok_top', parts: [] };
  if (k === 4) return Math.abs(lm[0].x - A[0].x) > 0.06 ? { key: 'head_down', parts: ['head'] } : { key: 'ok_head', parts: [] };
  if (k === 5) { if ((A[0].y - lm[0].y) > 0.045) return { key: 'spine_ext', parts: ['torso'] }; if (Math.abs(lm[0].x - A[0].x) > 0.08) return { key: 'head_impact', parts: ['head'] }; return { key: 'ok_impact', parts: [] }; }
  if (k === 6) return lead.a < 138 ? { key: 'lose_ext', parts: ['foreArm' + lead.f] } : { key: 'ok_release', parts: [] };
  if (Math.abs(lm[0].x - A[0].x) > 0.13) return { key: 'legs_back', parts: ['thighL', 'thighR'] };
  return { key: 'ok_finish', parts: [] };
}
function spineTilt(lm: any) { const hp = mid(lm[23], lm[24]), sh = mid(lm[11], lm[12]); return Math.atan2(Math.abs(sh.x - hp.x), Math.abs(sh.y - hp.y)) * 180 / Math.PI; }
function checkPhase8DTL(k: number, lm: any, A: any) {
  const tA = spineTilt(A), tN = spineTilt(lm); const headUp = (A[0].y - lm[0].y);
  if (k === 4) { if (headUp > 0.05) return { key: "head_down", parts: ["head"] }; if (tA - tN > 9) return { key: "spine_ext", parts: ["torso"] }; return { key: "ok_head", parts: [] }; }
  if (k === 5) { if (tA - tN > 8) return { key: "spine_ext", parts: ["torso"] }; if (headUp > 0.045) return { key: "head_impact", parts: ["head"] }; return { key: "ok_impact", parts: [] }; }
  if (k === 6) { if (tA - tN > 9) return { key: "spine_ext", parts: ["torso"] }; return { key: "ok_release", parts: [] }; }
  if (k === 0) return { key: "ok_address", parts: [] }; if (k === 1) return { key: "ok_take", parts: [] }; if (k === 2) return { key: "ok_mid", parts: [] }; if (k === 3) return { key: "ok_top", parts: [] };
  return { key: "ok_finish", parts: [] };
}

/* ---- thumbnails + fault overlay resolution ---------------------------- */
let _thumbCv: HTMLCanvasElement | null = null;
export function grabThumb(v: HTMLVideoElement): Thumb | null {
  try {
    const vw = v.videoWidth || (v as any).width, vh = v.videoHeight || (v as any).height; if (!vw || !vh) return null;
    const W = 360, H = Math.round(W * vh / vw);
    if (!_thumbCv) _thumbCv = document.createElement('canvas');
    _thumbCv.width = W; _thumbCv.height = H;
    const g = _thumbCv.getContext('2d')!; g.drawImage(v, 0, 0, W, H);
    return { img: _thumbCv.toDataURL('image/jpeg', 0.72), w: W, h: H };
  } catch (e) { return null; }
}
function resolveOverlay(parts: string[], lm: any, SM: any) {
  const marks: any[] = []; let anchor: any = null; const sw = Math.abs(lm[11].x - lm[12].x) || 0.16;
  parts.forEach(pt => {
    if (pt === 'head') { const n = lm[0]; marks.push({ t: 'ring', c: [n.x, n.y], r: Math.max(0.06, sw * 0.55) }); if (!anchor) anchor = [n.x + sw * 0.9, n.y - 0.04]; }
    else if (pt === 'torso') { const h = mid(lm[23], lm[24]), s = mid(lm[11], lm[12]); marks.push({ t: 'line', a: [h.x, h.y], b: [s.x, s.y] }); if (!anchor) anchor = [s.x + sw * 0.7, s.y]; }
    else if (pt.indexOf('foreArm') === 0) { const arm = pt.slice(-1) === 'L' ? SM.Larm : SM.Rarm; marks.push({ t: 'line', a: [lm[arm.el].x, lm[arm.el].y], b: [lm[arm.wr].x, lm[arm.wr].y] }); if (!anchor) anchor = [lm[arm.wr].x + (pt.slice(-1) === 'L' ? -sw * 0.5 : sw * 0.5), lm[arm.wr].y - 0.02]; }
    else if (pt.indexOf('upperArm') === 0) { const arm = pt.slice(-1) === 'L' ? SM.Larm : SM.Rarm; marks.push({ t: 'line', a: [lm[arm.sh].x, lm[arm.sh].y], b: [lm[arm.el].x, lm[arm.el].y] }); if (!anchor) anchor = [lm[arm.el].x, lm[arm.el].y - 0.03]; }
    else if (pt.indexOf('hand') === 0) { const arm = pt.slice(-1) === 'L' ? SM.Larm : SM.Rarm; marks.push({ t: 'ring', c: [lm[arm.wr].x, lm[arm.wr].y], r: Math.max(0.045, sw * 0.4) }); if (!anchor) anchor = [lm[arm.wr].x, lm[arm.wr].y - 0.06]; }
    else if (pt.indexOf('thigh') === 0) { const leg = pt.slice(-1) === 'L' ? SM.Lleg : SM.Rleg; marks.push({ t: 'line', a: [lm[leg.hip].x, lm[leg.hip].y], b: [lm[leg.kn].x, lm[leg.kn].y] }); if (!anchor) anchor = [lm[leg.kn].x, lm[leg.kn].y]; }
  });
  return { marks, anchor };
}

/* ---- swing-range detection (shared by auto + window selector) ---------- */
/* Returns [startIdx, endIdx]: the active swing region by hand-motion energy. */
export function detectSwingRange(frames: Frame[]): [number, number] {
  const n = frames.length;
  if (n < 2) return [0, Math.max(0, n - 1)];
  const wy = frames.map(f => (f.lm[15].y + f.lm[16].y) / 2);
  const wx = frames.map(f => (f.lm[15].x + f.lm[16].x) / 2);
  const mot = [0]; for (let i = 1; i < n; i++) mot.push(Math.abs(wy[i] - wy[i - 1]) + Math.abs(wx[i] - wx[i - 1]));
  const sm = mot.map((_, i) => { let s = 0, c = 0; for (let j = -2; j <= 2; j++) { const k = i + j; if (k >= 0 && k < n) { s += mot[k]; c++; } } return s / c; });
  const mx = Math.max.apply(null, sm) || 1; const thr = mx * 0.18;
  let s = 0, e = n - 1;
  for (let i = 0; i < n; i++) { if (sm[i] > thr) { s = i; break; } }
  for (let i = n - 1; i >= 0; i--) { if (sm[i] > thr) { e = i; break; } }
  const padd = Math.round((e - s) * 0.06); s = Math.max(0, s - padd); e = Math.min(n - 1, e + padd);
  if (e - s < 7) { s = 0; e = n - 1; }
  return [s, e];
}

/* Auto swing window as [tStart, tEnd] in the frames' own time units. */
export function autoWindowTimes(frames: Frame[]): [number, number] {
  if (!frames.length) return [0, 0];
  const [s, e] = detectSwingRange(frames);
  return [frames[s].t, frames[e].t];
}

/* Default impact time by POSTURE over the whole clip: find the swing, its top
   (highest hands) and then the lowest-hands frame after the top (hands back at
   the ball). Robust to the wrist-occlusion glitches at the top that fooled a
   pure "fastest hand motion" estimate and left the analysis window up high. */
/* Impact frame within [s,e] by a physical signature no other moment shares: the
   hands are LOW (at the ball) AND moving FAST. Top/finish have high hands (out),
   address has low but slow hands (out), and top-occlusion glitches are filtered
   because they happen with the hands HIGH. Robust to backswing length & angle. */
export function impactIndex(frames: Frame[], s: number, e: number): number {
  const n = frames.length; s = Math.max(0, s); e = Math.min(n - 1, e); if (e <= s) return Math.max(0, e);
  const raw = frames.map(f => (f.lm[15].y + f.lm[16].y) / 2);
  const wx = frames.map(f => (f.lm[15].x + f.lm[16].x) / 2);
  const wy = raw.map((_, i) => { let a = 0, c = 0; for (let j = -1; j <= 1; j++) { const k = i + j; if (k >= 0 && k < n) { a += raw[k]; c++; } } return a / c; });
  const vals: number[] = []; for (let i = s; i <= e; i++) vals.push(wy[i]);
  vals.sort((a, b) => a - b);
  const thr = vals[Math.floor(vals.length * 0.55)]; // hands in the lower part of the frame
  let imp = -1, best = -1;
  for (let i = s + 1; i <= e; i++) {
    if (wy[i] < thr) continue;                       // hands not low enough → skip
    const sp = Math.abs(wy[i] - wy[i - 1]) + Math.abs(wx[i] - wx[i - 1]);
    if (sp > best) { best = sp; imp = i; }
  }
  if (imp < 0) { imp = s; for (let i = s; i <= e; i++) if (wy[i] > wy[imp]) imp = i; }
  return imp;
}

export function autoImpactTime(frames: Frame[]): number {
  const n = frames.length; if (n < 3) return frames[0]?.t || 0;
  const [s, e] = detectSwingRange(frames);
  return frames[impactIndex(frames, s, e)].t;
}
/* Keep only the frames whose timestamp falls inside [tStart, tEnd]. */
export function sliceFramesByTime(frames: Frame[], tStart: number, tEnd: number): Frame[] {
  return frames.filter(f => f.t >= tStart - 1e-6 && f.t <= tEnd + 1e-6);
}
/* Index of the frame closest to time t (for scrubbing/preview). */
export function frameIndexAtTime(frames: Frame[], t: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < frames.length; i++) { const d = Math.abs(frames[i].t - t); if (d < bd) { bd = d; best = i; } }
  return best;
}

/* Visibility of a landmark (MediaPipe gives 0..1; default to 1 if absent). */
function vis(lm: LM | undefined): number { return lm && lm.visibility != null ? lm.visibility : 1; }

/* Highest VISIBLE arm point per frame (min y among wrists+elbows weighted by
   visibility). Robust to the wrists being occluded behind the head at the top:
   the elbows carry the apex so "top" no longer lands early. */
function armApexY(lm: LM[]): number {
  const pts = [15, 16, 13, 14]; let best = Infinity;
  for (const i of pts) { const p = lm[i]; if (!p) continue; if (vis(p) < 0.4) continue; if (p.y < best) best = p.y; }
  if (best === Infinity) { // everything occluded → fall back to raw wrists
    best = Math.min(lm[15]?.y ?? 1, lm[16]?.y ?? 1);
  }
  return best;
}

/* smoothed hand-motion energy over the frames (for finish settling). */
function motionEnergy(frames: Frame[]): number[] {
  const n = frames.length;
  const wy = frames.map(f => (f.lm[15].y + f.lm[16].y) / 2);
  const wx = frames.map(f => (f.lm[15].x + f.lm[16].x) / 2);
  const mot = [0]; for (let i = 1; i < n; i++) mot.push(Math.abs(wy[i] - wy[i - 1]) + Math.abs(wx[i] - wx[i - 1]));
  return mot.map((_, i) => { let s = 0, c = 0; for (let j = -2; j <= 2; j++) { const k = i + j; if (k >= 0 && k < n) { s += mot[k]; c++; } } return s / c; });
}

/* Detection quality of a frame = avg visibility of the key body landmarks. */
function landmarkQuality(lm: LM[]): number {
  const key = [0, 11, 12, 23, 24, 15, 16];
  let sum = 0, c = 0;
  for (const i of key) { const p = lm[i]; if (p) { sum += vis(p); c++; } }
  return c ? sum / c : 0;
}
/* Pick the BEST-detected frame in the first part of the swing as the address
   reference — never a blindly-chosen frame 0 whose pose may be garbage. */
function pickAddressIndex(frames: Frame[], s: number, e: number): number {
  const lim = Math.min(e, s + Math.max(1, Math.round((e - s) * 0.4)));
  let best = s, bq = -1;
  for (let i = s; i <= lim; i++) { const q = landmarkQuality(frames[i].lm); if (q > bq) { bq = q; best = i; } }
  return best;
}
/* Is the address reference trustworthy enough to draw the head circle + plumb? */
function refTrustworthy(A: Record<number, LM>): boolean {
  return vis(A[0]) >= 0.5 && vis(A[11]) >= 0.4 && vis(A[12]) >= 0.4;
}

/* True when the head OR the torso isn't reliably in frame at this instant — we
   then refuse to assert any fault (better "no te veo" than 4 false faults). */
function frameLowConfidence(lm: LM[]): boolean {
  const inb = (p: LM | undefined) => !!p && p.x > 0.02 && p.x < 0.98 && p.y > 0.02 && p.y < 0.98;
  const headOK = inb(lm[0]) && vis(lm[0]) >= 0.3;
  const torsoOK = (inb(lm[11]) || inb(lm[12])) && (inb(lm[23]) || inb(lm[24]));
  return !headOK || !torsoOK;
}

/* ---- the swing analysis: detect anchors + build the 8 phase items ----- */
/* opts.manual = true → treat the WHOLE frame set as the swing (used after the
   user picks the window); otherwise auto-detect the active region. */
export function analyzeSwing(frames: Frame[], VIEW: View, LANG: string, PILL: any, opts: { manual?: boolean } = {}): { items: StoryItem[]; ctx: AnalysisCtx } {
  const n = frames.length;
  const wy = frames.map(f => (f.lm[15].y + f.lm[16].y) / 2);
  const wx = frames.map(f => (f.lm[15].x + f.lm[16].x) / 2);
  const apex = frames.map(f => armApexY(f.lm));
  let s: number, e: number;
  if (opts.manual) { s = 0; e = n - 1; } else { const r = detectSwingRange(frames); s = r[0]; e = r[1]; }

  // Robust address reference: best-detected frame in the first 40% of the swing.
  const a0 = pickAddressIndex(frames, s, e);

  // (1) TOP by hand reversal, using the highest VISIBLE arm point (apex) so
  //     occluded wrists don't make the top land early.
  let top = s; for (let i = s; i <= e; i++) if (apex[i] < apex[top]) top = i;
  // refine to the true reversal: extend to the LAST frame still near the apex,
  // tolerating up to 2 frames where the arms hide behind the head (occlusion
  // spikes) so the top no longer lands early.
  { const band = apex[top] + (apex[s] - apex[top]) * 0.06; // within 6% of the apex height
    let lastGood = top, misses = 0;
    for (let i = top + 1; i <= e; i++) {
      if (apex[i] <= band) { lastGood = i; misses = 0; }
      else if (++misses > 2) break;
    }
    top = lastGood; }

  // (3) IMPACT: after the top, the frame where the hands RETURN to the ball —
  //     closest to the address hand position (x over the ball, y at ball height).
  const wxA = wx[a0], wyA = wy[a0];
  let impact = Math.min(e, top + 1); let bd = Infinity;
  for (let i = top + 1; i <= e; i++) {
    const cost = Math.abs(wx[i] - wxA) + Math.abs(wy[i] - wyA);
    if (cost < bd) { bd = cost; impact = i; }
  }
  if (impact <= top) impact = Math.min(e, top + Math.round((e - top) / 2));

  // (2) FINISH: the frame where motion settles after impact (balanced hold),
  //     not merely the last frame — if the clip is cut, it falls back to e.
  const en = motionEnergy(frames);
  const mxE = Math.max.apply(null, en.slice(impact, e + 1)) || 1;
  const lowThr = mxE * 0.16;
  let finish = e;
  for (let i = impact + 2; i <= e; i++) {
    let settled = true;
    for (let j = 0; j < 3 && i + j <= e; j++) if (en[i + j] > lowThr) { settled = false; break; }
    if (settled) { finish = Math.min(e, i + 1); break; }
  }
  if (finish <= impact) finish = e;

  let pts = [s, Math.round(s + 0.34 * (top - s)), Math.round(s + 0.68 * (top - s)), top, Math.round(top + 0.5 * (impact - top)), impact, Math.round(impact + 0.5 * (finish - impact)), finish];
  for (let i = 1; i < 8; i++) if (pts[i] <= pts[i - 1]) pts[i] = Math.min(e, pts[i - 1] + 1);
  if (pts[7] - pts[0] < 7) { pts = [0, 1, 2, 3, 4, 5, 6, 7].map(k => Math.round(s + k * (e - s) / 7)); }

  const A = smoothAt(frames, a0); const SM = buildSideMap(A);
  const refOK = refTrustworthy(A);
  const ctx: AnalysisCtx = { frames, A, SM, view: VIEW, lang: LANG, refOK };
  const items = pts.map((fi, k) => makePhaseItem(frames, Math.min(Math.max(fi, 0), n - 1), k, A, SM, VIEW, LANG, PILL, refOK));
  return { items, ctx };
}

/* ---- phases ANCHORED on a known impact frame -------------------------- */
/* Used by the new impact-first pipeline: given the impact frame found by the
   fusion engine, place the other 7 phases around it (top before impact, finish
   after it) by body position — fixing the "off-balance" phase timing. */
export function analyzeSwingAtImpact(frames: Frame[], impactIdx: number, VIEW: View, LANG: string, PILL: any): { items: StoryItem[]; ctx: AnalysisCtx } {
  const n = frames.length;
  const apex = frames.map(f => armApexY(f.lm));
  const impact = Math.min(Math.max(impactIdx, 2), n - 1);
  const tImp = frames[impact].t;
  const at = (t: number) => frameIndexAtTime(frames, t);

  // Search the backswing/top up to ~2 s before impact (some players are slow).
  const topLo = Math.max(0, at(tImp - 2.0)), topHi = Math.max(topLo, at(tImp - 0.04));
  const finHi = Math.min(n - 1, at(tImp + 1.8));
  const en = motionEnergy(frames);

  // Top = highest visible arm point in the backswing window, occlusion-tolerant.
  let top = topLo; for (let i = topLo; i <= topHi; i++) if (apex[i] < apex[top]) top = i;
  let lowRef = apex[top]; for (let i = topLo; i <= impact; i++) if (apex[i] > lowRef) lowRef = apex[i];
  { const band = apex[top] + (lowRef - apex[top]) * 0.06; let lastGood = top, misses = 0;
    for (let i = top + 1; i <= topHi; i++) { if (apex[i] <= band) { lastGood = i; misses = 0; } else if (++misses > 2) break; }
    top = lastGood; }
  if (top >= impact) top = Math.max(1, impact - 2);

  // Address = the STILL setup frame just before the takeaway starts. We find the
  // takeaway onset by walking back from the top until the hands go quiet, then
  // pick the stillest frame just before it — so address lands on the real setup
  // regardless of how long the player's backswing is.
  let backMax = 1e-6; for (let i = topLo; i <= impact; i++) if (en[i] > backMax) backMax = en[i];
  const stillThr = backMax * 0.18;
  let tk = 0;
  for (let i = top; i >= 0; i--) { if (en[i] < stillThr) { tk = i; break; } }
  const aLo = Math.max(0, at(frames[tk].t - 0.7));
  let a0 = tk, aMin = Infinity;
  for (let i = aLo; i <= tk; i++) if (en[i] < aMin) { aMin = en[i]; a0 = i; }
  if (a0 >= top) a0 = Math.max(0, tk - 1);

  // Finish = motion settles after impact (balanced hold), within the post window.
  const mxE = Math.max.apply(null, en.slice(impact, finHi + 1)) || 1; const lowThr = mxE * 0.16;
  let finish = finHi;
  for (let i = impact + 2; i <= finHi; i++) { let settled = true; for (let j = 0; j < 3 && i + j <= finHi; j++) if (en[i + j] > lowThr) { settled = false; break; } if (settled) { finish = Math.min(finHi, i + 1); break; } }
  if (finish <= impact) finish = finHi;

  let pts = [a0, Math.round(a0 + 0.34 * (top - a0)), Math.round(a0 + 0.68 * (top - a0)), top, Math.round(top + 0.5 * (impact - top)), impact, Math.round(impact + 0.5 * (finish - impact)), finish];
  for (let i = 1; i < 8; i++) if (pts[i] <= pts[i - 1]) pts[i] = Math.min(n - 1, pts[i - 1] + 1);

  const A = smoothAt(frames, a0); const SM = buildSideMap(A);
  const refOK = refTrustworthy(A);
  const ctx: AnalysisCtx = { frames, A, SM, view: VIEW, lang: LANG, refOK };
  const items = pts.map((fi, k) => makePhaseItem(frames, Math.min(Math.max(fi, 0), n - 1), k, A, SM, VIEW, LANG, PILL, refOK));
  return { items, ctx };
}

/* Build (or rebuild) ONE phase card at a specific frame index. Used both by
   analyzeSwing and by the manual per-phase adjustment. refOK=false hides the
   head circle + plumb line when the address detection wasn't trustworthy. */
export function makePhaseItem(frames: Frame[], idx: number, k: number, A: any, SM: any, VIEW: View, LANG: string, PILL: any, refOK = true): StoryItem {
  idx = Math.min(Math.max(idx, 0), frames.length - 1);
  const raw = frames[idx].lm;
  const lowConf = frameLowConfidence(raw);
  const sm2 = smoothAt(frames, idx);
  // When the body isn't reliably in frame, refuse to assert a fault.
  const chk = lowConf
    ? { key: 'lowconf', parts: [] as string[] }
    : (VIEW === 'dtl' ? checkPhase8DTL(k, sm2, A) : checkPhase8(k, sm2, A, SM));
  const ov = resolveOverlay(chk.parts, raw, SM);
  let th = frames[idx].thumb;
  for (let j = 1; j < 8 && !th; j++) { if (frames[idx - j] && frames[idx - j].thumb) th = frames[idx - j].thumb; else if (frames[idx + j] && frames[idx + j].thumb) th = frames[idx + j].thumb; }
  const REF = (refOK && !lowConf) ? { hx: A[0].x, hy: A[0].y, r: Math.max(0.08, Math.abs(A[11].x - A[12].x) * 0.72) } : null;
  const label = chk.key === 'lowconf' ? '' : (PILL[chk.key] ? PILL[chk.key][LANG] : "");
  return { thumb: th ? th.img : null, iw: th ? th.w : 360, ih: th ? th.h : 480, marks: ov.marks, anchor: ov.anchor, pill: label, _key: chk.key, _i: k, _idx: idx, _warn: (chk.parts.length ? 1 : 0) as 0 | 1, ref: REF };
}

/* Backward-compatible helper: just the items. */
export function buildStory(frames: Frame[], VIEW: View, LANG: string, PILL: any, opts: { manual?: boolean } = {}): StoryItem[] {
  return analyzeSwing(frames, VIEW, LANG, PILL, opts).items;
}

/* ---- extract frames from an uploaded video ---------------------------- */
export function extractByPlay(vid: HTMLVideoElement, setAna: (p: number, m: string) => void, procMsg: string): Promise<Frame[]> {
  return new Promise((resolve, reject) => {
    const frames: Frame[] = []; let done = false; let t2 = 0;
    const dur = Math.min(vid.duration || 5, 15);
    const hasRVFC = typeof (vid as any).requestVideoFrameCallback === 'function';
    const fin = () => { if (done) return; done = true; try { vid.pause(); } catch (e) { } resolve(frames); };
    const det = () => {
      if (done) return; t2 += 1;
      try { const r = landmarker!.detectForVideo(vid, t2); if (r && r.landmarks && r.landmarks[0]) frames.push({ t: vid.currentTime, lm: r.landmarks[0] as any, thumb: grabThumb(vid) }); } catch (e) { }
      setAna(Math.min(96, (vid.currentTime / dur) * 86 + 10), procMsg);
      if (vid.ended || vid.currentTime >= dur - 0.04) { fin(); return; }
      sch();
    };
    const sch = () => { if (done) return; if (hasRVFC) (vid as any).requestVideoFrameCallback(() => det()); else setTimeout(det, 33); };
    const pr = vid.play(); if (pr && pr.catch) pr.catch(() => { if (!hasRVFC) sch(); });
    sch();
    setTimeout(() => { if (done) return; if (frames.length >= 6) fin(); else { done = true; reject(new Error('timeout')); } }, 35000);
  });
}

/* live camera skeleton overlay connections */
export const CONN = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

/* example (demo) figures = hand-tuned design poses */
export const DEMO8: any[] = [
 {root:[150,250],spine:0,shoulderTilt:0,neck:10,head:16,armL:{up:158,fore:152},armR:{up:203,fore:208},legL:{thigh:192,shin:188,foot:258},legR:{thigh:168,shin:172,foot:102},cap:'front',armFront:'L',legFront:'L',key:'spine_hunched',ep:{part:'torso',dx:1.45,dy:-0.1}},
 {root:[150,250],spine:-4,shoulderTilt:-4,neck:-2,head:-3,armL:{up:163,fore:160},armR:{up:208,fore:222},legL:{thigh:189,shin:185,foot:258},legR:{thigh:171,shin:175,foot:102},cap:'front',armFront:'R',legFront:'L',key:'hands_inside',ep:{part:'handR',dx:1.4,dy:0.6}},
 {root:[150,249],spine:-8,shoulderTilt:-9,neck:4,head:6,armL:{up:286,fore:300},armR:{up:256,fore:240},legL:{thigh:188,shin:184,foot:258},legR:{thigh:172,shin:176,foot:102},cap:'front',armFront:'R',legFront:'L',key:'arms_early',ep:{part:'foreArmR',dx:1.3,dy:0.5}},
 {root:[150,248],spine:-9,shoulderTilt:-12,neck:8,head:10,armL:{up:305,fore:305},armR:{up:300,fore:250},legL:{thigh:188,shin:184,foot:258},legR:{thigh:172,shin:176,foot:102},cap:'front',armFront:'R',legFront:'L',key:'arms_top',ep:{part:'foreArmR',dx:-1.35,dy:-0.4}},
 {root:[150,252],spine:-4,shoulderTilt:-3,neck:18,head:26,armL:{up:235,fore:218},armR:{up:238,fore:222},legL:{thigh:190,shin:186,foot:258},legR:{thigh:168,shin:172,foot:102},cap:'front',armFront:'R',legFront:'R',key:'head_down',ep:{part:'head',dx:1.5,dy:-0.7}},
 {root:[150,247],spine:2,shoulderTilt:6,neck:2,head:2,armL:{up:160,fore:158},armR:{up:201,fore:206},legL:{thigh:190,shin:186,foot:258},legR:{thigh:167,shin:170,foot:102},cap:'front',armFront:'R',legFront:'L',key:'spine_ext',ep:{part:'torso',dx:1.45,dy:-0.2}},
 {root:[151,248],spine:5,shoulderTilt:8,neck:0,head:4,armL:{up:112,fore:104},armR:{up:94,fore:90},legL:{thigh:196,shin:202,foot:250},legR:{thigh:173,shin:173,foot:118},cap:'front',armFront:'L',legFront:'R',key:'lose_ext',ep:{part:'foreArmL',dx:-1.45,dy:0.4}},
 {root:[152,248],spine:9,shoulderTilt:12,neck:4,head:10,armL:{up:66,fore:46},armR:{up:116,fore:84},legL:{thigh:189,shin:177,foot:196},legR:{thigh:174,shin:174,foot:120},cap:'front',armFront:'L',legFront:'R',key:'ok_finish',ep:null}
];
