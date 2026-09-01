/* SwingAnalyzer — orchestrates the impact-first pipeline. Given the extracted
   frames, the (optional) decoded audio and the user's approximate impact mark,
   it runs each detector independently, fuses them, and builds the 8 phase cards
   anchored on the detected impact. Every signal is optional; the fusion engine
   re-weights around whatever is available. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { analyzeSwingAtImpact, frameIndexAtTime, impactIndex, type Frame, type View, type StoryItem, type AnalysisCtx } from "./pose";
import { detectAudioImpact } from "./audioImpact";
import { clubMotionSeries, detectClubImpact } from "./clubMotion";
import { detectBallImpact } from "./ballMotion";
import { fuseImpact, frameBracket, type ImpactResult } from "./impactFusion";

export type SwingResult = { items: StoryItem[]; ctx: AnalysisCtx; impact: ImpactResult };

/* markerT = the user's approximate impact time; window = 2 s before, 1 s after. */
export function analyzeSwing(
  frames: Frame[],
  audio: AudioBuffer | null,
  markerT: number,
  VIEW: View,
  LANG: string,
  PILL: any,
  manual = false,
): SwingResult {
  const n = frames.length;
  const t0 = frames[0].t, tN = frames[n - 1].t;

  // AUDIO FIRST (Pablo's approach): in auto mode, scan the WHOLE clip for the
  // ball-strike click and center the 3 s window on it, so the window always
  // holds the real impact. In manual mode we respect the user's mark instead.
  let anchorT = markerT;
  if (!manual && audio) { const full = detectAudioImpact(audio, t0, tN); if (full && full.score >= 40) anchorT = full.t; }
  const tStart = Math.max(t0, anchorT - 2);
  const tEnd = Math.min(tN, anchorT + 1);
  const i0 = frameIndexAtTime(frames, tStart);
  const i1 = frameIndexAtTime(frames, tEnd);

  // A. audio  B. club motion  C. ball motion (all null-safe)
  const audioSig = audio ? detectAudioImpact(audio, tStart, tEnd) : null;
  // When audio fired, look for the club/ball spike NEAR that candidate (±0.25 s)
  // — the spec's "analyze frames close to the audio candidate".
  let cLo = i0, cHi = i1;
  if (audioSig) { cLo = Math.max(i0, frameIndexAtTime(frames, audioSig.t - 0.25)); cHi = Math.min(i1, frameIndexAtTime(frames, audioSig.t + 0.25)); }
  const series = clubMotionSeries(frames);
  const clubSig = detectClubImpact(frames, series, cLo, cHi);
  const addrLm = frames[frameIndexAtTime(frames, tStart)]?.lm || null;
  const ballSig = detectBallImpact(frames, cLo, cHi, addrLm);

  // POSE anchor: impact is physically the frame where the hands RETURN to the
  // ball (lowest) after the top — never the follow-through. This is the reliable
  // posture constraint; audio/club only refine WHEN within reach of it.
  // Impact by the "hands low + fast" signature (see impactIndex) — robust to the
  // top/finish confusion and occlusion glitches.
  const poseI = impactIndex(frames, i0, i1);
  const poseT = frames[poseI].t;

  // D. fusion — for the confidence breakdown (audio/club/ball).
  const impact = fuseImpact(frames, { audio: audioSig, club: clubSig, ball: ballSig }, poseT);

  // Pablo's approach: the ball-strike CLICK is the physical moment of impact, so
  // when audio finds a clear click we ANCHOR the 8 frames on it. Pose only leads
  // when there is no usable audio (silent / noisy uploads).
  let chosenT: number;
  if (audioSig && audioSig.score >= 40) chosenT = audioSig.t;                                   // trust the click
  else if (Math.abs(frames[impact.estimatedImpactFrame].t - poseT) > 0.4) chosenT = poseT;      // fused off → pose
  else chosenT = frames[impact.estimatedImpactFrame].t;

  const br = frameBracket(frames, chosenT);
  impact.t = chosenT;
  impact.estimatedImpactFrame = br.estimatedImpactFrame;
  impact.frameBeforeImpact = br.frameBeforeImpact;
  impact.frameAfterImpact = br.frameAfterImpact;
  impact.impactBetweenFrames = br.impactBetweenFrames;

  const { items, ctx } = analyzeSwingAtImpact(frames, impact.estimatedImpactFrame, VIEW, LANG, PILL);
  return { items, ctx, impact };
}
