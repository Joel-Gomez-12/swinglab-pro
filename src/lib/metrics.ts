/* PoseAnalyzer (body metrics) — computes the quantitative measurements the spec
   asks for from the MediaPipe landmarks: spine tilt, shoulder/hip rotation, knee
   flex, lateral shift, head stability, hand position, balance. Single-camera 2D,
   so rotation uses MediaPipe's estimated depth (z) and is APPROXIMATE. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ang, type LM, type StoryItem, type AnalysisCtx } from "./pose";

const deg = (r: number) => (r * 180) / Math.PI;
const m3 = (a: LM, b: LM) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 });
// angle of a left→right body line in the top-down (x,z) plane → rotation cue
const lineAngle = (l: LM, r: LM) => deg(Math.atan2((r.z || 0) - (l.z || 0), r.x - l.x));

export type PhaseMetrics = {
  spineTilt: number;   // ° from vertical
  kneeL: number; kneeR: number; // ° of flex (0 = straight)
  lateralX: number;    // hips horizontal shift vs address (normalized)
  headX: number;       // head horizontal shift vs address (+ = screen right)
  headRise: number;    // head vertical rise vs address (+ = standing up)
  balance: number;     // shoulders-over-ankles offset / stance width (0 = centered)
  shTurn: number;      // shoulder rotation vs address (° approx)
  hipTurn: number;     // hip rotation vs address (° approx)
  handX: number; handY: number; // hands vs hips (x) and height (y)
};

export function computePhaseMetrics(lm: LM[] | undefined, A: Record<number, LM>): PhaseMetrics | null {
  if (!lm || !lm[11] || !lm[23] || !lm[27]) return null;
  const shM = m3(lm[11], lm[12]), hpM = m3(lm[23], lm[24]), anM = m3(lm[27], lm[28]);
  const aHp = m3(A[23], A[24]);
  const stance = Math.abs(lm[27].x - lm[28].x) || 0.12;
  return {
    spineTilt: Math.round(deg(Math.atan2(Math.abs(shM.x - hpM.x), Math.abs(shM.y - hpM.y)))),
    kneeL: Math.max(0, Math.round(180 - ang(lm[23], lm[25], lm[27]))),
    kneeR: Math.max(0, Math.round(180 - ang(lm[24], lm[26], lm[28]))),
    lateralX: +(hpM.x - aHp.x).toFixed(3),
    headX: +(lm[0].x - A[0].x).toFixed(3),
    headRise: +(A[0].y - lm[0].y).toFixed(3),
    balance: +((shM.x - anM.x) / stance).toFixed(2),
    shTurn: Math.round(Math.abs(lineAngle(lm[11], lm[12]) - lineAngle(A[11], A[12]))),
    hipTurn: Math.round(Math.abs(lineAngle(lm[23], lm[24]) - lineAngle(A[23], A[24]))),
    handX: +(m3(lm[15], lm[16]).x - hpM.x).toFixed(3),
    handY: +m3(lm[15], lm[16]).y.toFixed(3),
  };
}

export type SwingSummary = {
  spineAddress: number; spineImpact: number;
  shoulderTop: number; hipTop: number;
  kneeAddress: number;
  headSwayX: number; headSwayDir: "right" | "left" | "stable";
  lateralTop: number;
  balanceFinish: number;
};

/* Summarise a whole swing from the 8 phase frames (address/top/impact/finish). */
export function computeSwingSummary(items: StoryItem[], ctx: AnalysisCtx): SwingSummary | null {
  const F = ctx.frames, A = ctx.A;
  const at = (k: number) => computePhaseMetrics(F[items[k]?._idx]?.lm, A);
  const mAddr = at(0), mTop = at(3), mImp = at(5), mFin = at(7);
  if (!mAddr || !mTop || !mImp || !mFin) return null;
  const headSwayDir: SwingSummary["headSwayDir"] =
    Math.abs(mTop.headX) < 0.035 ? "stable" : mTop.headX > 0 ? "right" : "left";
  return {
    spineAddress: mAddr.spineTilt,
    spineImpact: mImp.spineTilt,
    shoulderTop: mTop.shTurn,
    hipTop: mTop.hipTurn,
    kneeAddress: Math.round((mAddr.kneeL + mAddr.kneeR) / 2),
    headSwayX: mTop.headX,
    headSwayDir,
    lateralTop: mTop.lateralX,
    balanceFinish: mFin.balance,
  };
}
