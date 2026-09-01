/* SessionView (V3) — the "coach" screen. Aggregates the numeric summaries of the
   swings recorded this session and surfaces the most repeated fault, e.g.
   "in 70% of your last 20 swings you move your head". Data is local only. */
import { useState } from "react";
import { T, V, PHN, type Lang } from "../data/i18n";
import { faultStats, avgConfidence, headSwayStats, type SwingRecord } from "../lib/session";
import { getWeights, setWeights, DEFAULT_WEIGHTS } from "../lib/config";

function vLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }

export default function SessionView({
  lang, records, onClear, onBack,
}: {
  lang: Lang;
  records: SwingRecord[];
  onClear: () => void;
  onBack: () => void;
}) {
  const tr = T[lang];
  const n = records.length;
  const stats = faultStats(records);
  const [w, setW] = useState(getWeights());
  const [showAdj, setShowAdj] = useState(false);
  const upd = (k: "audio" | "club" | "ball", v: number) => { const nw = { ...w, [k]: v }; setW(nw); setWeights(nw); };
  const top = stats[0];
  const label = (key: string) => (V[key] ? V[key][vLang(lang)].m : key);
  const phaseOf = (key: string) => {
    const rec = records.find((r) => r.faults.some((f) => f.key === key));
    const f = rec?.faults.find((x) => x.key === key);
    return f ? PHN[vLang(lang)][f.phase] : "";
  };

  return (
    <div className="sesblock">
      <div className="rhead">{tr.sestitle} — {n} {tr.sesswings}</div>

      {n === 0 ? (
        <div className="allok">{tr.sesnone}</div>
      ) : (
        <>
          {top && (
            <div className="sestop">
              <div className="sestop-h">{tr.sestop}</div>
              <div className="sestop-m">{label(top.key)}</div>
              <div className="sestop-s">
                <b>{top.pct}%</b> · {tr.sesin.replace("{x}", String(top.count)).replace("{n}", String(n))}
                {phaseOf(top.key) && <> · {phaseOf(top.key)}</>}
              </div>
            </div>
          )}

          {(() => {
            const hs = headSwayStats(records)[0];
            if (!hs || hs.dir === "stable" || hs.pct < 40) return null;
            return (
              <div className="sestrend">
                🏌 {tr.seshead}: <b>{tr["dir_" + hs.dir]}</b> · {hs.pct}% {tr.sesin.replace("{x}", String(hs.count)).replace("{n}", String(records.filter(r => r.metrics).length))}
              </div>
            );
          })()}

          <div className="sesconf">{tr.sesconf}: <b>{avgConfidence(records)}%</b></div>

          {stats.length > 1 && (
            <div className="seslist">
              <div className="fixh">{tr.sesall}</div>
              {stats.map((s) => (
                <div className="sesrow" key={s.key}>
                  <span className="sesbar" style={{ width: Math.max(6, s.pct) + "%" }} />
                  <span className="seslabel">{label(s.key)}</span>
                  <span className="sespct">{s.pct}% ({s.count}/{n})</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="wadj">
        <div className="gh" onClick={() => setShowAdj((v) => !v)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
          <span>⚙️ {tr.wtitle}</span><span>{showAdj ? "－" : "＋"}</span>
        </div>
        {showAdj && (
          <div className="wbody">
            {(["audio", "club", "ball"] as const).map((k) => (
              <label className="wrow" key={k}>
                <span>{k === "audio" ? "🔊" : k === "club" ? "🏌" : "⚪"} {tr["w_" + k]}</span>
                <input type="range" min={0} max={1} step={0.05} value={w[k]} onChange={(e) => upd(k, +e.target.value)} />
                <b>{w[k].toFixed(2)}</b>
              </label>
            ))}
            <button className="btn g" style={{ marginTop: 8 }} onClick={() => { setW(DEFAULT_WEIGHTS); setWeights(DEFAULT_WEIGHTS); }}>{tr.wreset}</button>
          </div>
        )}
      </div>

      <div className="row">
        <button className="btn p" onClick={onBack}>{tr.sesback}</button>
        {n > 0 && <button className="btn g" onClick={onClear}>{tr.sesnew}</button>}
      </div>
    </div>
  );
}
