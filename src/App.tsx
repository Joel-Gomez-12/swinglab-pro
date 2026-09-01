/* SwingLab Pro — React app shell. All AI pose work runs in the browser
   (nothing is uploaded). Stripe Checkout handles the founder payment; a
   Netlify webhook records who paid in Supabase. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { T, PILL, type Lang } from "./data/i18n";
import {
  initPose, getLandmarker, makePhaseItem, grabThumb, CONN, DEMO8,
  autoImpactTime,
  type Frame, type View,
} from "./lib/pose";
import { recorderSupported, recordStream, createSessionRecorder, loadVideo, extractRich, decodeAudio } from "./lib/videoProcessor";
import { analyzeSwing as runSwingAnalysis, type SwingResult } from "./lib/swingAnalyzer";
import { detectSwings } from "./lib/multiSwing";
import ResultsView, { type Results } from "./components/Results";
import Checklist from "./components/Checklist";
import ImpactMarker from "./components/ImpactMarker";
import SessionView from "./components/SessionView";
import SwingList from "./components/SwingList";
import { addSwing, buildRecord, getSession, clearSession, type SwingRecord } from "./lib/session";
import { computeSwingSummary, type SwingSummary } from "./lib/metrics";
import { startFounderCheckout } from "./lib/checkout";

type ViewId = "v-up" | "v-cam" | "v-an" | "v-imp" | "v-res" | "v-err" | "v-ses" | "v-list";

function initialLang(): Lang {
  const l = (navigator.language || "es").slice(0, 2);
  if (l === "en") return "en";
  if (l === "zh") return "zh";
  return "es";
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang());
  const [view, setView] = useState<ViewId>("v-up");
  const [camAngle, setCamAngle] = useState<View>("front");
  const [agree, setAgree] = useState(false);
  const [consentFlash, setConsentFlash] = useState(false);
  const [showCwarn, setShowCwarn] = useState(false);
  const [guideCollapsed, setGuideCollapsed] = useState(true);
  const [anaPct, setAnaPct] = useState(0);
  const [anaMsg, setAnaMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [errDet, setErrDet] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [cd, setCd] = useState("");
  const [recActive, setRecActive] = useState(false);
  const [recBtnDisabled, setRecBtnDisabled] = useState(false);
  const [ctaMsg, setCtaMsg] = useState("");
  const [paidBanner, setPaidBanner] = useState(false);
  // impact-marker state
  const [allFrames, setAllFrames] = useState<Frame[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [markerInit, setMarkerInit] = useState(0);
  const [impactInfo, setImpactInfo] = useState<SwingResult["impact"] | null>(null);
  const [swingMetrics, setSwingMetrics] = useState<SwingSummary | null>(null);
  const [session, setSession] = useState<SwingRecord[]>([]);
  const [sessionSwings, setSessionSwings] = useState<SwingResult[]>([]);
  const [fromList, setFromList] = useState(false);
  const [sesRec, setSesRec] = useState(false);
  const videoUrlRef = useRef<string | null>(null);
  const audioRef = useRef<AudioBuffer | null>(null);
  const allFramesRef = useRef<Frame[]>([]);
  const markerUsedRef = useRef(0);
  const sessionModeRef = useRef(false);
  const sesRecorderRef = useRef<{ stop: () => Promise<Blob> } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const recordingRef = useRef(false);
  const recFramesRef = useRef<Frame[]>([]);
  const facingRef = useRef<"environment" | "user">("environment");
  const camReadyRef = useRef(false);
  const tsRef = useRef(0);
  const lastThumbRef = useRef<any>(null);
  const lastThumbTRef = useRef(0);
  const langRef = useRef<Lang>(lang);
  const camAngleRef = useRef<View>(camAngle);
  const creepRef = useRef(0);

  useEffect(() => { langRef.current = lang; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { camAngleRef.current = camAngle; }, [camAngle]);

  useEffect(() => { setSession(getSession()); }, []);

  // Show a confirmation if the user returned from a successful Stripe Checkout.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") === "1") {
      setPaidBanner(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const show = useCallback((id: ViewId) => { setView(id); scrollTop(); }, []);
  const setAna = useCallback((p: number, msg?: string) => { setAnaPct(Math.round(p)); if (msg) setAnaMsg(msg); }, []);
  // The model download and camera warmup aren't measurable, so creep the % up
  // slowly toward a cap instead of leaving it frozen at a low number.
  const stopCreep = useCallback(() => { if (creepRef.current) { clearInterval(creepRef.current); creepRef.current = 0; } }, []);
  const creepTo = useCallback((from: number, cap: number, msgKey: string, step: number, ms: number) => {
    stopCreep();
    let p = from; setAna(p, T[langRef.current][msgKey]);
    creepRef.current = window.setInterval(() => { p = Math.min(p + step, cap); setAna(p, T[langRef.current][msgKey]); }, ms);
  }, [setAna, stopCreep]);
  const fail = useCallback((msg: string, det?: string) => {
    stopCreep();
    setErrMsg(msg);
    setErrDet(det ? "Detalle técnico: " + det : "");
    show("v-err");
  }, [show, stopCreep]);

  const consentOK = useCallback(() => {
    if (agree) return true;
    setConsentFlash(true);
    setShowCwarn(true);
    document.getElementById("consent")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }, [agree]);

  /* ---- impact-first pipeline (V2: automatic, marker is an optional override) */
  const revokeVideo = useCallback(() => {
    if (videoUrlRef.current) { URL.revokeObjectURL(videoUrlRef.current); videoUrlRef.current = null; }
    setVideoUrl(null);
  }, []);

  // Runs detection + phases at the given impact time, shows results, and saves
  // the swing's numeric summary to the local session (V3).
  const runAnalysis = useCallback((markerT: number, manual = false) => {
    markerUsedRef.current = markerT;
    show("v-an"); setAna(55, T[langRef.current].detimpact);
    setTimeout(() => {
      try {
        setAna(75, T[langRef.current].detmotion);
        const res = runSwingAnalysis(allFramesRef.current, audioRef.current, markerT, camAngleRef.current, langRef.current, PILL, manual);
        setAna(92, T[langRef.current].detphases);
        setImpactInfo(res.impact);
        setSwingMetrics(computeSwingSummary(res.items, res.ctx));
        setResults({ mode: "real", items: res.items, ctx: res.ctx });
        const now = Date.now();
        setSession(addSwing(buildRecord(res.items, res.ctx, res.impact.impactConfidenceScore, now)));
        show("v-res");
      } catch (e: any) { fail(T[langRef.current].camfew, String(e?.message || e).slice(0, 120)); }
    }, 60);
  }, [fail, setAna, show]);

  // Set up frames/audio/video then auto-analyze (V2 happy path).
  const beginAnalysis = useCallback((frames: Frame[], url: string | null, audio: AudioBuffer | null) => {
    revokeVideo();
    if (url) { videoUrlRef.current = url; setVideoUrl(url); }
    audioRef.current = audio;
    allFramesRef.current = frames; setAllFrames(frames);
    setSessionSwings([]); setFromList(false);
    runAnalysis(autoImpactTime(frames));
  }, [revokeVideo, runAnalysis]);

  // "⛳ Ajustar impacto": open the manual marker with the last-used impact.
  const openAdjustImpact = useCallback(() => {
    if (!allFramesRef.current.length) return;
    setMarkerInit(markerUsedRef.current || autoImpactTime(allFramesRef.current));
    show("v-imp");
  }, [show]);
  const cancelImpact = useCallback(() => { show(results ? "v-res" : "v-up"); }, [results, show]);

  /* SESSION: segment a long clip into many swings, analyze each, list them. */
  const analyzeSession = useCallback((frames: Frame[], url: string | null, audio: AudioBuffer | null) => {
    revokeVideo();
    if (url) { videoUrlRef.current = url; setVideoUrl(url); }
    audioRef.current = audio;
    allFramesRef.current = frames; setAllFrames(frames);
    setAna(85, T[langRef.current].detphases);
    const impacts = detectSwings(frames);
    if (impacts.length <= 1) { runAnalysis(impacts.length === 1 ? frames[impacts[0]].t : autoImpactTime(frames)); return; }
    const swings = impacts.map((idx) => runSwingAnalysis(frames, audioRef.current, frames[idx].t, camAngleRef.current, langRef.current, PILL));
    const now = Date.now();
    let last = session;
    swings.forEach((s, i) => { last = addSwing(buildRecord(s.items, s.ctx, s.impact.impactConfidenceScore, now + i)); });
    setSession(last);
    setSessionSwings(swings);
    show("v-list");
  }, [revokeVideo, runAnalysis, session, show]);

  const openSessionSwing = useCallback((i: number) => {
    const s = sessionSwings[i]; if (!s) return;
    setImpactInfo(s.impact);
    setSwingMetrics(computeSwingSummary(s.items, s.ctx));
    setResults({ mode: "real", items: s.items, ctx: s.ctx });
    setFromList(true);
    show("v-res");
  }, [sessionSwings, show]);

  /* Turn a recorded Blob or uploaded File into frames + audio on one timeline. */
  const processMedia = useCallback(async (src: Blob | File) => {
    const isSession = sessionModeRef.current;
    show("v-an"); creepTo(4, 18, "dl", 2, 160);
    try {
      await initPose();
      const { video, url } = await loadVideo(src);
      videoUrlRef.current = url;
      stopCreep();
      const frames = await extractRich(video, setAna, T[langRef.current].proc);
      if (frames.length < 6) { revokeVideo(); throw new Error("few"); }
      setAna(64, T[langRef.current].proc);
      const audio = await decodeAudio(src);
      if (isSession) analyzeSession(frames, url, audio); else beginAnalysis(frames, url, audio);
    } catch (e: any) {
      revokeVideo();
      const raw = String((e && (e.message || e.name)) || "?");
      if (e && e.message === "few") fail(T[langRef.current].camfew, "");
      else fail(T[langRef.current].vidformat, raw.replace(/</g, "&lt;").slice(0, 200));
    }
  }, [analyzeSession, beginAnalysis, creepTo, fail, revokeVideo, setAna, stopCreep]);

  // Manual per-phase adjustment: move one phase to an adjacent frame, keeping the
  // 8 phases in order, and recompute that card (thumb + marks + verdict).
  const nudgePhase = useCallback((k: number, dir: number) => {
    setResults(prev => {
      if (!prev || prev.mode !== "real") return prev;
      const { items, ctx } = prev;
      const n = ctx.frames.length;
      const lo = k > 0 ? items[k - 1]._idx + 1 : 0;
      const hi = k < 7 ? items[k + 1]._idx - 1 : n - 1;
      let idx = items[k]._idx + dir;
      idx = Math.max(lo, Math.min(hi, idx));
      if (idx === items[k]._idx) return prev;
      const ni = makePhaseItem(ctx.frames, idx, k, ctx.A, ctx.SM, ctx.view, langRef.current, PILL, ctx.refOK);
      const newItems = items.slice(); newItems[k] = ni;
      return { mode: "real", items: newItems, ctx };
    });
  }, []);

  /* ---- live camera preview + skeleton overlay ------------------------ */
  const drawOverlay = useCallback((lm: any) => {
    const cam = videoRef.current, ov = canvasRef.current;
    if (!cam || !ov) return;
    const w = cam.clientWidth, h = cam.clientHeight;
    if (ov.width !== w) ov.width = w; if (ov.height !== h) ov.height = h;
    const ctx = ov.getContext("2d")!; ctx.clearRect(0, 0, w, h);
    if (!lm) return;
    const vw = cam.videoWidth || w, vh = cam.videoHeight || h;
    const sc = Math.min(w / vw, h / vh); const dw = vw * sc, dh = vh * sc;
    const ox = (w - dw) / 2, oy = (h - dh) / 2;
    const P = (i: number) => ({ x: ox + lm[i].x * dw, y: oy + lm[i].y * dh });
    ctx.lineCap = "round"; ctx.strokeStyle = "rgba(232,206,130,.95)"; ctx.lineWidth = 4;
    CONN.forEach((c) => { const a = P(c[0]), b = P(c[1]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
  }, []);

  const loop = useCallback(() => {
    if (!camReadyRef.current) return;
    const cam = videoRef.current;
    const landmarker = getLandmarker();
    if (cam && landmarker && cam.readyState >= 2) {
      let res: any = null;
      tsRef.current = Math.max(tsRef.current + 1, Math.round(performance.now()));
      try { res = landmarker.detectForVideo(cam, tsRef.current); } catch (e) { /* */ }
      const lm = res && res.landmarks && res.landmarks[0] ? res.landmarks[0] : null;
      drawOverlay(lm);
      if (recordingRef.current && lm) {
        const _n = performance.now();
        if (_n - lastThumbTRef.current >= 55) { lastThumbRef.current = grabThumb(cam); lastThumbTRef.current = _n; }
        recFramesRef.current.push({ t: _n / 1000, lm, thumb: lastThumbRef.current });
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [drawOverlay]);

  const stopCamera = useCallback(() => {
    stopCreep();
    recordingRef.current = false; camReadyRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0;
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setRecActive(false); setCd("");
  }, [stopCreep]);

  const startCamera = useCallback(async () => {
    if (!consentOK()) return;
    show("v-an");
    creepTo(8, 44, "dl", 2, 160);                // creep while the AI model loads
    try { await initPose(); } catch (e: any) { fail(T[langRef.current].camdenied, String(e?.message || e).slice(0, 160)); return; }
    creepTo(52, 92, "init", 3, 150);             // creep while the camera warms up
    try {
      // audio:true so the recorded clip carries the club–ball "click" for impact detection
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingRef.current, width: { ideal: 720 }, height: { ideal: 960 } }, audio: true });
    } catch (e) {
      try { streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingRef.current }, audio: false }); }
      catch (e2) {
        try { streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
        catch (e3: any) { fail(T[langRef.current].camdenied, String(e3?.name || e3)); return; }
      }
    }
    const cam = videoRef.current!;
    cam.srcObject = streamRef.current;
    await new Promise<void>((r) => { cam.onloadedmetadata = () => r(); });
    try { await cam.play(); } catch (e) { /* */ }
    stopCreep(); setAna(100, T[langRef.current].init);
    camReadyRef.current = true; show("v-cam"); setRecBtnDisabled(false); loop();
  }, [consentOK, creepTo, fail, loop, setAna, show, stopCreep]);

  const flipCam = useCallback(async () => {
    facingRef.current = facingRef.current === "environment" ? "user" : "environment";
    stopCamera(); await startCamera();
  }, [startCamera, stopCamera]);

  /* ---- recording ----------------------------------------------------- */
  // Preferred path records a Blob (video+audio) and re-processes it so audio and
  // frames share one timeline. Fallback (no MediaRecorder) uses the live frames.
  const finishRecording = useCallback((blob: Blob | null, liveFrames: Frame[]) => {
    setRecActive(false); setRecBtnDisabled(false);
    stopCamera();
    if (blob && blob.size > 0) { processMedia(blob); return; }
    if (liveFrames.length < 6) { show("v-up"); setTimeout(() => fail(T[langRef.current].camfew, ""), 50); return; }
    beginAnalysis(liveFrames, null, null);
  }, [beginAnalysis, fail, processMedia, show, stopCamera]);

  const startRec = useCallback(() => {
    recFramesRef.current = []; lastThumbRef.current = null; lastThumbTRef.current = 0;
    recordingRef.current = true; setRecActive(true);
    const stream = streamRef.current;
    const hasAudio = !!stream && stream.getAudioTracks().length > 0;
    if (recorderSupported() && stream && hasAudio) {
      recordStream(stream, 6000)
        .then((blob) => finishRecording(blob, recFramesRef.current.slice()))
        .catch(() => finishRecording(null, recFramesRef.current.slice()));
    } else {
      setTimeout(() => finishRecording(null, recFramesRef.current.slice()), 6000);
    }
  }, [finishRecording]);

  const recordSwing = useCallback(() => {
    if (recordingRef.current) return;
    setRecBtnDisabled(true);
    let n = 3; setCd(String(n));
    const tick = () => {
      n--;
      if (n > 0) { setCd(String(n)); setTimeout(tick, 1000); }
      else if (n === 0) { setCd(T[langRef.current].go); setTimeout(tick, 700); }
      else { setCd(""); startRec(); }
    };
    setTimeout(tick, 1000);
  }, [startRec]);

  /* ---- upload -------------------------------------------------------- */
  const pick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    sessionModeRef.current = false;
    if (!consentOK()) return; if (f) processMedia(f);
  }, [consentOK, processMedia]);
  const pickSession = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    sessionModeRef.current = true;
    if (!consentOK()) return; if (f) processMedia(f);
  }, [consentOK, processMedia]);

  // Session recording: start a stoppable recorder, hit many balls, then stop.
  const startSessionRec = useCallback(() => {
    if (!recorderSupported() || !streamRef.current) return;
    sessionModeRef.current = true;
    sesRecorderRef.current = createSessionRecorder(streamRef.current);
    setSesRec(true);
  }, []);
  const stopSessionRec = useCallback(async () => {
    const r = sesRecorderRef.current; sesRecorderRef.current = null; setSesRec(false);
    if (!r) return;
    const blob = await r.stop();
    stopCamera();
    processMedia(blob);
  }, [processMedia, stopCamera]);

  /* ---- demo ---------------------------------------------------------- */
  const demo = useCallback(() => {
    const items = DEMO8.map((d, k) => {
      const p = Object.assign({}, d);
      const lab = PILL[d.key] ? PILL[d.key][langRef.current === "en" ? "en" : "es"] : "";
      p.errors = d.ep ? [{ part: d.ep.part, label: lab, dx: d.ep.dx, dy: d.ep.dy }] : [];
      p._key = d.key; p._i = k; return p;
    });
    setResults({ mode: "demo", items }); show("v-res");
  }, [show]);

  const resetAll = useCallback(() => { setResults(null); setImpactInfo(null); setSwingMetrics(null); setSessionSwings([]); setFromList(false); sessionModeRef.current = false; stopCamera(); revokeVideo(); setAllFrames([]); show("v-up"); }, [revokeVideo, show, stopCamera]);

  const onBecomeFounder = useCallback(async () => {
    setCtaMsg(T[langRef.current].checkoutwait);
    try { await startFounderCheckout(langRef.current); }
    catch (e) { setCtaMsg(T[langRef.current].checkouterr); }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const tr = T[lang];
  const H = (html: string) => ({ dangerouslySetInnerHTML: { __html: html } });

  return (
    <div className="wrap">
      <div className="bar">
        <div className="brand">
          <div className="dot">⛳</div>
          <div>
            <div className="nm">SwingLab <span style={{ color: "var(--gdl)" }}>Pro</span></div>
            <div className="sub">by PIAITIC · PIA Dreams</div>
          </div>
        </div>
        <div className="lang">
          <button className={lang === "es" ? "on" : ""} onClick={() => setLang("es")}>ES</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button className={lang === "zh" ? "on" : ""} onClick={() => setLang("zh")}>中文</button>
        </div>
      </div>

      {paidBanner && (
        <div className="allok" style={{ marginBottom: 16 }}>{tr.paidok}</div>
      )}

      <div className="card">
        <div className="hd">
          <div className="kick">{tr.kick}</div>
          <h1>{tr.h1}</h1>
          <p {...H(tr.hp)} />
        </div>
        <div className="bd">
          {/* ---- upload / start view ---- */}
          <div className={"view" + (view === "v-up" ? " on" : "")}>
            <div className="flow">
              <div className="st"><b>1</b><span>{tr.s1}</span></div>
              <div className="st"><b>2</b><span>{tr.s2}</span></div>
              <div className="st"><b>3</b><span>{tr.s3}</span></div>
              <div className="st"><b>4</b><span>{tr.s4}</span></div>
            </div>
            <button className="checkbtn" onClick={() => setCheckOpen(true)}>{tr.checkopen}</button>
            {session.length > 0 && (
              <button className="checkbtn" style={{ marginTop: 8 }} onClick={() => show("v-ses")}>📊 {tr.sesopen} ({session.length})</button>
            )}
            <div className="viewsel">
              <div className="viewlab">{tr.viewq}</div>
              <div className="viewpills">
                <button className={"viewpill" + (camAngle === "front" ? " on" : "")} onClick={() => setCamAngle("front")}>{tr.viewfront}</button>
                <button className={"viewpill" + (camAngle === "dtl" ? " on" : "")} onClick={() => setCamAngle("dtl")}>{tr.viewback}</button>
              </div>
              <div className="viewhint">{tr.viewhint}</div>
            </div>
            <div className={"consent" + (consentFlash ? " flash" : "")} id="consent">
              <div className="pv" {...H(tr.privacy)} />
              <label>
                <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setConsentFlash(false); setShowCwarn(false); }} />
                <span>{tr.consent}</span>
              </label>
              {showCwarn && <div style={{ marginTop: 9, fontSize: 12, fontWeight: 600, color: "var(--org)" }}>{tr.consentwarn}</div>}
            </div>
            <button className="cta-cam" style={{ marginTop: 16 }} onClick={startCamera}>{tr.camstart}</button>
            <div className="sub-up">
              <span>{tr.oruplo}</span>{" "}
              <label>📁 <span>{tr.upl}</span><input ref={fileRef} type="file" accept="video/*" hidden onChange={pick} /></label>
            </div>
            <div className="sub-up" style={{ marginTop: 4 }}>
              <label>🎯 <span>{tr.sesupload}</span><input type="file" accept="video/*" hidden onChange={pickSession} /></label>
            </div>
            <div className={"guide" + (guideCollapsed ? " col" : "")}>
              <div className="gh" onClick={() => setGuideCollapsed((v) => !v)}><span>{tr.gh}</span><span>{guideCollapsed ? "＋" : "－"}</span></div>
              <div className="gi">
                <div className="it"><span className="e">☀️</span><span {...H(tr.g1)} /></div>
                <div className="it"><span className="e">🧍</span><span {...H(tr.g2)} /></div>
                <div className="it"><span className="e">📐</span><span {...H(tr.g3)} /></div>
                <div className="it"><span className="e">🎬</span><span {...H(tr.g4)} /></div>
              </div>
              <div className="bad" {...H(tr.gbad)} />
            </div>
            <div className="demo-row"><button onClick={demo}>{tr.demo}</button></div>
          </div>

          {/* ---- camera view ---- */}
          <div className={"view" + (view === "v-cam" ? " on" : "")}>
            <div className="camwrap">
              <video ref={videoRef} autoPlay playsInline muted />
              <canvas ref={canvasRef} />
              <div className={"recdot" + (recActive ? " on" : "")}><i></i><span>{tr.recing}</span></div>
              <div className="cd">{cd}</div>
            </div>
            <div className="camhint">{tr.camhint}</div>
            {sesRec ? (
              <div className="row"><button className="btn p" onClick={stopSessionRec}>■ {tr.sesstop}</button></div>
            ) : (
              <>
                <div className="row"><button className="btn p" disabled={recBtnDisabled} onClick={recordSwing}>{tr.recnow}</button></div>
                {recorderSupported() && (
                  <div className="row"><button className="checkbtn" style={{ margin: 0 }} onClick={startSessionRec}>🎯 {tr.sesrec}</button></div>
                )}
              </>
            )}
            <div className="row">
              <button className="btn g" onClick={flipCam}>{tr.flip}</button>
              <button className="btn g" onClick={() => { stopCamera(); show("v-up"); }}>{tr.cancel}</button>
            </div>
          </div>

          {/* ---- analyzing view ---- */}
          <div className={"view" + (view === "v-an" ? " on" : "")}>
            <div className="ana">
              <div className="spin"></div>
              <div className="msg">{anaMsg}</div>
              <div className="pct">{anaPct}%</div>
              <div className="note">{tr.note}</div>
            </div>
          </div>

          {/* ---- impact marker view ---- */}
          <div className={"view" + (view === "v-imp" ? " on" : "")}>
            {view === "v-imp" && allFrames.length > 0 && (
              <ImpactMarker
                frames={allFrames}
                videoUrl={videoUrl}
                lang={lang}
                initMarker={markerInit}
                onAnalyze={(t) => runAnalysis(t, true)}
                onCancel={cancelImpact}
              />
            )}
          </div>

          {/* ---- results view ---- */}
          <div className={"view" + (view === "v-res" ? " on" : "")}>
            {results && <ResultsView results={results} lang={lang} onNudge={nudgePhase} />}
            {impactInfo && results?.mode === "real" && (
              <div className="impinfo">
                <span>⛳ {tr.impconf}: <b>{impactInfo.impactConfidenceScore}%</b></span>
                <span className="sig">
                  {impactInfo.breakdown.audio != null && <>🔊 {impactInfo.breakdown.audio} </>}
                  {impactInfo.breakdown.club != null && <>🏌 {impactInfo.breakdown.club} </>}
                  {impactInfo.breakdown.ball != null && <>⚪ {impactInfo.breakdown.ball}</>}
                </span>
                {impactInfo.impactBetweenFrames && <span className="between">{tr.impbetween}</span>}
              </div>
            )}
            {impactInfo && impactInfo.impactConfidenceScore < 35 && (
              <div className="lowconfhint">{tr.lowconfhint}</div>
            )}
            {swingMetrics && (
              <div className="metrics">
                <div className="fixh">{tr.mtitle}</div>
                <div className="mgrid">
                  <div className="mtile"><span className="ml">{tr.m_spine}</span><span className="mv">{swingMetrics.spineAddress}°</span></div>
                  <div className="mtile"><span className="ml">{tr.m_shoulder}</span><span className="mv">{swingMetrics.shoulderTop}°</span></div>
                  <div className="mtile"><span className="ml">{tr.m_hip}</span><span className="mv">{swingMetrics.hipTop}°</span></div>
                  <div className="mtile"><span className="ml">{tr.m_knee}</span><span className="mv">{swingMetrics.kneeAddress}°</span></div>
                  <div className="mtile"><span className="ml">{tr.m_head}</span><span className="mv">{tr["dir_" + swingMetrics.headSwayDir]}</span></div>
                  <div className="mtile"><span className="ml">{tr.m_balance}</span><span className="mv">{Math.abs(swingMetrics.balanceFinish) < 0.15 ? tr.dir_stable : (swingMetrics.balanceFinish > 0 ? "→" : "←")}</span></div>
                </div>
                <div className="exhint">{tr.mapprox}</div>
              </div>
            )}
            <div className="row">
              <button className="btn g" onClick={openAdjustImpact}>⛳ {tr.adjimpact}</button>
              <button className="btn g" onClick={() => show("v-ses")}>📊 {tr.sesopen} ({session.length})</button>
            </div>
            {fromList && (
              <div className="row"><button className="btn p" onClick={() => show("v-list")}>← {tr.swback}</button></div>
            )}
            <div className="cta">
              <span className="badge">{tr.ctab}</span>
              <h4>{tr.ctah}</h4>
              <p>{tr.ctap}</p>
              <div className="btns">
                <button className="linklike p" onClick={onBecomeFounder}>{tr.cta1}</button>
                <a className="s" href="index.html#formacion">{tr.cta2}</a>
              </div>
              {ctaMsg && <p style={{ marginTop: 12, marginBottom: 0 }}>{ctaMsg}</p>}
            </div>
            <div className="row"><button className="btn g" onClick={resetAll}>{tr.reset}</button></div>
            <div className="disc">{tr.disc}</div>
          </div>

          {/* ---- error view ---- */}
          <div className={"view" + (view === "v-err" ? " on" : "")}>
            <div className="err"><div>{errMsg}</div><div className="det">{errDet}</div></div>
            <div className="row">
              <button className="btn p" onClick={() => show("v-up")}>{tr.retry}</button>
              <button className="btn g" onClick={demo}>{tr.seeex}</button>
            </div>
          </div>

          {/* ---- session swing list (V3 multi-swing) ---- */}
          <div className={"view" + (view === "v-list" ? " on" : "")}>
            {view === "v-list" && (
              <SwingList
                lang={lang}
                swings={sessionSwings}
                onOpen={openSessionSwing}
                onBack={resetAll}
                onSession={() => show("v-ses")}
              />
            )}
          </div>

          {/* ---- session / stats view (V3) ---- */}
          <div className={"view" + (view === "v-ses" ? " on" : "")}>
            {view === "v-ses" && (
              <SessionView
                lang={lang}
                records={session}
                onClear={() => { clearSession(); setSession([]); }}
                onBack={() => show(results ? "v-res" : "v-up")}
              />
            )}
          </div>
        </div>
      </div>

      <div className="foot">
        <b>SwingLab Pro</b> · <span>{tr.foot}</span><br />
        <a href="terminos.html" style={{ color: "inherit", textDecoration: "underline" }}>{tr.ltos}</a> ·{" "}
        <a href="privacidad.html" style={{ color: "inherit", textDecoration: "underline" }}>{tr.lpriv}</a>
      </div>

      {checkOpen && <Checklist lang={lang} onClose={() => setCheckOpen(false)} />}
    </div>
  );
}
