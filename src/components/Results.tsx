/* Renders the 8-position result grid + practice plan + export buttons.
   Mirrors the original renderResults(). */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { T, PHN, V, FORMANCHOR, type Lang } from "../data/i18n";
import { overlaySvg, dlFrame, dlLanding, dlSheet } from "../lib/overlay";
import type { StoryItem, AnalysisCtx } from "../lib/pose";
import PG from "../lib/pgFigure";

export type Results =
  | { mode: "real"; items: StoryItem[]; ctx: AnalysisCtx }
  | { mode: "demo"; items: any[] };

function vLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }
function phLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }

export default function ResultsView({ results, lang, onNudge }: { results: Results; lang: Lang; onNudge?: (k: number, dir: number) => void }) {
  const story = results.items;
  const issues: { nm: string; f: string; key: string }[] = [];

  const cards = story.map((p: any, i: number) => {
    const nm = PHN[phLang(lang)][p._i];
    const key = p._key;
    const vd = V[key] ? V[key][vLang(lang)] : { m: "", f: null };
    let warn = false;
    let stageHtml = "";
    let isImg = false;
    let thumb: string | null = null;

    if (results.mode === "real") {
      warn = !!p._warn;
      if (p.thumb) {
        isImg = true;
        thumb = p.thumb;
        stageHtml = ((p.marks && p.marks.length) || p.ref) ? overlaySvg(p) : "";
      } else {
        stageHtml = '<div class="noimg">' + (p.pill || nm) + "</div>";
      }
    } else {
      warn = !!(p.errors && p.errors.length);
      stageHtml = PG.figure(p, { style: "mannequin" });
    }

    if (vd.f) issues.push({ nm, f: vd.f, key });

    return (
      <div className="pos" key={i}>
        <div className="num">{T[lang].posw} {i + 1}</div>
        <div className="nm">{nm}</div>
        <div className="stage">
          {isImg && thumb ? (
            <>
              <img src={thumb} alt="" />
              {stageHtml && <span dangerouslySetInnerHTML={{ __html: stageHtml }} />}
              <button className="dl" onClick={() => dlFrame(story as StoryItem[], i)} aria-label="download">⤓</button>
            </>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: stageHtml }} />
          )}
        </div>
        {results.mode === "real" && onNudge && (
          <div className="phaseadj">
            <button onClick={() => onNudge(i, -1)} aria-label="prev frame">◄</button>
            <span>{T[lang].frameadj}</span>
            <button onClick={() => onNudge(i, 1)} aria-label="next frame">►</button>
          </div>
        )}
        <div className={"verdict " + (warn ? "warn" : "ok")}>
          <span className="d"></span>
          <span>{vd.m}</span>
        </div>
      </div>
    );
  });

  const hasThumbs = results.mode === "real" && (story[0] as StoryItem) && "thumb" in story[0];

  return (
    <div className="resblock">
      <div className="rhead">{T[lang].resh}</div>
      <div className="grid">{cards}</div>
      <div className="fixes">
        {issues.length ? (
          <>
            <div className="fixh">{T[lang].plan}</div>
            {issues.map((x, k) => (
              <div className="fix" key={k}>
                <b>{x.nm}:</b>{" "}
                <span dangerouslySetInnerHTML={{ __html: x.f }} />
                <a className="prolink" href={"index.html#" + (FORMANCHOR[x.key] || "formacion")} target="_blank" rel="noopener">{T[lang].prolink}</a>
              </div>
            ))}
          </>
        ) : (
          <div className="allok">{T[lang].allok}</div>
        )}
      </div>
      {hasThumbs && (
        <div className="exprow">
          <button className="expbtn" onClick={() => dlLanding(story as StoryItem[], lang)}>{T[lang].exland}</button>
          <button className="expbtn" onClick={() => dlSheet(story as StoryItem[], lang)}>{T[lang].exsheet}</button>
          <div className="exhint">{T[lang].exhint}</div>
        </div>
      )}
    </div>
  );
}
