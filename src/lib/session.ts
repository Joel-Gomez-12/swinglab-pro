/* Session store (V3) — accumulates the NUMERIC summary of each analyzed swing
   in the browser (localStorage). No images, nothing uploaded: privacy intact.
   This is what powers the "coach" aggregate stats across your last N swings. */
import type { StoryItem, AnalysisCtx } from "./pose";
import { computeSwingSummary, type SwingSummary } from "./metrics";

export type SwingRecord = {
  id: string;
  ts: number;
  faults: { key: string; phase: number }[]; // faulted phases (key + position 0..7)
  confidence: number;                        // impact confidence 0..100
  headShiftX: number;                        // max lateral head move vs address
  headRiseY: number;                         // max "standing up" (head rises)
  metrics?: SwingSummary | null;             // full body metrics summary (V3+)
};

const KEY = "swinglab_session_v1";
const MAX = 200;

export function getSession(): SwingRecord[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
export function addSwing(r: SwingRecord): SwingRecord[] {
  const s = getSession(); s.push(r);
  const trimmed = s.slice(-MAX);
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
  return trimmed;
}
export function clearSession() { try { localStorage.removeItem(KEY); } catch { /* */ } }

/* Build a record from an analyzed swing (items + ctx + confidence). */
export function buildRecord(items: StoryItem[], ctx: AnalysisCtx, confidence: number, now: number): SwingRecord {
  const s = items[0]?._idx ?? 0, e = items[items.length - 1]?._idx ?? 0;
  const A = ctx.A; let hx = 0, hr = 0;
  if (A && A[0]) {
    for (let i = s; i <= e; i++) {
      const lm = ctx.frames[i]?.lm; if (!lm || !lm[0]) continue;
      hx = Math.max(hx, Math.abs(lm[0].x - A[0].x));
      hr = Math.max(hr, A[0].y - lm[0].y);
    }
  }
  return {
    id: now + "-" + Math.round((now % 1000) * 7 + s),
    ts: now,
    faults: items.filter((p) => p._warn && p._key !== "lowconf").map((p) => ({ key: p._key, phase: p._i })),
    confidence,
    headShiftX: +hx.toFixed(3),
    headRiseY: +hr.toFixed(3),
    metrics: computeSwingSummary(items, ctx),
  };
}

export type HeadSwayStat = { dir: "right" | "left" | "stable"; count: number; pct: number };

/* Aggregate head-sway direction during the backswing across the session — this
   powers the "in 70% of your swings you move your head right" coach line. */
export function headSwayStats(records: SwingRecord[]): HeadSwayStat[] {
  const withM = records.filter((r) => r.metrics);
  const n = withM.length; if (!n) return [];
  const c: Record<string, number> = { right: 0, left: 0, stable: 0 };
  for (const r of withM) c[r.metrics!.headSwayDir]++;
  return (["right", "left", "stable"] as const)
    .map((dir) => ({ dir, count: c[dir], pct: Math.round((c[dir] / n) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export type FaultStat = { key: string; count: number; pct: number };

/* Aggregate: fault frequency across the session, most common first. */
export function faultStats(records: SwingRecord[]): FaultStat[] {
  const n = records.length; if (!n) return [];
  const seen = new Map<string, number>();
  for (const r of records) {
    const uniq = new Set(r.faults.map((f) => f.key)); // count each fault once per swing
    for (const k of uniq) seen.set(k, (seen.get(k) || 0) + 1);
  }
  return [...seen.entries()]
    .map(([key, count]) => ({ key, count, pct: Math.round((count / n) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function avgConfidence(records: SwingRecord[]): number {
  if (!records.length) return 0;
  return Math.round(records.reduce((a, r) => a + r.confidence, 0) / records.length);
}
