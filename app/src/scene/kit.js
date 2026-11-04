// 軟萌玩具積木（PRD 島嶼風格 B）：所有地標、樹都用這幾個圓潤的基本形拼出來，表面帶塑膠光澤。
// 材質與幾何體依參數共用，幾百個物件也只建少量 GPU 資源。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeVertices } from '../../vendor/three/utils/BufferGeometryUtils.js';

export const HEX = 5;       // 六角格外接圓半徑（公尺）
export const TOP = 1.2;     // 格子地面高度（海面 y = 0）

/** axial (q, r) → 世界座標（尖頂六角形）。 */
export function axialToWorld(q, r) {
  return new THREE.Vector3(HEX * Math.sqrt(3) * (q + r / 2), 0, HEX * 1.5 * r);
}

const mats = new Map();
const geos = new Map();

export function mat(color, emissive = 0x000000) {
  const key = `${color}|${emissive}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshPhongMaterial({ color, emissive, shininess: 55, specular: 0x2e2e2e }));
  }
  return mats.get(key);
}

function geo(key, make) {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
}

// 夜晚會亮的材質：環境模組依時段調整亮度
export const GLOW = {
  window: new THREE.MeshLambertMaterial({ color: 0x9fb8c8, emissive: 0xffc96b, emissiveIntensity: 0 }),
  bulb: new THREE.MeshLambertMaterial({ color: 0xfff1c9, emissive: 0xffd27a, emissiveIntensity: 0.3 }),
  fire: new THREE.MeshLambertMaterial({ color: 0xff8a3c, emissive: 0xff6a1c, emissiveIntensity: 0.8 }),
};

function place(parent, g, material, x, y, z) {
  const m = new THREE.Mesh(g, typeof material === 'object' ? material : mat(material));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// 把擠出形的稜角也算成平滑的，看起來像軟糖
function soften(g) {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  return m;
}

// 旋轉體：pts 是 [半徑, 高度] 由下往上
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function softCylinder(rt, rb, h, seg) {
  const b = Math.min(h * 0.3, Math.min(rt, rb) * 0.35, 0.18);
  if (rt < 0.1 || rb < 0.1 || b < 0.015) return new THREE.CylinderGeometry(rt, rb, h, Math.max(seg, 8));
  const g = lathe([[0, 0], [rb - b, 0], [rb - b * 0.3, b * 0.3], [rb, b], [rt, h - b], [rt - b * 0.3, h - b * 0.3], [rt - b, h], [0, h]], Math.max(seg, 16));
  g.translate(0, -h / 2, 0);
  return g;
}

function softCone(r, h) {
  const g = lathe([[0, 0], [r * 0.82, 0], [r, h * 0.07], [r * 0.93, h * 0.2], [r * 0.5, h * 0.62], [r * 0.2, h * 0.92], [r * 0.08, h * 0.99], [0, h]], 16);
  g.translate(0, -h / 2, 0);
  return g;
}

// 以下 y 一律指「物件底部」的高度，方便往上疊

export const box = (p, w, h, d, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`b${w},${h},${d}`, () => {
    const r = Math.min(Math.min(w, h, d) * 0.3, 0.2);
    return r < 0.02 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) > 1.2 ? 2 : 1, r);
  }), c, x, y + h / 2, z);

export const cyl = (p, rt, rb, h, seg, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`c${rt},${rb},${h},${seg}`, () => softCylinder(rt, rb, h, seg)), c, x, y + h / 2, z);

export const cone = (p, r, h, seg, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`k${r},${h}`, () => softCone(r, h)), c, x, y + h / 2, z);

export const ball = (p, r, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`s${r}`, () => new THREE.SphereGeometry(r, 14, 10)), c, x, y, z);

export const torus = (p, r, t, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 10, 20)), c, x, y, z);

// 胖胖的屋頂：截面頂點朝上、屋脊圓潤；span＝屋頂寬、h＝屋頂高、len＝屋脊長
export function roof(p, span, h, len, c, x = 0, y = 0, z = 0, ridgeAlongX = true) {
  const m = place(p, geo(`r${span},${h},${len}`, () => {
    const b = 0.08;
    const sh = new THREE.Shape();
    sh.moveTo(-span / 2, 0);
    sh.lineTo(-span * 0.1, h * 0.84);
    sh.quadraticCurveTo(0, h, span * 0.1, h * 0.84);
    sh.lineTo(span / 2, 0);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: len - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 2, curveSegments: 5 });
    g.translate(0, b, -(len - b * 2) / 2);
    return soften(g);
  }), c, x, y, z);
  if (ridgeAlongX) m.rotation.y = Math.PI / 2;
  return m;
}

/** 圓角六角板：島的土台與草皮。R＝外接圓半徑、y＝底部高度。 */
export function hexPlate(p, R, h, c, y = 0) {
  return place(p, geo(`h${R},${h}`, () => {
    const corners = [0, 1, 2, 3, 4, 5].map((i) => [Math.sin((i * Math.PI) / 3) * R, Math.cos((i * Math.PI) / 3) * R]);
    const sh = new THREE.Shape();
    const k = 0.2; // 每個角削掉邊長的比例，再用曲線接起來
    corners.forEach(([x, z], i) => {
      const [px, pz] = corners[(i + 5) % 6], [nx, nz] = corners[(i + 1) % 6];
      const inX = x + (px - x) * k, inZ = z + (pz - z) * k;
      if (i === 0) sh.moveTo(inX, inZ);
      else sh.lineTo(inX, inZ);
      sh.quadraticCurveTo(x, z, x + (nx - x) * k, z + (nz - z) * k);
    });
    sh.closePath();
    const b = Math.min(h * 0.35, 0.3);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h - b * 2, bevelEnabled: true, bevelSize: b, bevelOffset: -b, bevelThickness: b, bevelSegments: 3, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    return soften(g);
  }), c, 0, y, 0);
}

/** 一排窗：沿 x 方向等距排在牆面（z 為牆面位置）。 */
export function windows(p, n, w, h, spanX, y, z, x0 = 0) {
  const step = spanX / n;
  for (let i = 0; i < n; i++) {
    place(p, geo(`w${w},${h}`, () => new THREE.BoxGeometry(w, h, 0.08)), GLOW.window, x0 - spanX / 2 + step * (i + 0.5), y + h / 2, z);
  }
}

// ── 常用小物 ──────────────────────────────────────────

// 樹像疊起來的圓軟糖；顏色由位置決定，同一種樹也有深有淺
const TREE_GREENS = [0x5fae4e, 0x6dbb55, 0x7cc75f, 0x4fa04f];
export function tree(p, x, z, s = 1, kind = 'round') {
  const c = TREE_GREENS[Math.abs(Math.round(x * 7 + z * 13)) % TREE_GREENS.length];
  cyl(p, 0.16 * s, 0.2 * s, 0.7 * s, 10, 0x8d5a38, x, 0, z);
  const layers = kind === 'pine' ? [[0.72, 0.9], [0.56, 1.5], [0.38, 2.0]] : [[0.75, 1.05], [0.52, 1.7]];
  for (const [r, y] of layers) ball(p, r * s, c, x, y * s, z).scale.y = 0.88;
}

/** 梅花樹：校徽的梅花，粉白花朵。 */
export function plumTree(p, x, z, s = 1) {
  cyl(p, 0.1 * s, 0.16 * s, 1.1 * s, 5, 0x5b3b2a, x, 0, z);
  for (const [dx, dy, dz, r] of [[0, 1.6, 0, 0.6], [0.45, 1.4, 0.2, 0.42], [-0.4, 1.45, -0.15, 0.45], [0.1, 1.95, -0.2, 0.38]]) {
    ball(p, r * s, 0xf6d3dc, x + dx * s, dy * s, z + dz * s);
  }
}

/** 仙草：深綠小叢＋淡紫花穗。 */
export function xiancao(p, x, z, s = 1) {
  ball(p, 0.32 * s, 0x3f7f4c, x, 0.25 * s, z);
  cyl(p, 0.05 * s, 0.07 * s, 0.45 * s, 4, 0xc9b6e4, x + 0.08 * s, 0.4 * s, z);
  cyl(p, 0.05 * s, 0.07 * s, 0.35 * s, 4, 0xe4daf2, x - 0.1 * s, 0.35 * s, z + 0.06 * s);
}

export function lamp(p, x, z) {
  cyl(p, 0.2, 0.26, 0.14, 12, 0x6b6470, x, 0, z);
  cyl(p, 0.06, 0.07, 1.8, 8, 0x6b6470, x, 0, z);
  const b = ball(p, 0.2, GLOW.bulb, x, 1.95, z);
  b.castShadow = false;
  b.userData.lamp = true; // 環境模組會在夜晚替它加光暈
  return b;
}

export function bench(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  box(g, 1.3, 0.14, 0.46, 0xd08a52, 0, 0.36, 0);
  box(g, 1.3, 0.3, 0.1, 0xd08a52, 0, 0.56, -0.2);
  box(g, 0.14, 0.38, 0.36, 0xb06f3f, -0.48, 0, 0);
  box(g, 0.14, 0.38, 0.36, 0xb06f3f, 0.48, 0, 0);
  p.add(g);
}

export function flag(p, x, z, color = 0xef8a3c) {
  cyl(p, 0.3, 0.36, 0.16, 12, 0xcfc6d6, x, 0, z);
  cyl(p, 0.05, 0.06, 3.2, 8, 0xdedbe2, x, 0, z);
  ball(p, 0.1, 0xf0c24a, x, 3.25, z);
  box(p, 0.9, 0.55, 0.08, color, x + 0.47, 2.55, z);
}

/** 簡單的偽亂數，同一個種子每次結果相同（樹的位置才不會每次重新整理都變）。 */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
