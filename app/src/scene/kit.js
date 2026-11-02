// 低多邊形積木：所有地標、樹、小人都用這幾個基本形拼出來。
// 材質與幾何體依參數共用，幾百個物件也只建少量 GPU 資源。
import * as THREE from 'three';

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
    mats.set(key, new THREE.MeshLambertMaterial({ color, emissive, flatShading: true }));
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

// 以下 y 一律指「物件底部」的高度，方便往上疊

export const box = (p, w, h, d, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), c, x, y + h / 2, z);

export const cyl = (p, rt, rb, h, seg, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, y + h / 2, z);

export const cone = (p, r, h, seg, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), c, x, y + h / 2, z);

export const ball = (p, r, c, x = 0, y = 0, z = 0, detail = 0) =>
  place(p, geo(`s${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), c, x, y, z);

export const torus = (p, r, t, c, x = 0, y = 0, z = 0) =>
  place(p, geo(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 6, 12)), c, x, y, z);

// 三角柱屋頂：截面頂點朝上；span＝屋頂寬、h＝屋頂高、len＝屋脊長
const prism = () => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 3);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.5, 0);
  return g;
};
export function roof(p, span, h, len, c, x = 0, y = 0, z = 0, ridgeAlongX = true) {
  const m = place(p, geo('prism', prism), c, x, y, z);
  m.scale.set(span / Math.sqrt(3), h / 1.5, len);
  if (ridgeAlongX) m.rotation.y = Math.PI / 2;
  return m;
}

/** 一排窗：沿 x 方向等距排在牆面（z 為牆面位置）。 */
export function windows(p, n, w, h, spanX, y, z, x0 = 0) {
  const step = spanX / n;
  for (let i = 0; i < n; i++) {
    place(p, geo(`w${w},${h}`, () => new THREE.BoxGeometry(w, h, 0.08)), GLOW.window, x0 - spanX / 2 + step * (i + 0.5), y + h / 2, z);
  }
}

// ── 常用小物 ──────────────────────────────────────────

export function tree(p, x, z, s = 1, kind = 'round') {
  cyl(p, 0.12 * s, 0.16 * s, 0.8 * s, 5, 0x7a5236, x, 0, z);
  if (kind === 'pine') {
    cone(p, 0.8 * s, 1.4 * s, 6, 0x3f7a4a, x, 0.6 * s, z);
    cone(p, 0.6 * s, 1.1 * s, 6, 0x4c8c55, x, 1.3 * s, z);
  } else {
    ball(p, 0.75 * s, 0x5f9b4c, x, 1.35 * s, z);
    ball(p, 0.5 * s, 0x72ad5a, x + 0.3 * s, 1.75 * s, z + 0.15 * s);
  }
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
  ball(p, 0.32 * s, 0x2f5d3a, x, 0.25 * s, z);
  cyl(p, 0.05 * s, 0.07 * s, 0.45 * s, 4, 0xc9b6e4, x + 0.08 * s, 0.4 * s, z);
  cyl(p, 0.05 * s, 0.07 * s, 0.35 * s, 4, 0xe4daf2, x - 0.1 * s, 0.35 * s, z + 0.06 * s);
}

export function lamp(p, x, z) {
  cyl(p, 0.05, 0.07, 1.8, 5, 0x3a3a40, x, 0, z);
  const b = ball(p, 0.16, GLOW.bulb, x, 1.9, z, 1);
  b.castShadow = false;
  b.userData.lamp = true; // 環境模組會在夜晚替它加光暈
  return b;
}

export function bench(p, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  box(g, 1.2, 0.08, 0.4, 0x9c6b43, 0, 0.4, 0);
  box(g, 0.08, 0.4, 0.35, 0x4a4a4a, -0.5, 0, 0);
  box(g, 0.08, 0.4, 0.35, 0x4a4a4a, 0.5, 0, 0);
  p.add(g);
}

export function flag(p, x, z, color = 0xef8a3c) {
  cyl(p, 0.04, 0.05, 3.2, 5, 0xdedede, x, 0, z);
  box(p, 0.9, 0.55, 0.04, color, x + 0.47, 2.55, z);
}

/** 簡單的偽亂數，同一個種子每次結果相同（樹的位置才不會每次重新整理都變）。 */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
