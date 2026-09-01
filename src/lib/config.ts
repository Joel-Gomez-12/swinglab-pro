/* Runtime-configurable fusion weights (spec point 4). Stored locally; the
   detection settings panel edits these and the ImpactFusionEngine reads them. */
export type FusionWeights = { audio: number; club: number; ball: number };

export const DEFAULT_WEIGHTS: FusionWeights = { audio: 0.4, club: 0.35, ball: 0.25 };
const KEY = "swinglab_weights_v1";

export function getWeights(): FusionWeights {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v.audio === "number" && typeof v.club === "number" && typeof v.ball === "number") return v;
  } catch { /* */ }
  return { ...DEFAULT_WEIGHTS };
}
export function setWeights(w: FusionWeights) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* */ }
}
export function resetWeights() { try { localStorage.removeItem(KEY); } catch { /* */ } }
