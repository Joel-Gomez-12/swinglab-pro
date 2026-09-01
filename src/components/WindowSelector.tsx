/* Lets the user place a time window over their swing before analysis.
   Only frames inside [winStart, winEnd] are analyzed. Mirrors Pablo's mockup:
   thumbnail strip + orange range + fine-tune + duration presets + preview. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T, type Lang } from "../data/i18n";
import { frameIndexAtTime, type Frame } from "../lib/pose";

const DURATIONS = [1.5, 2, 3, 5];

export default function WindowSelector({
  frames, videoUrl, lang, initStart, initEnd, onAnalyze, onCancel,
}: {
  frames: Frame[];
  videoUrl: string | null;
  lang: Lang;
  initStart: number;
  initEnd: number;
  onAnalyze: (tStart: number, tEnd: number) => void;
  onCancel: () => void;
}) {
  const tr = T[lang];
  const t0 = frames[0]?.t ?? 0;
  const tN = frames[frames.length - 1]?.t ?? 0;
  const dur = Math.max(0.001, tN - t0);

  const [winStart, setWinStart] = useState(initStart);
  const [winEnd, setWinEnd] = useState(initEnd);
  const [playing, setPlaying] = useState(false);
  const [scrubT, setScrubT] = useState(winStart); // frame time shown for recorded clips

  const trackRef = useRef<HTMLDivElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef(0);
  const dragRef = useRef<null | "start" | "end">(null);

  const MINWIN = Math.min(0.5, dur * 0.5);
  const pct = (t: number) => ((t - t0) / dur) * 100;
  const rel = (t: number) => (t - t0);
  const fmt = (t: number) => rel(t).toFixed(1).replace(".", ",") + " s";

  /* even sample of thumbnails across the whole clip */
  const strip = useMemo(() => {
    const withThumb = frames.map((f, i) => ({ f, i })).filter(x => x.f.thumb);
    const count = Math.min(18, withThumb.length);
    if (!count) return [] as { t: number; img: string }[];
    const out: { t: number; img: string }[] = [];
    for (let k = 0; k < count; k++) {
      const idx = Math.round((k / Math.max(1, count - 1)) * (withThumb.length - 1));
      const x = withThumb[idx];
      out.push({ t: x.f.t, img: x.f.thumb!.img });
    }
    return out;
  }, [frames]);

  const frameImgAt = useCallback((t: number) => {
    const i = frameIndexAtTime(frames, t);
    return frames[i]?.thumb?.img || null;
  }, [frames]);

  /* keep the paused video parked at the window start when not playing */
  useEffect(() => {
    if (videoUrl && vidRef.current && !playing) {
      try { vidRef.current.currentTime = winStart; } catch { /* */ }
    }
    if (!videoUrl && !playing) setScrubT(winStart);
  }, [winStart, videoUrl, playing]);

  const stopPreview = useCallback(() => {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0;
    if (vidRef.current) { try { vidRef.current.pause(); } catch { /* */ } }
  }, []);

  const startPreview = useCallback(() => {
    if (playing) { stopPreview(); return; }
    setPlaying(true);
    if (videoUrl && vidRef.current) {
      const v = vidRef.current;
      try { v.currentTime = winStart; } catch { /* */ }
      const onTime = () => { if (v.currentTime >= winEnd) { v.pause(); v.removeEventListener("timeupdate", onTime); setPlaying(false); } };
      v.addEventListener("timeupdate", onTime);
      v.play().catch(() => setPlaying(false));
    } else {
      const started = performance.now();
      const loop = () => {
        const tt = winStart + (performance.now() - started) / 1000;
        if (tt >= winEnd) { setScrubT(winStart); setPlaying(false); return; }
        setScrubT(tt);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [playing, videoUrl, winStart, winEnd, stopPreview]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  /* ---- window math --------------------------------------------------- */
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const moveWindowTo = useCallback((centerT: number) => {
    const len = winEnd - winStart;
    let s = clamp(centerT - len / 2, t0, tN - len);
    setWinStart(s); setWinEnd(s + len);
  }, [winStart, winEnd, t0, tN]);
  const nudge = useCallback((d: number) => {
    const len = winEnd - winStart;
    let s = clamp(winStart + d, t0, tN - len);
    setWinStart(s); setWinEnd(s + len);
  }, [winStart, winEnd, t0, tN]);
  const setDuration = useCallback((len: number) => {
    const center = (winStart + winEnd) / 2;
    const L = Math.min(len, dur);
    let s = clamp(center - L / 2, t0, tN - L);
    setWinStart(s); setWinEnd(s + L);
  }, [winStart, winEnd, t0, tN, dur]);

  /* ---- pointer dragging on the track --------------------------------- */
  const tFromClientX = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return t0 + clamp((clientX - r.left) / r.width, 0, 1) * dur;
  };
  const onTrackDown = (e: React.PointerEvent) => {
    stopPreview();
    const t = tFromClientX(e.clientX);
    // nearest handle grabs if close, else move whole window
    const dS = Math.abs(t - winStart), dE = Math.abs(t - winEnd);
    if (Math.min(dS, dE) < dur * 0.06) dragRef.current = dS <= dE ? "start" : "end";
    else { dragRef.current = null; moveWindowTo(t); }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onTrackMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const t = tFromClientX(e.clientX);
    if (dragRef.current === "start") setWinStart(clamp(t, t0, winEnd - MINWIN));
    else setWinEnd(clamp(t, winStart + MINWIN, tN));
  };
  const onTrackUp = () => { dragRef.current = null; };
  const onHandleDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.stopPropagation(); stopPreview(); dragRef.current = which;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const curLen = winEnd - winStart;
  const previewImg = videoUrl ? null : frameImgAt(playing ? scrubT : winStart);

  return (
    <>
      <div className="camwrap winwrap">
        {videoUrl ? (
          <video ref={vidRef} className="camimg" src={videoUrl} playsInline muted preload="auto"
            onLoadedMetadata={() => { try { if (vidRef.current) vidRef.current.currentTime = winStart; } catch { /* */ } }} />
        ) : (
          previewImg && <img className="camimg" src={previewImg} alt="" />
        )}
      </div>

      <div className="wininstr"><b>{tr.wintitle}.</b>{" "}
        <span dangerouslySetInnerHTML={{ __html: tr.winintro }} />
      </div>

      <div className="winstrip">
        {strip.map((s, i) => {
          const inside = s.t >= winStart - 1e-6 && s.t <= winEnd + 1e-6;
          return (
            <div key={i} className={"th" + (inside ? " insel" : " dim")} onClick={() => { stopPreview(); moveWindowTo(s.t); }}>
              <img src={s.img} alt="" />
            </div>
          );
        })}
      </div>

      <div className="wintrack" ref={trackRef} onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} onPointerCancel={onTrackUp}>
        <div className="base" />
        <div className="fill" style={{ left: pct(winStart) + "%", width: (pct(winEnd) - pct(winStart)) + "%" }} />
        <div className="hd" style={{ left: pct(winStart) + "%" }} onPointerDown={onHandleDown("start")} />
        <div className="hd" style={{ left: pct(winEnd) + "%" }} onPointerDown={onHandleDown("end")} />
      </div>

      <div className="winlabels">
        <span>{fmt(t0)}</span>
        <span className="cur">{fmt(winStart)} – {fmt(winEnd)}</span>
        <span>{fmt(tN)}</span>
      </div>

      <div className="winrow">
        <button className="nudge" onClick={() => nudge(-0.5)}>{tr.nudgel}</button>
        <button className="prev" onClick={startPreview}>{playing ? tr.winstop : tr.winprev}</button>
        <button className="nudge" onClick={() => nudge(0.5)}>{tr.nudger}</button>
      </div>

      <div className="windurlab">{tr.windur}</div>
      <div className="windurpills">
        {DURATIONS.map((d) => (
          <button key={d} className={Math.abs(curLen - d) < 0.12 ? "on" : ""} onClick={() => setDuration(d)}>
            {d.toString().replace(".", ",")} s
          </button>
        ))}
      </div>

      <button className="cta-cam" onClick={() => { stopPreview(); onAnalyze(winStart, winEnd); }}>{tr.winanalyze}</button>
      <div className="row"><button className="btn g" onClick={() => { stopPreview(); onCancel(); }}>{tr.cancel}</button></div>
    </>
  );
}
