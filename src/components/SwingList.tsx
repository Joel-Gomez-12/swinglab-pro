/* SwingList (V3 session) — the swings detected in one recording, as Swing 1, 2,
   3… Tap one to open its full 8-position analysis. */
import { T, V, type Lang } from "../data/i18n";
import type { SwingResult } from "../lib/swingAnalyzer";

function vLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }

export default function SwingList({
  lang, swings, onOpen, onBack, onSession,
}: {
  lang: Lang;
  swings: SwingResult[];
  onOpen: (i: number) => void;
  onBack: () => void;
  onSession: () => void;
}) {
  const tr = T[lang];
  const mainFault = (s: SwingResult) => {
    const f = s.items.find((p) => p._warn && p._key !== "lowconf");
    if (!f) return { txt: tr.swok, warn: false };
    return { txt: V[f._key] ? V[f._key][vLang(lang)].m : f._key, warn: true };
  };

  return (
    <div className="sesblock">
      <div className="rhead">{tr.swtitle} — {swings.length} {tr.sesswings}</div>
      {swings.length === 0 ? (
        <div className="allok">{tr.swnone}</div>
      ) : (
        <div className="swlist">
          {swings.map((s, i) => {
            const mf = mainFault(s);
            const thumb = s.items[0]?.thumb;
            return (
              <button className="swcard" key={i} onClick={() => onOpen(i)}>
                <div className="swthumb">{thumb ? <img src={thumb} alt="" /> : null}</div>
                <div className="swinfo">
                  <div className="swn">{tr.swone} {i + 1}</div>
                  <div className={"swfault " + (mf.warn ? "warn" : "ok")}>{mf.txt}</div>
                  <div className="swconf">⛳ {s.impact.impactConfidenceScore}%</div>
                </div>
                <div className="swgo">→</div>
              </button>
            );
          })}
        </div>
      )}
      <div className="row">
        <button className="btn p" onClick={onSession}>📊 {tr.sesopen}</button>
        <button className="btn g" onClick={onBack}>{tr.sesback}</button>
      </div>
    </div>
  );
}
