// Floggy Q400 — same recipe as the Floggy E175 (toon shading, navy OutlineEffect, painted livery, face)
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
const P = new URLSearchParams(location.search);
const FACE = P.get('face') !== '0', CAM = P.get('cam') || 'ref';
const W = +(P.get('w') || 2400), H = +(P.get('h') || 1500);
const LIV = P.get('liv') || '#3366B8', AMBER = '#F5B841', WHITE = '#F7F7F2', NAVY = '#10213D', GLASS = '#1B2B44';
const L = 32.8, FH = 1.36, FW = 1.36;
const deg = Math.PI / 180;

// ---------- fuselage (s = 0 nose .. L tail); Q400: long pointed nose, straight top, last fifth sweeps up underneath
function section(s) {
  if (s < 6.0) {
    const t = s / 6.0, yt = -0.42;
    const top = yt + (FH - yt) * Math.pow(1 - Math.pow(1 - t, 2.0), 0.72);
    const bot = yt - (FH + yt) * Math.pow(1 - Math.pow(1 - t, 2.6), 0.5);
    const hw = FW * Math.pow(1 - Math.pow(1 - t, 2.3), 0.62);
    return { top, bot, hw };
  }
  if (s <= 24.2) return { top: FH, bot: -FH, hw: FW };
  const t = (s - 24.2) / (L - 24.2);
  return { top: FH - (FH - 0.95) * Math.pow(t, 2.6), bot: -FH + (FH + 0.62) * Math.pow(t, 1.15), hw: FW - (FW - 0.12) * Math.pow(t, 1.4) };
}
const X = s => L / 2 - s;
const NSE = 2.15;
function fuselageGeometry(ns = 300, nt = 96) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= ns; i++) {
    const s = L * i / ns, sec = section(Math.max(s, 0.0001)), mid = (sec.top + sec.bot) / 2, hh = (sec.top - sec.bot) / 2;
    for (let j = 0; j <= nt; j++) {
      const th = (j / nt) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const cy = Math.sign(c) * Math.pow(Math.abs(c), 2 / NSE), sz = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / NSE);
      pos.push(X(s), mid + hh * cy, sec.hw * sz); uv.push(s / L, j / nt);
    }
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + nt + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function airfoil(n = 28, tk = 0.12) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) { const x = (1 - Math.cos(Math.PI * i / n)) / 2; const yt = 5 * tk * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4); up.push([x, yt]); lo.push([x, -yt]); }
  return [...up.reverse(), ...lo.slice(1)];
}
function loft(sections, chordDir, thickDir, n = 24) {
  const pos = [], uv = [], idx = [];
  sections.forEach((sec, k) => { const af = airfoil(n, sec.tk); af.forEach(([x, y], i) => { const p = new THREE.Vector3(...sec.le).addScaledVector(chordDir, x * sec.chord).addScaledVector(sec.thick || thickDir, y * sec.chord); pos.push(p.x, p.y, p.z); uv.push(i / (af.length - 1), k / (sections.length - 1)); }); });
  const m = airfoil(n, 0.1).length;
  for (let k = 0; k < sections.length - 1; k++) for (let i = 0; i < m - 1; i++) { const a = k * m + i, b = a + m; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  for (const end of [0, sections.length - 1]) {
    const base = end * m, ctr = pos.length / 3; let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < m; i++) { cx += pos[(base + i) * 3]; cy += pos[(base + i) * 3 + 1]; cz += pos[(base + i) * 3 + 2]; }
    pos.push(cx / m, cy / m, cz / m); uv.push(0.5, end ? 1 : 0);
    for (let i = 0; i < m - 1; i++) end ? idx.push(base + i, ctr, base + i + 1) : idx.push(base + i + 1, ctr, base + i);
  }
  let vol = 0; const V = k => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
  for (let t = 0; t < idx.length; t += 3) vol += V(idx[t]).dot(new THREE.Vector3().crossVectors(V(idx[t + 1]), V(idx[t + 2])));
  if (vol < 0) for (let t = 0; t < idx.length; t += 3) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------- livery texture ----------
function fuselageTexture() {
  const cw = 4096, ch = 2048, c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  const sx = s => s / L * cw, ty = th => th / (Math.PI * 2) * ch;
  g.fillStyle = WHITE; g.fillRect(0, 0, cw, ch);
  const thAt = (s, y) => { const sec = section(Math.max(s, 0.01)); const mid = (sec.top + sec.bot) / 2, hh = (sec.top - sec.bot) / 2;
    let v = Math.max(-1, Math.min(1, (y - mid) / hh)); const cc = Math.sign(v) * Math.pow(Math.abs(v), NSE / 2); return Math.acos(Math.max(-1, Math.min(1, cc))); };
  // belly + amber cheatline; dips under the nose so the smile sits on white, sweeps up at the tail
  const lineY = s => s > 24 ? -0.5 + (s - 24) * 0.15 : (s < 6.5 ? -0.5 - 0.62 * Math.pow((6.5 - s) / 6.5, 1.5) : -0.5);
  const band = (yfn, color) => { for (const side of [1, -1]) { g.beginPath();
      for (let s = 0; s <= L; s += 0.1) { const th = thAt(s, yfn(s)); const T = side > 0 ? th : Math.PI * 2 - th; s === 0 ? g.moveTo(sx(s), ty(T)) : g.lineTo(sx(s), ty(T)); }
      g.lineTo(sx(L), ty(Math.PI)); g.lineTo(sx(0), ty(Math.PI)); g.closePath(); g.fillStyle = color; g.fill(); } };
  band(s => lineY(s) + 0.15, AMBER); band(s => lineY(s) + 0.05, WHITE); band(s => lineY(s), LIV);
  // passenger windows (Q400 row spacing)
  if (P.get('win') !== '0') { g.fillStyle = GLASS;
    for (let s = 6.4; s < 23.4; s += 0.79) { if (Math.abs(s - 11.5) < 0.45) continue;
      for (const side of [1, -1]) { const th = thAt(s, 0.28); const T = side > 0 ? th : Math.PI * 2 - th; const w = 0.25 / L * cw, h = 0.38 / (2 * Math.PI * 1.36) * ch;
        g.beginPath(); g.roundRect(sx(s) - w / 2, ty(T) - h / 2, w, h, w * 0.45); g.fill(); } } }
  // doors
  g.strokeStyle = '#B9C2CC'; g.lineWidth = 5;
  for (const [s0, wd] of [[5.2, 0.8], [+(P.get('ad') || 26.4), 0.7]]) for (const side of [1, -1]) {
    const tTop = thAt(s0, 1.0), tBot = thAt(s0, -0.75); const a = side > 0 ? tTop : Math.PI * 2 - tTop, b = side > 0 ? tBot : Math.PI * 2 - tBot;
    g.beginPath(); g.roundRect(sx(s0), Math.min(ty(a), ty(b)), wd / L * cw, Math.abs(ty(b) - ty(a)), 14); g.stroke(); }
  // cockpit: windshield + two side windows on one sill line; side windows share a top line
  const pane = pts => { for (const side of [1, -1]) for (const wrap of [0, 1, -1]) { g.beginPath();
      pts.forEach(([s, th], i) => { const T = (side > 0 ? th : Math.PI * 2 - th) + wrap * Math.PI * 2; i ? g.lineTo(sx(s), ty(T)) : g.moveTo(sx(s), ty(T)); });
      g.closePath(); g.fillStyle = GLASS; g.fill(); } };
  const sill = x => 0.32 + 0.13 * (x - 2.2), topL = x => 1.0 + 0.05 * (x - 3.6);
  const paneSY = (s0, s1, topFn) => { const pts = [], N = 16;
    for (let k = 0; k <= N; k++) { const x = s0 + (s1 - s0) * k / N; pts.push([x, topFn(x)]); }
    for (let k = N; k >= 0; k--) { const x = s0 + (s1 - s0) * k / N; pts.push([x, thAt(x, sill(x))]); } pane(pts); };
  paneSY(2.25, 3.55, () => 0.045);
  paneSY(3.68, 4.55, x => thAt(x, topL(x)));
  paneSY(4.68, 5.15, x => thAt(x, topL(x) - 0.06));
  // title
  for (const side of [1, -1]) { const s = +(P.get('ts') || 13.2), th = thAt(s, +(P.get('ty') || 0.98)); const T = side > 0 ? th : Math.PI * 2 - th;
    g.save(); g.translate(sx(s), ty(T)); g.scale(side > 0 ? -1 : 1, 1);
    g.font = '700 190px Fredoka'; g.lineWidth = 14; g.strokeStyle = WHITE; g.fillStyle = P.get('tcol') || LIV; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText('Floggy', 0, 0); g.fillText('Floggy', 0, 0); g.restore(); }
  // registration on the aft fuselage
  if (P.get('reg')) for (const side of [1, -1]) { const s0 = +(P.get('rs') || 27.4), th = thAt(s0, +(P.get('ry') || 0.72)); const T = side > 0 ? th : Math.PI * 2 - th;
    g.save(); g.translate(sx(s0), ty(T)); g.scale(side > 0 ? -1 : 1, 1); g.font = '700 118px Arial, Helvetica, sans-serif'; g.fillStyle = '#1b2230'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(P.get('reg'), 0, 0); g.restore(); }
  if (FACE) {
    const es = +(P.get('es') || 2.95), ef = +(P.get('ef') || 0.55);
    for (const side of [1, -1]) { const thLow = thAt(es, sill(es)); const th = 0.045 + (thLow - 0.045) * ef; const T = side > 0 ? th : Math.PI * 2 - th;
      const ex = sx(es), ey = ty(T), d = side > 0 ? 1 : -1, rx = 64, ry = Math.min(150, (thLow - 0.045) / (2 * Math.PI) * ch * 0.42);
      g.fillStyle = '#FFFFFF'; g.strokeStyle = NAVY; g.lineWidth = 9; g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = NAVY; g.beginPath(); g.ellipse(ex - rx * 0.32, ey + d * ry * 0.28, rx * 0.56, ry * 0.56, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(ex - rx * 0.5, ey + d * ry * 0.08, rx * 0.18, ry * 0.18, 0, 0, Math.PI * 2); g.fill(); }
    const ms = +(P.get('ms') || 0.85), mw = +(P.get('mw') || 1.2), mc = +(P.get('mc') || 0.42);
    g.strokeStyle = NAVY; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath();
    for (let k = 0; k <= 48; k++) { const u = -1 + 2 * k / 48, th = Math.PI + u * mw, x = ms + mc * u * u; k ? g.lineTo(sx(x), ty(th)) : g.moveTo(sx(x), ty(th)); }
    g.stroke();
    for (const u of [-1, 1]) { const th = Math.PI + u * mw, x = ms + mc; g.beginPath(); g.moveTo(sx(x - 0.12), ty(th - u * 0.05)); g.lineTo(sx(x + 0.12), ty(th + u * 0.08)); g.stroke(); }
    g.fillStyle = 'rgba(242,140,155,0.55)';
    for (const u of [-1, 1]) { g.beginPath(); g.ellipse(sx(ms + mc + 0.35), ty(Math.PI + u * (mw + 0.05)), 36, 30, 0, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function finTexture(fx = 560, fy = 470) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = LIV; g.fillRect(0, 0, 1024, 1024);
  g.save(); g.font = '700 360px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 18; g.strokeStyle = NAVY; g.strokeText('F', fx, fy + 14); g.fillStyle = P.get('fcol') || AMBER; g.fillText('F', fx, fy + 14); g.restore();
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- build ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const grad = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 3, 1); grad.needsUpdate = true; grad.minFilter = grad.magFilter = THREE.NearestFilter;
function mat(color, map, ol, extra) { const m = new THREE.MeshToonMaterial(Object.assign({ color, map, gradientMap: grad }, extra || {})); if (ol !== undefined) m.userData.outlineParameters = ol === false ? { visible: false } : { thickness: ol }; return m; }
const plane = new THREE.Group();
plane.add(new THREE.Mesh(fuselageGeometry(), mat(0xffffff, fuselageTexture())));
const cX = new THREE.Vector3(-1, 0, 0), up = new THREE.Vector3(0, 1, 0), sideV = new THREE.Vector3(0, 0, 1);
const wingMat = mat(new THREE.Color('#EEF0F3'), undefined, 0.0014);
const yW = FH + 0.12;
// high straight wing: flat to the nacelle, dihedral outboard
for (const side of [1, -1]) {
  const dih = Math.tan(2.5 * deg), yAt = z => yW + Math.max(z - 4.6, 0) * dih;
  const st = (z, le, te, tk) => ({ le: [X(le), yAt(z), side * z], chord: te - le, tk });
  const secs = [st(0.0, 13.35, 16.3, 0.17), st(4.6, 13.45, 16.2, 0.16), st(13.7, 14.25, 15.75, 0.12), st(14.2, 14.3, 15.7, 0.11)];
  plane.add(new THREE.Mesh(loft(secs, cX, up), wingMat));
  // black de-ice boot along the leading edge
  const boot = secs.map(s => ({ le: [s.le[0] + 0.02, s.le[1], s.le[2]], chord: s.chord * 0.09, tk: s.tk * 4.5 }));
  plane.add(new THREE.Mesh(loft(boot, cX, up), mat(new THREE.Color('#2a2f38'), undefined, false)));
  // nacelle hanging under the wing
  const nz = side * 4.1, ny = 0.78, nf = 10.95;
  {
    const NL = 9.7, curves = new Map(), interp = (tab, u) => {
      if (!curves.has(tab)) { const c = new THREE.CatmullRomCurve3(tab.map(([a, v]) => new THREE.Vector3(a, v, 0)), false, 'centripetal'); curves.set(tab, c.getPoints(800)); }
      const pts = curves.get(tab); for (let i = 1; i < pts.length; i++) if (pts[i].x >= u) { const a = pts[i - 1], b = pts[i], k = (u - a.x) / ((b.x - a.x) || 1); return a.y + (b.y - a.y) * k; } return pts[pts.length - 1].y; };
    const TOP = [[0, 0.42], [0.03, 0.56], [0.1, 0.72], [0.25, 0.8], [0.5, 0.79], [0.7, 0.68], [0.86, 0.46], [1, 0.1]];
    const BOT = [[0, -0.42], [0.05, -0.82], [0.12, -1.08], [0.2, -1.14], [0.33, -1.0925], [0.46, -1.045], [0.59, -0.9975], [0.72, -0.95], [0.86, -0.66], [1, -0.12]];      // straight underside, smooth aft taper
    const HW = [[0, 0.42], [0.04, 0.56], [0.12, 0.7], [0.3, 0.74], [0.6, 0.71], [0.8, 0.52], [1, 0.1]];
    const pos = [], idx = [], ns = 220, nt = 72;
    for (let i = 0; i <= ns; i++) { const u = i / ns, top = interp(TOP, u), bot = interp(BOT, u), hw = interp(HW, u), mid = (top + bot) / 2, hh = (top - bot) / 2;
      for (let j = 0; j <= nt; j++) { const th = j / nt * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), n = 2.4;
        pos.push(X(nf + u * NL), ny + mid + hh * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), nz + hw * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n)); } }
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + nt + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setIndex(idx); ng.computeVertexNormals();
    plane.add(new THREE.Mesh(ng, mat(new THREE.Color(WHITE))));
  }
  // chin air intake under the spinner
  const chin = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), mat(new THREE.Color(WHITE)));
  const io = side * +(P.get('io') || 0), irot = +(P.get('irot') || 15) * deg * side;
  chin.scale.set(1.55, 0.38, 0.47); chin.position.set(X(nf + 1.57), ny - 0.8 * Math.cos(irot), nz + io + 0.8 * Math.sin(irot)); plane.add(chin);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), new THREE.MeshBasicMaterial({ color: 0x12161d }));
  mouth.rotation.y = Math.PI / 2; mouth.scale.set(1.35, 0.8, 1); mouth.position.set(X(nf - 0.01), ny - 0.81 * Math.cos(irot), nz + io + 0.81 * Math.sin(irot)); plane.add(mouth);
  // black spinner
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.44, 1.0, 40), mat(new THREE.Color('#22262e')));
  sp.rotation.z = -Math.PI / 2; sp.position.set(X(nf) + 0.48, ny, nz); plane.add(sp);
  // prop disc with motion-blurred blades (no outline)
  const pc = document.createElement('canvas'); pc.width = pc.height = 512; const pg = pc.getContext('2d'), cc = 256;
  const rg = pg.createRadialGradient(cc, cc, 20, cc, cc, cc); rg.addColorStop(0, 'rgba(40,46,56,.30)'); rg.addColorStop(.8, 'rgba(70,78,90,.18)'); rg.addColorStop(1, 'rgba(70,78,90,0)');
  pg.fillStyle = rg; pg.beginPath(); pg.arc(cc, cc, cc, 0, Math.PI * 2); pg.fill();
  for (let b = 0; b < 6; b++) { const a0 = b * Math.PI / 3 + 0.35; for (let k = 0; k < 16; k++) { const a = a0 - k * 0.022; pg.strokeStyle = `rgba(16,20,28,${0.55 * (1 - k / 16)})`; pg.lineWidth = 12 - k * 0.5;
      pg.beginPath(); pg.moveTo(cc + Math.cos(a) * 40, cc + Math.sin(a) * 40); pg.lineTo(cc + Math.cos(a) * 246, cc + Math.sin(a) * 246); pg.stroke(); } }
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.05, 64), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  disc.material.userData.outlineParameters = { visible: false };
  disc.rotation.y = Math.PI / 2; disc.position.set(X(nf) + 0.25, ny, nz); plane.add(disc);
}
// turtle deck / wing-root fairing on top of the fuselage
const deck = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat(new THREE.Color(WHITE)));
deck.scale.set(6.2, 0.42, 1.0); deck.position.set(X(14.8), FH - 0.06, 0); plane.add(deck);
// T-tail: fin + dorsal fillet (livery colour, F), bullet, stabilizer
{
  const FT = FH + 4.9, sw = Math.tan(40 * deg);
  const secs = [{ le: [X(24.3), FH - 0.25, 0], chord: 5.9, tk: 0.11 }, { le: [X(24.8), FH + 0.6, 0], chord: 5.25, tk: 0.11 }, { le: [X(24.8 + (FT - FH - 0.6) * sw), FT, 0], chord: 2.3, tk: 0.09 }];
  const fg = loft(secs, cX, sideV, 28);
  fg.computeBoundingBox(); const bb = fg.boundingBox, pa = fg.attributes.position, ua = fg.attributes.uv;
  for (let i = 0; i < pa.count; i++) ua.setXY(i, (pa.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), 1 - (pa.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  ua.needsUpdate = true;
  // centre the F in the visible trapezoid (fuselage top -> fin tip), in the fin's UV space
  const U = (sv, y) => [(X(sv) - bb.min.x) / (bb.max.x - bb.min.x), 1 - (y - bb.min.y) / (bb.max.y - bb.min.y)];
  const tipLE = 24.8 + (FT - FH - 0.6) * sw, quad = [U(24.3 + 0.5 * 0.25 / 0.85, FH), U(tipLE, FT), U(tipLE + 2.3, FT), U(24.3 + 5.9 - 0.2, FH)];
  // visual centre: halfway up the visible fin, halfway along the chord at that height
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const leM = mid(quad[0], quad[1]), teM = mid(quad[3], quad[2]); const cx = (leM[0] + teM[0]) / 2, cy = (leM[1] + teM[1]) / 2;
  plane.add(new THREE.Mesh(fg, mat(0xffffff, finTexture(cx * 1024, cy * 1024))));
  const dorsal = [{ le: [X(21.2), FH - 0.12, 0], chord: 3.7, tk: 0.08 }, { le: [X(24.1), FH + 0.5, 0], chord: 1.3, tk: 0.1 }];
  plane.add(new THREE.Mesh(loft(dorsal, cX, sideV), mat(new THREE.Color(LIV))));
  const tipLE0 = 24.8 + (FT - FH - 0.6) * sw; const bp = [[0.0, 0], [0.2, 0.25], [0.32, 0.9], [0.34, 2.4], [0.28, 4.0], [0.06, 4.9]];
  const bul = new THREE.Mesh(new THREE.LatheGeometry(bp.map(([r, x]) => new THREE.Vector2(r, x)), 40), mat(new THREE.Color(LIV)));
  bul.rotation.z = Math.PI / 2; bul.position.set(X(tipLE0 - 1.2), FT + 0.08, 0); plane.add(bul);
  for (const side of [1, -1]) {
    const secsS = [{ le: [X(tipLE0 + 0.15), FT + 0.1, 0], chord: 2.15, tk: 0.11 }, { le: [X(tipLE0 + 1.25), FT + 0.1, side * 4.3], chord: 1.1, tk: 0.09 }];
    plane.add(new THREE.Mesh(loft(secsS, cX, up), mat(new THREE.Color('#EEF0F3'), undefined, 0.0014)));
  }
}
plane.rotation.z = (+(P.get('pitch') || 2.5)) * deg;
plane.rotation.y = (+(P.get('yaw') || 15)) * deg;
plane.rotation.x = (+(P.get('roll') || 18)) * deg;
plane.rotation.order = 'YZX';
scene.add(plane);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(25, 30, 18); scene.add(d);
const cam = new THREE.PerspectiveCamera(+(P.get('fov') || 26), W / H, 0.1, 500);
const views = { ref: { pos: [42, -4, 19], look: [0.0, 0.8, 0] }, f3: { pos: [44, 1.5, 15], look: [0.0, 1.0, 0] }, ref2: { pos: [44, -1.5, 17], look: [0.0, 0.6, 0] } };
const v = views[CAM]; cam.position.set(...v.pos); cam.lookAt(...v.look);
const fx = new OutlineEffect(renderer, { defaultThickness: 0.0035, defaultColor: [0.063, 0.13, 0.24], defaultAlpha: 1 });
fx.render(scene, cam);
window.__done = true;
