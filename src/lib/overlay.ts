/* Fault-overlay rendering (SVG for on-screen, canvas for downloads) and the
   image export composers. Ported verbatim from the original app. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { clampn, type StoryItem } from "./pose";
import { PHN, V, type Lang } from "../data/i18n";

const ORG = '#E8732B';

export function overlaySvg(p: any) {
  const IW = p.iw, IH = p.ih, lw = Math.max(3, IW * 0.02);
  let s = '<svg class="ov" viewBox="0 0 ' + IW + ' ' + IH + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';
  if (p.ref) {
    const rx = p.ref.hx * IW, ry = p.ref.hy * IH, rr = p.ref.r * IW;
    s += '<line x1="' + rx.toFixed(1) + '" y1="' + (ry - rr).toFixed(1) + '" x2="' + rx.toFixed(1) + '" y2="' + IH + '" stroke="#E5CE82" stroke-width="' + Math.max(2, IW * 0.012).toFixed(1) + '" opacity="0.85"/>';
    s += '<circle cx="' + rx.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="#3ecf6e" fill-opacity="0.22" stroke="#2fae5a" stroke-width="' + Math.max(2, IW * 0.01).toFixed(1) + '"/>';
  }
  s += '<g stroke="' + ORG + '" fill="none" stroke-linecap="round" opacity="0.28">'; p.marks.forEach((m: any) => { if (m.t === 'line') s += '<line x1="' + (m.a[0] * IW).toFixed(1) + '" y1="' + (m.a[1] * IH).toFixed(1) + '" x2="' + (m.b[0] * IW).toFixed(1) + '" y2="' + (m.b[1] * IH).toFixed(1) + '" stroke-width="' + (lw * 2.6).toFixed(1) + '"/>'; else s += '<circle cx="' + (m.c[0] * IW).toFixed(1) + '" cy="' + (m.c[1] * IH).toFixed(1) + '" r="' + (m.r * IW).toFixed(1) + '" stroke-width="' + (lw * 2.2).toFixed(1) + '"/>'; }); s += '</g>';
  s += '<g stroke="' + ORG + '" fill="none" stroke-linecap="round">'; p.marks.forEach((m: any) => { if (m.t === 'line') s += '<line x1="' + (m.a[0] * IW).toFixed(1) + '" y1="' + (m.a[1] * IH).toFixed(1) + '" x2="' + (m.b[0] * IW).toFixed(1) + '" y2="' + (m.b[1] * IH).toFixed(1) + '" stroke-width="' + lw.toFixed(1) + '"/>'; else s += '<circle cx="' + (m.c[0] * IW).toFixed(1) + '" cy="' + (m.c[1] * IH).toFixed(1) + '" r="' + (m.r * IW).toFixed(1) + '" stroke-width="' + lw.toFixed(1) + '"/>'; }); s += '</g>';
  if (p.pill && p.anchor) {
    const fs = Math.max(11, IW * 0.052), tw = p.pill.length * fs * 0.6 + fs * 0.9;
    let px = clampn(p.anchor[0] * IW, tw / 2 + 4, IW - tw / 2 - 4), py = clampn(p.anchor[1] * IH, fs * 1.4, IH - 6);
    const rx = px - tw / 2, ry = py - fs * 1.1;
    s += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1) + '" width="' + tw.toFixed(1) + '" height="' + (fs * 1.55).toFixed(1) + '" rx="' + (fs * 0.78).toFixed(1) + '" fill="' + ORG + '"/><text x="' + px.toFixed(1) + '" y="' + (ry + fs * 1.12).toFixed(1) + '" text-anchor="middle" font-family="DM Sans,-apple-system,sans-serif" font-weight="700" font-size="' + fs.toFixed(1) + '" fill="#fff">' + p.pill + '</text>';
  }
  s += '</svg>'; return s;
}

export function canvasOverlayAbs(g: CanvasRenderingContext2D, p: any, ox: number, oy: number, W: number, H: number) {
  const lw = Math.max(3, W * 0.02);
  if (p.ref) {
    const rx = ox + p.ref.hx * W, ry = oy + p.ref.hy * H, rr = p.ref.r * W;
    g.strokeStyle = '#E5CE82'; g.lineWidth = Math.max(2, W * 0.012); g.beginPath(); g.moveTo(rx, ry - rr); g.lineTo(rx, oy + H); g.stroke();
    g.fillStyle = 'rgba(62,207,110,0.22)'; g.beginPath(); g.arc(rx, ry, rr, 0, 7); g.fill();
    g.strokeStyle = '#2fae5a'; g.lineWidth = Math.max(2, W * 0.01); g.beginPath(); g.arc(rx, ry, rr, 0, 7); g.stroke();
  }
  g.strokeStyle = ORG; g.lineCap = 'round'; g.lineWidth = lw;
  p.marks.forEach((m: any) => { g.beginPath(); if (m.t === 'line') { g.moveTo(ox + m.a[0] * W, oy + m.a[1] * H); g.lineTo(ox + m.b[0] * W, oy + m.b[1] * H); } else { g.arc(ox + m.c[0] * W, oy + m.c[1] * H, m.r * W, 0, 7); } g.stroke(); });
  if (p.pill && p.anchor) {
    const fs = Math.max(11, W * 0.052); g.font = '700 ' + fs + 'px DM Sans, sans-serif';
    const tw = g.measureText(p.pill).width + fs * 0.9;
    let px = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, p.anchor[0] * W)), py = Math.max(fs * 1.4, Math.min(H - 6, p.anchor[1] * H));
    const rx = ox + px - tw / 2, ry = oy + py - fs * 1.1;
    g.fillStyle = ORG; g.beginPath(); g.rect(rx, ry, tw, fs * 1.55); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(p.pill, ox + px, ry + fs * 1.12);
  }
}
export function canvasOverlay(g: CanvasRenderingContext2D, p: any, W: number, H: number) { canvasOverlayAbs(g, p, 0, 0, W, H); }

function loadImg(src: string): Promise<HTMLImageElement> { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }

function pickWorst(st: StoryItem[]) {
  const prio = ['arms_top', 'spine_ext', 'head_down', 'arms_early', 'lose_ext', 'hands_inside', 'spine_hunched', 'head_impact', 'legs_back'];
  for (const k of prio) { const f = st.find(p => p._warn && p._key === k); if (f) return f; }
  return st.find(p => p._warn) || st[3] || st[0];
}
function vLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }
function phLang(l: Lang): "es" | "en" { return l === "en" ? "en" : "es"; }

function triggerDownload(dataUrl: string, name: string) {
  const a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export async function dlLanding(story: StoryItem[] | null, LANG: Lang) {
  const st = story; if (!st) return; const pick = pickWorst(st); if (!pick || !pick.thumb) return;
  const im = await loadImg(pick.thumb); const iw = im.width, ih = im.height; const capH = Math.round(iw * 0.17);
  const c = document.createElement('canvas'); c.width = iw; c.height = ih + capH; const g = c.getContext('2d')!;
  g.drawImage(im, 0, 0, iw, ih); canvasOverlayAbs(g, pick, 0, 0, iw, ih);
  g.fillStyle = '#0A0805'; g.fillRect(0, ih, iw, capH);
  const key = pick._key; const vd = V[key] ? V[key][vLang(LANG)] : { m: '' } as any;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#E5CE82'; g.font = '700 ' + Math.round(iw * 0.058) + 'px DM Sans, sans-serif'; g.fillText(PHN[phLang(LANG)][pick._i], Math.round(iw * 0.05), ih + Math.round(capH * 0.42));
  g.fillStyle = '#fff'; g.font = '400 ' + Math.round(iw * 0.046) + 'px DM Sans, sans-serif'; g.fillText(vd.m, Math.round(iw * 0.05), ih + Math.round(capH * 0.80));
  triggerDownload(c.toDataURL('image/jpeg', 0.92), 'swing-landing.jpg');
}

export async function dlSheet(story: StoryItem[] | null, LANG: Lang) {
  const st = story; if (!st) return;
  const imgs = await Promise.all(st.map(p => p.thumb ? loadImg(p.thumb) : Promise.resolve(null)));
  const cols = 2, rows = 4, cw = 360, pad = 10, lab = 56, head = 64; let maxR = 1.4;
  st.forEach((p, i) => { if (imgs[i]) maxR = Math.max(maxR, imgs[i]!.height / imgs[i]!.width); });
  const ch = Math.round(cw * maxR); const W = cols * cw + pad * (cols + 1); const H = head + rows * (ch + lab) + pad * (rows + 1);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#E5CE82'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '700 30px DM Sans, sans-serif'; g.fillText('SwingLab Pro — ' + (LANG === 'es' ? '8 fotogramas' : '8 frames'), pad, 42);
  st.forEach((p, i) => {
    const col = i % cols, row = (i / cols) | 0; const x = pad + col * (cw + pad); const y = head + pad + row * (ch + lab + pad);
    g.fillStyle = '#111'; g.fillRect(x, y, cw, ch);
    if (imgs[i]) { const iw = imgs[i]!.width, ih = imgs[i]!.height; const sc = Math.min(cw / iw, ch / ih); const dw = iw * sc, dh = ih * sc; const ox = x + (cw - dw) / 2, oy = y + (ch - dh) / 2; g.drawImage(imgs[i]!, ox, oy, dw, dh); canvasOverlayAbs(g, p, ox, oy, dw, dh); }
    g.fillStyle = p._warn ? '#7a3d12' : '#1f4530'; g.fillRect(x, y + ch, cw, lab);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '700 18px DM Sans, sans-serif'; g.fillText((i + 1) + '. ' + PHN[phLang(LANG)][p._i], x + 10, y + ch + 23);
    const key = p._key; const vd = V[key] ? V[key][vLang(LANG)] : { m: '' } as any;
    g.fillStyle = '#ECE5DD'; g.font = '400 15px DM Sans, sans-serif'; g.fillText(String(vd.m).slice(0, 44), x + 10, y + ch + 44);
  });
  triggerDownload(c.toDataURL('image/jpeg', 0.9), 'swing-8-fotogramas.jpg');
}

export function dlFrame(story: StoryItem[] | null, i: number) {
  if (!story) return; const p = story[i]; if (!p || !p.thumb) return;
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = p.iw; c.height = p.ih; const g = c.getContext('2d')!; g.drawImage(im, 0, 0, p.iw, p.ih); canvasOverlay(g, p, p.iw, p.ih); triggerDownload(c.toDataURL('image/jpeg', 0.9), 'swing-' + (i + 1) + '.jpg'); };
  im.src = p.thumb;
}
