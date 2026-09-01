/* VideoProcessor — unifies camera-recorded and uploaded clips into one pipeline:
   record (with audio) → decode → per-frame {pose, thumbnail, gray} + audio buffer.
   Everything runs in the browser; nothing is uploaded. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { initPose, getLandmarker, grabThumb, type Frame, type Gray } from "./pose";

/* ---- recording (camera path) --------------------------------------- */
export function recorderSupported(): boolean {
  return typeof (window as any).MediaRecorder !== "undefined";
}
function pickMimeType(): string | undefined {
  const MR: any = (window as any).MediaRecorder;
  if (!MR || !MR.isTypeSupported) return undefined;
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const t of types) { if (MR.isTypeSupported(t)) return t; }
  return undefined;
}
/* Records the given stream (video+audio) for durationMs into a single Blob. */
export function recordStream(stream: MediaStream, durationMs: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let rec: MediaRecorder;
    const chunks: BlobPart[] = [];
    const mimeType = pickMimeType();
    try { rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); }
    catch (e) { reject(e); return; }
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    rec.onerror = (ev: any) => reject(ev?.error || new Error("recorder_error"));
    rec.start(100);
    setTimeout(() => { try { rec.state !== "inactive" && rec.stop(); } catch (e) { /* */ } }, durationMs);
  });
}

/* Stoppable recorder for a SESSION (hit many balls, then stop). Safety cap at
   3 min so it can't run forever. */
export function createSessionRecorder(stream: MediaStream, maxMs = 180000): { stop: () => Promise<Blob> } {
  const chunks: BlobPart[] = [];
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
  rec.start(500);
  const cap = setTimeout(() => { try { rec.state !== "inactive" && rec.stop(); } catch (e) { /* */ } }, maxMs);
  return {
    stop: () => new Promise<Blob>((resolve) => {
      clearTimeout(cap);
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
      try { rec.state !== "inactive" ? rec.stop() : resolve(new Blob(chunks)); } catch (e) { resolve(new Blob(chunks)); }
    }),
  };
}

/* ---- loading a clip (from Blob or File) ---------------------------- */
export function loadVideo(src: Blob | string): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const vid = document.createElement("video");
    vid.muted = true; (vid as any).playsInline = true; vid.setAttribute("playsinline", ""); vid.preload = "auto";
    let settled = false;
    const ok = () => { if (settled) return; settled = true; resolve({ video: vid, url }); };
    const ko = () => { if (settled) return; settled = true; const c = vid.error ? vid.error.code : 0; reject(new Error("video (código " + c + ")")); };
    vid.onloadedmetadata = ok; vid.onloadeddata = ok; vid.oncanplay = ok; vid.onerror = ko;
    vid.src = url; try { vid.load(); } catch (e) { /* */ }
    setTimeout(() => { if (!settled) { if (vid.readyState >= 1) ok(); else ko(); } }, 30000);
  });
}

/* ---- rich per-frame extraction (pose + thumbnail + grayscale) ------ */
let _grayCv: HTMLCanvasElement | null = null;
function grabGray(v: HTMLVideoElement, W = 64): Gray | null {
  try {
    const vw = v.videoWidth, vh = v.videoHeight; if (!vw || !vh) return null;
    const H = Math.max(1, Math.round(W * vh / vw));
    if (!_grayCv) _grayCv = document.createElement("canvas");
    _grayCv.width = W; _grayCv.height = H;
    const g = _grayCv.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D;
    g.drawImage(v, 0, 0, W, H);
    const rgba = g.getImageData(0, 0, W, H).data;
    const out = new Uint8ClampedArray(W * H);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) out[p] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
    return { data: out, w: W, h: H };
  } catch (e) { return null; }
}

export function extractRich(vid: HTMLVideoElement, setProgress: (p: number, m: string) => void, procMsg: string): Promise<Frame[]> {
  return new Promise((resolve, reject) => {
    const landmarker = getLandmarker();
    if (!landmarker) { reject(new Error("no_landmarker")); return; }
    const frames: Frame[] = []; let done = false; let t2 = 0;
    const dur = Math.min(vid.duration || 5, 20);
    const hasRVFC = typeof (vid as any).requestVideoFrameCallback === "function";
    const fin = () => { if (done) return; done = true; try { vid.pause(); } catch (e) { /* */ } resolve(frames); };
    const det = () => {
      if (done) return; t2 += 1;
      try {
        const r = landmarker.detectForVideo(vid, t2);
        const lm = r && r.landmarks && r.landmarks[0] ? r.landmarks[0] : null;
        if (lm) frames.push({ t: vid.currentTime, lm: lm as any, thumb: grabThumb(vid), gray: grabGray(vid) });
      } catch (e) { /* */ }
      setProgress(Math.min(60, (vid.currentTime / dur) * 50 + 10), procMsg);
      if (vid.ended || vid.currentTime >= dur - 0.04) { fin(); return; }
      sch();
    };
    const sch = () => { if (done) return; if (hasRVFC) (vid as any).requestVideoFrameCallback(() => det()); else setTimeout(det, 33); };
    const pr = vid.play(); if (pr && pr.catch) pr.catch(() => { if (!hasRVFC) sch(); });
    sch();
    setTimeout(() => { if (done) return; if (frames.length >= 6) fin(); else { done = true; reject(new Error("timeout")); } }, 40000);
  });
}

/* ---- audio decoding (for AudioImpactDetector) ---------------------- */
export async function decodeAudio(src: Blob | File): Promise<AudioBuffer | null> {
  try {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    const buf = await src.arrayBuffer();
    if (!buf || buf.byteLength === 0) return null;
    const ctx = new AC();
    const audio: AudioBuffer = await new Promise((res, rej) => {
      // callback form for Safari compatibility
      const p = ctx.decodeAudioData(buf.slice(0), (b: AudioBuffer) => res(b), (e: any) => rej(e));
      if (p && (p as any).then) (p as Promise<AudioBuffer>).then(res, rej);
    });
    try { ctx.close(); } catch (e) { /* */ }
    return audio;
  } catch (e) {
    return null; // no audio track / unsupported codec → signal simply unavailable
  }
}
