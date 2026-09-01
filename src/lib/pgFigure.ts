/* =============================================================================
   Piaitic Golf — posable Swing Figure engine (multi-style)
   Renders a posable golfer as inline SVG from an angle-based skeleton (forward
   kinematics). Any body part can be flagged as an error: it is tinted ORANGE,
   gets a soft glow, and an optional label pill points to it.
   ANGLES: 0=up, 90=right, 180=down, -90=left.  viewBox 300x470, ground ~y=430.
   Ported verbatim from the original SwingLab-Pro engine.
   ========================================================================== */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Pt = [number, number];

const PG = (() => {
  const DEG = Math.PI / 180;

  const STYLES: any = {
    mannequin: {
      limb:'#aaa49a', orange:'#cf6b34', headFill:'#aaa49a',
      capColor:'#2f5d3e', capDark:'#244c33',
      club:'#33332c', clubGrip:'#1f1f1b',
      glow:'rgba(207,107,52,.34)', joints:true, rmul:1, stroke:null,
    },
    silhouette: {
      limb:'#15140e', orange:'#ea6a1e', headFill:'#15140e',
      capColor:'#15140e', capDark:'#000000',
      club:'#15140e', clubGrip:'#15140e',
      glow:'rgba(234,106,30,.32)', joints:false, rmul:1.34, stroke:null,
    },
  };

  const BONES: any = {
    headRx: 21, headRy: 25,
    neckLen: 16, neckR: 8.5,
    spineLen: 120,
    shoulderHalf: 44, hipHalf: 30,
    upperArm: 60, foreArm: 56, hand: 22,
    thigh: 90, shin: 88, foot: 30,
    rShoulder: 12.5, rElbow: 8.5, rWrist: 6.5, rHand: 5.5,
    rHip: 15, rKnee: 11, rAnkle: 7.5, rToe: 4.5,
    rWaist: 16, rChest: 22,
  };
  const RKEYS = ['rShoulder','rElbow','rWrist','rHand','rHip','rKnee','rAnkle',
                 'rToe','rWaist','rChest','neckR'];

  const project = (p: Pt, ang: number, len: number): Pt => [
    p[0] + Math.sin(ang * DEG) * len,
    p[1] - Math.cos(ang * DEG) * len,
  ];
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n2 = (v: Pt) => `${(+v[0]).toFixed(2)},${(+v[1]).toFixed(2)}`;

  function capsule(A: Pt, ra: number, B: Pt, rb: number, fill: string, sattr?: string) {
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]) + Math.PI / 2;
    const ox = Math.cos(ang), oy = Math.sin(ang);
    const a1: Pt = [A[0] + ox * ra, A[1] + oy * ra];
    const a2: Pt = [A[0] - ox * ra, A[1] - oy * ra];
    const b1: Pt = [B[0] + ox * rb, B[1] + oy * rb];
    const b2: Pt = [B[0] - ox * rb, B[1] - oy * rb];
    return `<g fill="${fill}"${sattr || ''}>`
      + `<circle cx="${A[0].toFixed(2)}" cy="${A[1].toFixed(2)}" r="${ra}"/>`
      + `<circle cx="${B[0].toFixed(2)}" cy="${B[1].toFixed(2)}" r="${rb}"/>`
      + `<polygon points="${n2(a1)} ${n2(b1)} ${n2(b2)} ${n2(a2)}"/></g>`;
  }

  function solve(p: any) {
    const B = Object.assign({}, BONES, p.bones || {});
    const root = p.root, spine = p.spine;
    const shHalf = p.shoulderHalf != null ? p.shoulderHalf : B.shoulderHalf;
    const hipHalf = p.hipHalf != null ? p.hipHalf : B.hipHalf;
    const shTilt = p.shoulderTilt || 0, hipTilt = p.hipTilt || 0;

    const waist = project(root, spine, B.spineLen * 0.42);
    const chest = project(root, spine, B.spineLen);
    const shoulderL = project(chest, spine - 90 + shTilt, shHalf);
    const shoulderR = project(chest, spine + 90 + shTilt, shHalf);
    const hipL = project(root, spine - 90 + hipTilt, hipHalf);
    const hipR = project(root, spine + 90 + hipTilt, hipHalf);
    const neckTop = project(chest, p.neck != null ? p.neck : spine, B.neckLen);
    const headC = project(neckTop, p.head != null ? p.head : spine, B.headRy * 0.9);

    const arm = (a: any, sh: Pt) => {
      const elbow = project(sh, a.up, B.upperArm);
      const wrist = project(elbow, a.fore, B.foreArm);
      const hand = project(wrist, a.hand != null ? a.hand : a.fore, B.hand);
      return { elbow, wrist, hand };
    };
    const leg = (l: any, hip: Pt) => {
      const knee = project(hip, l.thigh, B.thigh);
      const ankle = project(knee, l.shin, B.shin);
      const foot = project(ankle, l.foot != null ? l.foot : l.shin + 72, B.foot);
      return { knee, ankle, foot };
    };
    return {
      root, waist, chest, shoulderL, shoulderR, hipL, hipR, neckTop, headC,
      aL: arm(p.armL, shoulderL), aR: arm(p.armR, shoulderR),
      lL: leg(p.legL, hipL), lR: leg(p.legR, hipR), B,
    };
  }

  function figure(p: any, opts: any = {}) {
    const S = Object.assign({}, STYLES[opts.style || p.style || 'mannequin']);
    ['limb','orange','joints','rmul','glow','club','clubGrip','capColor',
     'capDark','headFill'].forEach(k => { if (opts[k] != null) S[k] = opts[k]; });
    if (opts.stroke !== undefined) S.stroke = opts.stroke;
    const SA = S.stroke ? ` stroke="${S.stroke.color}" stroke-width="${S.stroke.width}" stroke-linejoin="round"` : '';
    const uid = 'pg' + Math.random().toString(36).slice(2, 7);

    const j: any = solve(p);
    const B = Object.assign({}, j.B);
    RKEYS.forEach(k => B[k] = j.B[k] * S.rmul);

    const err = new Set<string>(p.errors ? p.errors.flatMap((e: any) =>
      Array.isArray(e.parts) ? e.parts : [e.part]) : []);
    const col = (name: string) => err.has(name) ? S.orange : S.limb;
    const ballJoint = (C0: Pt, r: number) => S.joints
      ? `<circle cx="${C0[0].toFixed(2)}" cy="${C0[1].toFixed(2)}" r="${r}" fill="url(#${uid}-ball)"/>` : '';

    const armFront = p.armFront || 'L';
    const legFront = p.legFront || 'L';

    function drawArm(a: any, sh: Pt, side: string) {
      return capsule(sh, B.rShoulder, a.elbow, B.rElbow, col('upperArm' + side), SA)
        + capsule(a.elbow, B.rElbow, a.wrist, B.rWrist, col('foreArm' + side), SA)
        + capsule(a.wrist, B.rWrist, a.hand, B.rHand, col('hand' + side), SA)
        + ballJoint(a.elbow, B.rElbow * 0.8) + ballJoint(a.wrist, B.rWrist * 0.85);
    }
    function drawLeg(l: any, hip: Pt, side: string) {
      return capsule(hip, B.rHip, l.knee, B.rKnee, col('thigh' + side), SA)
        + capsule(l.knee, B.rKnee, l.ankle, B.rAnkle, col('shin' + side), SA)
        + footShape(l.ankle, l.foot, col('foot' + side))
        + ballJoint(l.knee, B.rKnee * 0.78) + ballJoint(l.ankle, B.rAnkle * 0.85);
    }
    function footShape(ankle: Pt, toe: Pt, fill: string) {
      return capsule(ankle, B.rAnkle, toe, B.rToe, fill, SA)
        + `<circle cx="${toe[0].toFixed(2)}" cy="${toe[1].toFixed(2)}" r="${(B.rToe + 1.5).toFixed(2)}" fill="${fill}"${SA}/>`;
    }

    function torso() {
      const fill = col('torso');
      const wl = project(j.waist, p.spine - 90 + (p.hipTilt || 0), B.rWaist);
      const wr = project(j.waist, p.spine + 90 + (p.hipTilt || 0), B.rWaist);
      const poly = [j.shoulderL, j.shoulderR, wr, j.hipR, j.hipL, wl].map(n2).join(' ');
      return `<g fill="${fill}"${SA}>`
        + `<polygon points="${poly}"/>`
        + `<circle cx="${j.shoulderL[0].toFixed(2)}" cy="${j.shoulderL[1].toFixed(2)}" r="${B.rChest}"/>`
        + `<circle cx="${j.shoulderR[0].toFixed(2)}" cy="${j.shoulderR[1].toFixed(2)}" r="${B.rChest}"/>`
        + `<circle cx="${j.hipL[0].toFixed(2)}" cy="${j.hipL[1].toFixed(2)}" r="${(B.rHip + 2).toFixed(2)}"/>`
        + `<circle cx="${j.hipR[0].toFixed(2)}" cy="${j.hipR[1].toFixed(2)}" r="${(B.rHip + 2).toFixed(2)}"/></g>`
        + capsule(j.chest, B.neckR, j.neckTop, B.neckR, col('neck'), SA);
    }

    function head() {
      const h = j.headC, fill = err.has('head') ? S.orange : S.headFill;
      return `<ellipse cx="${h[0].toFixed(2)}" cy="${h[1].toFixed(2)}" rx="${B.headRx}" ry="${B.headRy}" fill="${fill}"${SA}/>`;
    }
    function cap() {
      const h = j.headC, rx = B.headRx, ry = B.headRy, f = p.cap || 'front';
      const cy = h[1] - ry * 0.30;
      const crown = `<path d="M ${(h[0]-rx*1.02).toFixed(2)} ${cy.toFixed(2)} `
        + `A ${(rx*1.02).toFixed(2)} ${(ry*0.92).toFixed(2)} 0 0 1 ${(h[0]+rx*1.02).toFixed(2)} ${cy.toFixed(2)} Z" fill="${S.capColor}"${SA}/>`;
      let brim;
      if (f === 'right' || f === 'left') {
        const dir = f === 'right' ? 1 : -1;
        const bx = h[0] + dir * rx * 1.15, by = cy + ry * 0.10;
        brim = `<ellipse cx="${bx.toFixed(2)}" cy="${by.toFixed(2)}" rx="${(rx*0.78).toFixed(2)}" ry="6.5" `
          + `transform="rotate(${dir*-8} ${bx.toFixed(2)} ${by.toFixed(2)})" fill="${S.capDark}"/>`;
      } else {
        brim = `<ellipse cx="${h[0].toFixed(2)}" cy="${(cy+ry*0.06).toFixed(2)}" rx="${(rx*1.18).toFixed(2)}" ry="7" fill="${S.capDark}"/>`;
      }
      const btn = `<circle cx="${h[0].toFixed(2)}" cy="${(cy-ry*0.55).toFixed(2)}" r="2.4" fill="${S.capDark}"/>`;
      return brim + crown + btn;
    }

    function club() {
      if (!p.club) return '';
      const grip = p.club.grip ? p.club.grip : mid(j.aL.hand, j.aR.hand);
      const endp = project(grip, p.club.angle, p.club.len);
      const butt = project(grip, p.club.angle + 180, 10);
      const hd = project(endp, p.club.angle + 92, 9);
      return capsule(grip, 3.4, butt, 3.4, S.clubGrip)
        + capsule(grip, 3, endp, 2.2, S.club)
        + capsule(endp, 3, hd, 5.5, S.club);
    }

    function glows() {
      if (!p.errors) return '';
      let g = '';
      const seg: any = {
        upperArmL:[j.shoulderL,j.aL.elbow], foreArmL:[j.aL.elbow,j.aL.wrist], handL:[j.aL.wrist,j.aL.hand],
        upperArmR:[j.shoulderR,j.aR.elbow], foreArmR:[j.aR.elbow,j.aR.wrist], handR:[j.aR.wrist,j.aR.hand],
        thighL:[j.hipL,j.lL.knee], shinL:[j.lL.knee,j.lL.ankle], footL:[j.lL.ankle,j.lL.foot],
        thighR:[j.hipR,j.lR.knee], shinR:[j.lR.knee,j.lR.ankle], footR:[j.lR.ankle,j.lR.foot],
        neck:[j.chest,j.neckTop],
      };
      err.forEach(part => {
        if (part === 'head')
          g += `<circle cx="${j.headC[0].toFixed(2)}" cy="${j.headC[1].toFixed(2)}" r="${(B.headRx+9).toFixed(2)}" fill="${S.glow}"/>`;
        else if (part === 'torso')
          g += `<circle cx="${j.chest[0].toFixed(2)}" cy="${((j.chest[1]+j.root[1])/2).toFixed(2)}" r="40" fill="${S.glow}"/>`;
        else if (seg[part]) { const [a,b]=seg[part]; g += capsule(a, 14, b, 12, S.glow); }
      });
      return `<g filter="url(#${uid}-soft)">${g}</g>`;
    }

    function labels() {
      if (!p.errors) return '';
      const anchorOf: any = {
        head:j.headC, torso:mid(j.chest,j.root), neck:mid(j.chest,j.neckTop),
        upperArmL:mid(j.shoulderL,j.aL.elbow), foreArmL:mid(j.aL.elbow,j.aL.wrist), handL:j.aL.hand,
        upperArmR:mid(j.shoulderR,j.aR.elbow), foreArmR:mid(j.aR.elbow,j.aR.wrist), handR:j.aR.hand,
        thighL:mid(j.hipL,j.lL.knee), shinL:mid(j.lL.knee,j.lL.ankle), footL:j.lL.foot,
        thighR:mid(j.hipR,j.lR.knee), shinR:mid(j.lR.knee,j.lR.ankle), footR:j.lR.foot,
      };
      let out = '';
      p.errors.forEach((e: any) => {
        if (!e.label) return;
        const part = Array.isArray(e.parts) ? e.parts[0] : e.part;
        const a = anchorOf[part] || j.chest;
        const lx = a[0] + (e.dx != null ? e.dx : -1) * 36;
        const ly = a[1] + (e.dy != null ? e.dy : -1) * 30;
        out += pill(e.label, lx, ly, a);
      });
      return out;
    }
    function pill(text: string, x: number, y: number, target: Pt) {
      const w = text.length * 6.3 + 18, h = 20;
      x = Math.max(w/2+4, Math.min(300-w/2-4, x));
      y = Math.max(h/2+4, y);
      const rx = x-w/2, ry = y-h/2;
      return `<line x1="${x.toFixed(1)}" y1="${(y+h/2-1).toFixed(1)}" x2="${target[0].toFixed(1)}" y2="${target[1].toFixed(1)}" stroke="${S.orange}" stroke-width="1.6" stroke-dasharray="2 2" opacity=".85"/>`
        + `<g><rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h/2}" fill="${S.orange}"/>`
        + `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="11" font-weight="700" letter-spacing=".3" fill="#fff">${text}</text></g>`;
    }

    const backArm  = armFront==='L' ? drawArm(j.aR,j.shoulderR,'R') : drawArm(j.aL,j.shoulderL,'L');
    const frontArm = armFront==='L' ? drawArm(j.aL,j.shoulderL,'L') : drawArm(j.aR,j.shoulderR,'R');
    const backLeg  = legFront==='L' ? drawLeg(j.lR,j.hipR,'R') : drawLeg(j.lL,j.hipL,'L');
    const frontLeg = legFront==='L' ? drawLeg(j.lL,j.hipL,'L') : drawLeg(j.lR,j.hipR,'R');

    const body = backLeg + backArm + torso() + frontLeg
      + ballJoint(j.hipL, B.rHip*0.7) + ballJoint(j.hipR, B.rHip*0.7)
      + ballJoint(j.shoulderL, B.rShoulder*0.7) + ballJoint(j.shoulderR, B.rShoulder*0.7)
      + head() + cap() + frontArm;
    void club; // defined in original but unused in body composition

    const VW = 300, VH = 470;
    return `<svg viewBox="0 0 ${VW} ${VH}" width="${opts.width||VW}" height="${opts.height||VH}" `
      + `xmlns="http://www.w3.org/2000/svg" class="pg-figure" preserveAspectRatio="xMidYMid meet">`
      + defs(uid, S)
      + glows()
      + `<g>${body}</g>`
      + labels()
      + `</svg>`;
  }

  function defs(uid: string, _S: any) {
    return `<defs>`
      + `<radialGradient id="${uid}-ball" cx="38%" cy="32%" r="72%">`
      + `<stop offset="0%" stop-color="#c4bfb5"/><stop offset="100%" stop-color="#7e786d"/></radialGradient>`
      + `<filter id="${uid}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>`
      + `</defs>`;
  }

  return { figure, solve, STYLES, BONES, project };
})();

export default PG;
