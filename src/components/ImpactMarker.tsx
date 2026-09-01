/* ImpactMarker — Pablo's V1 UX: after recording, the user drags ONE marker to
   roughly where they hit the ball. We then analyze a window of 2 s before and
   1 s after, and the fusion engine finds the real impact inside it. */
import { useCallback, useEffect, useRef, useState } from "react";
import { T, type Lang } from "../data/i18n";
import { frameIndexAtTime, type Frame } from "../lib/pose";

export default function ImpactMarker({
  frames, videoUrl, lang, initMarker, onAnalyze, onCancel,
}: {
  frames: Frame[];
  videoUrl: string | null;
  lang: Lang;
  initMarker: number;
  onAnalyze: (markerT: number) => void;
  onCancel: () => void;
}) {
  const tr = T[lang];
  const t0 = frames[0]?.t ?? 0;
  const tN = frames[frames.length - 1]?.t ?? 0;
  const dur = Math.max(0.001, tN - t0);

  const [marker, setMarker] = useState(Math.min(Math.max(initMarker, t0), tN));
  const [playing, setPlaying] = useState(false);
  const [scrubT, setScrubT] = useState(marker);
  const trackRef = useRef<HTMLDivElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef(0);
  const dragRef = useRef(false);

  const pct = (t: number) => ((t - t0) / dur) * 100;
  const clampT = (t: number) => Math.max(t0, Math.min(tN, t));
  const winStart = Math.max(t0, marker - 2), winEnd = Math.min(tN, marker + 1);

  const strip = useCallback(() => {
    const withThumb = frames.map((f) => f).filter((f) => f.thumb);
    const count = Math.min(18, withThumb.length);
    const out: { t: number; img: string }[] = [];
    for (let k = 0; k < count; k++) {
      const idx = Math.round((k / Math.max(1, count - 1)) * (withThumb.length - 1));
      out.push({ t: withThumb[idx].t, img: withThumb[idx].thumb!.img });
    }
    return out;
  }, [frames])();

  const frameImgAt = useCallback((t: number) => frames[frameIndexAtTime(frames, t)]?.thumb?.img || null, [frames]);

  useEffect(() => {
    if (videoUrl && vidRef.current && !playing) { try { vidRef.current.currentTime = marker; } catch { /* */ } }
    if (!videoUrl && !playing) setScrubT(marker);
  }, [marker, videoUrl, playing]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const stopPreview = useCallback(() => {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0;
    if (vidRef.current) { try { vidRef.current.pause(); } catch { /* */ } }
  }, []);
  const startPreview = useCallback(() => {
    if (playing) { stopPreview(); return; }
    setPlaying(true);
    if (videoUrl && vidRef.current) {
      const v = vidRef.current; try { v.currentTime = winStart; } catch { /* */ }
      const onTime = () => { if (v.currentTime >= winEnd) { v.pause(); v.removeEventListener("timeupdate", onTime); setPlaying(false); } };
      v.addEventListener("timeupdate", onTime); v.play().catch(() => setPlaying(false));
    } else {
      const started = performance.now();
      const loop = () => { const tt = winStart + (performance.now() - started) / 1000; if (tt >= winEnd) { setScrubT(marker); setPlaying(false); return; } setScrubT(tt); rafRef.current = requestAnimationFrame(loop); };
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [playing, videoUrl, winStart, winEnd, marker, stopPreview]);

  const tFromClientX = (clientX: number) => { const r = trackRef.current!.getBoundingClientRect(); return t0 + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * dur; };
  const onDown = (e: React.PointerEvent) => { stopPreview(); dragRef.current = true; setMarker(clampT(tFromClientX(e.clientX))); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (dragRef.current) setMarker(clampT(tFromClientX(e.clientX))); };
  const onUp = () => { dragRef.current = false; };

  // Always show a thumbnail frame (a paused <video> renders black on some
  // browsers); the real video only appears while actively playing the window.
  const previewImg = frameImgAt(playing ? scrubT : marker);
  const showVideo = playing && !!videoUrl;
  const fmt = (t: number) => (t - t0).toFixed(1).replace(".", ",") + " s";

  return (
    <>
      <div className="camwrap winwrap">
        {videoUrl && (
          <video ref={vidRef} className="camimg" src={videoUrl} playsInline muted preload="auto"
            style={{ opacity: showVideo ? 1 : 0 }}
            onLoadedMetadata={() => { try { if (vidRef.current) vidRef.current.currentTime = marker; } catch { /* */ } }} />
        )}
        {!showVideo && previewImg && <img className="camimg" src={previewImg} alt="" />}
      </div>

      <div className="wininstr"><b>{tr.impq}</b><br />{tr.imphint}</div>

      <div className="winstrip">
        {strip.map((s, i) => {
          const inside = s.t >= winStart - 1e-6 && s.t <= winEnd + 1e-6;
          return (
            <div key={i} className={"th" + (inside ? " insel" : " dim")} onClick={() => { stopPreview(); setMarker(clampT(s.t)); }}>
              <img src={s.img} alt="" />
            </div>
          );
        })}
      </div>

      <div className="wintrack" ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="base" />
        <div className="fill" style={{ left: pct(winStart) + "%", width: (pct(winEnd) - pct(winStart)) + "%" }} />
        <div className="hd impact" style={{ left: pct(marker) + "%" }} />
      </div>

      <div className="winlabels">
        <span>{fmt(t0)}</span>
        <span className="cur">⛳ {fmt(marker)}</span>
        <span>{fmt(tN)}</span>
      </div>

      <div className="winrow">
        <button className="prev" onClick={startPreview}>{playing ? tr.winstop : tr.winprev}</button>
      </div>

      <button className="cta-cam" onClick={() => { stopPreview(); onAnalyze(marker); }}>{tr.impanalyze}</button>
      <div className="row"><button className="btn g" onClick={() => { stopPreview(); onCancel(); }}>{tr.cancel}</button></div>
    </>
  );
}
