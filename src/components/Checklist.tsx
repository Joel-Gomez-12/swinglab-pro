/* Pre-shot playing checklist modal. Mirrors the original renderCheck(). */
import { useState } from "react";
import { CHECKUI, CHECKDATA, type Lang } from "../data/i18n";

export default function Checklist({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [club, setClub] = useState(0);
  const ui = CHECKUI[lang];
  const d = CHECKDATA[lang];
  if (!d) return null;

  return (
    <div className="cmodal on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cbox">
        <button className="cclose" onClick={onClose}>✕</button>
        <div className="chead">{ui.title}</div>
        <div className="cintro">{ui.intro}</div>
        <div className="cpills">
          {d.clubs.map((c, i) => (
            <button key={i} className={"cpill" + (i === club ? " on" : "")} onClick={() => setClub(i)}>{c.n}</button>
          ))}
        </div>
        <div className="cpoints">
          <ol>{d.clubs[club].p.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </div>
        <div className="cgenh">{ui.genh}</div>
        <div className="cgen">
          {d.gen.map((x, i) => (
            <div className="cgi" key={i}><span className="cgn">{i + 1}</span><span>{x}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
