// 九種特殊地標：照 `美術/參考/地標/` 的真實照片用程式蓋出來。
// 校門字、壁畫、招牌直接取自照片（public/textures/landmarks/），AI 3D 會把這些細節糊掉。
// 原點＝格子地面中心；教學大樓與司令台跨兩格，以兩格交界線為中軸（SEAM）。
import * as THREE from 'three';
import { HEX, box, cyl, cone, ball, torus, windows, xiancao, mat, GLOW } from './kit.js';

const SEAM = (HEX * Math.sqrt(3)) / 2; // 相鄰兩格中心距離的一半

const WOOD = 0xc9834f;
const WOOD_DARK = 0x7a5238;
const STEEL = 0xbfc6cb;
const CONCRETE = 0xd9d2c2;
const CREAM = 0xf3ecdc;

// ── 貼圖 ──────────────────────────────────────────────

const loader = new THREE.TextureLoader();
const photos = new Map();

function photo(name) {
  if (!photos.has(name)) {
    const t = loader.load(`public/textures/landmarks/${name}`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    photos.set(name, t);
  }
  return photos.get(name);
}

/** 貼在牆上的一張圖。y＝底部高度，預設面朝南（+z，鏡頭方向）。 */
function decal(p, name, w, h, x, y, z, { rotY = 0, alpha = false } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshPhongMaterial({ map: photo(name), transparent: alpha, alphaTest: alpha ? 0.3 : 0, shininess: 20, specular: 0x151515 }),
  );
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

const texMat = (map, opts = {}) => new THREE.MeshPhongMaterial({ map, shininess: 30, specular: 0x1c1c1c, ...opts });

function addMesh(p, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  p.add(m);
  return m;
}

// 水磨石：校門與水池邊用的灰白斑點
function terrazzo(base = '#d9d7d0', dot = ['#8d8b86', '#f7f6f2', '#6c6a66']) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = dot[i % dot.length];
      g.fillRect((i * 73) % w, (i * 41 + i * i * 7) % h, 1 + (i % 2), 1 + (i % 2));
    }
  }, [0.6, 0.6]);
}

// 上亮光漆的橫向木板
function planksTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c47a36';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#b96e2d' : '#cf8540';
      g.fillRect(0, i * 16, w, 15);
      g.fillStyle = '#7d4a22';
      g.fillRect(0, i * 16 + 15, w, 1);
      g.fillStyle = '#8d5428';
      g.beginPath();
      g.ellipse((i * 47 + 20) % w, i * 16 + 7, 3, 2, 0, 0, 7);
      g.fill();
    }
  }, [1, 1]);
}

// ── 共用小物 ──────────────────────────────────────────

function chicken(g, x, z, color = 0xfaf6ee, y = 0) {
  ball(g, 0.2, color, x, y + 0.22, z);
  ball(g, 0.12, color, x + 0.14, y + 0.42, z);
  box(g, 0.05, 0.08, 0.1, 0xd9483b, x + 0.15, y + 0.52, z);
  cone(g, 0.035, 0.08, 6, 0xf2913d, x + 0.27, y + 0.39, z).rotation.z = -Math.PI / 2;
}

// 校園裡的老樹：粗幹分岔、樹冠大
function bigTree(g, x, z, s = 1, leaf = 0x5fa44e) {
  cyl(g, 0.3 * s, 0.42 * s, 1.5 * s, 12, 0x8a7a68, x, 0, z);
  for (const [a, l] of [[0.6, 1.3], [-0.5, 1.2], [0.1, 1.4]]) {
    const b = cyl(g, 0.12 * s, 0.2 * s, l * s, 8, 0x8a7a68, x + Math.sin(a) * 0.45 * s, 1.35 * s, z);
    b.rotation.z = -a;
  }
  for (const [dx, dy, dz, r] of [[0, 3.05, 0, 1.15], [0.95, 2.7, 0.2, 0.85], [-0.95, 2.7, -0.1, 0.9], [0.2, 2.65, 0.8, 0.75]]) {
    const c = ball(g, r * s, leaf, x + dx * s, dy * s, z + dz * s);
    c.scale.y = 0.82;
  }
}

// 瘦幹淺色的校樹（水池邊那幾棵）
function slimTree(g, x, z, s = 1) {
  cyl(g, 0.07 * s, 0.11 * s, 1.5 * s, 8, 0xc9bda8, x, 0, z);
  for (const [dx, dy, dz, r] of [[0, 1.95, 0, 0.62], [0.42, 1.72, 0.12, 0.42], [-0.4, 1.76, -0.1, 0.45]]) {
    ball(g, r * s, 0x6aad57, x + dx * s, dy * s, z + dz * s).scale.y = 0.85;
  }
}

// 黑松：一團一團深綠色
function pine(g, x, z, s = 1) {
  const t = cyl(g, 0.09 * s, 0.14 * s, 2.0 * s, 8, 0x5c4a3e, x, 0, z);
  t.rotation.z = 0.05;
  for (const [dx, dy, r] of [[0, 2.3, 0.5], [0.42, 1.8, 0.42], [-0.45, 1.5, 0.45], [0.05, 1.15, 0.36]]) {
    ball(g, r * s, 0x2f6b45, x + dx * s, dy * s, z).scale.y = 0.72;
  }
}

function bush(g, x, z, s = 1, c = 0x5fa44e) {
  ball(g, 0.34 * s, c, x, 0.25 * s, z).scale.y = 0.8;
  ball(g, 0.24 * s, c, x + 0.28 * s, 0.18 * s, z + 0.08 * s).scale.y = 0.8;
}

// 細長水草葉
function reeds(g, x, y, z, n, h, c = 0x6fb04a) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = cone(g, 0.035, h * (0.75 + (i % 3) * 0.15), 4, c, x + Math.cos(a) * 0.08, y, z + Math.sin(a) * 0.08);
    r.rotation.z = Math.cos(a) * 0.3;
    r.rotation.x = -Math.sin(a) * 0.3;
  }
}

/** 橫向排列的欄杆：從 (x0,z0) 到 (x1,z1)。 */
function rail(g, x0, z0, x1, z1, y, h, c = WOOD_DARK, step = 0.24) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const rot = Math.atan2(z0 - z1, x1 - x0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  box(g, len, 0.07, 0.09, c, cx, y + h - 0.07, cz).rotation.y = rot;
  box(g, len, 0.05, 0.07, c, cx, y + 0.1, cz).rotation.y = rot;
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const major = i === 0 || i === n;
    box(g, major ? 0.1 : 0.04, h, major ? 0.1 : 0.04, c, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t);
  }
}

// ── 1. 校門 ───────────────────────────────────────────

export const gate = (g) => {
  const stone = texMat(terrazzo('#ebe6d8', ['#c9c5b8', '#f8f5ec', '#b4b0a4']));
  const dark = texMat(terrazzo('#6e6d6c', ['#4a4a4a', '#9b9a98', '#3a3a3a']));

  // 進校門的水泥路與鐵門軌道
  box(g, 3.2, 0.03, 8, 0xdcd6c8, 0, 0, 0);
  box(g, 3.2, 0.035, 0.08, 0x9a958a, 0, 0.002, 0.45);

  // 右邊高柱：刻著校名
  const R = new THREE.Group();
  R.position.set(2.1, 0, 0.3);
  g.add(R);
  addMesh(R, new THREE.BoxGeometry(1.25, 3.5, 0.8), stone, 0, 0.9 + 1.75, 0);
  addMesh(R, new THREE.BoxGeometry(1.32, 0.9, 0.87), dark, 0, 0.45, 0);
  for (const s of [-1, 1]) box(R, 0.06, 3.5, 0.82, 0xbab5a8, s * 0.6, 0.9, 0);
  decal(R, 'gate-cn.png', 0.86, 3.05, 0, 1.08, 0.415, { alpha: true });

  // 左邊拱門：青銅色格柵小門
  const L = new THREE.Group();
  L.position.set(-2.15, 0, 0.3);
  g.add(L);
  const W = 2.0, H = 2.65, DOOR = 0.62, SPRING = 1.28;
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2, 0);
  sh.lineTo(-DOOR, 0);
  sh.lineTo(-DOOR, SPRING);
  sh.absarc(0, SPRING, DOOR, Math.PI, 0, true);
  sh.lineTo(DOOR, 0);
  sh.lineTo(W / 2, 0);
  sh.lineTo(W / 2, H);
  sh.lineTo(-W / 2, H);
  sh.closePath();
  const arch = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 12 });
  arch.translate(0, 0, -0.45);
  addMesh(L, arch, stone);
  for (const s of [-1, 1]) addMesh(L, new THREE.BoxGeometry(W / 2 - DOOR + 0.05, 0.75, 0.97), dark, s * (DOOR + (W / 2 - DOOR) / 2), 0.375, 0);
  decal(L, 'gate-en.png', 1.75, 0.285, 0, 2.2, 0.49, { alpha: true });
  const bronze = 0x9a6a3c;
  for (const x of [-0.56, 0.56]) box(L, 0.05, 1.8, 0.05, bronze, x, 0, 0.1);
  box(L, 1.16, 0.05, 0.05, bronze, 0, 1.75, 0.1);
  box(L, 1.16, 0.05, 0.05, bronze, 0, 0.05, 0.1);
  for (const [x, y, w, h] of [[-0.3, 0.3, 0.04, 0.6], [0.3, 0.3, 0.04, 0.6], [0, 0.1, 0.04, 0.55], [-0.3, 1.1, 0.04, 0.6], [0.3, 1.1, 0.04, 0.6], [0, 0.9, 0.04, 0.6]]) {
    box(L, w, h, 0.04, bronze, x, y, 0.1);
    box(L, 0.3, 0.04, 0.04, bronze, x + (x > 0 ? -0.13 : 0.13), y + h, 0.1);
  }

  // 高柱後面收起來的伸縮鐵門
  for (let i = 0; i < 6; i++) box(g, 0.05, 1.1, 0.05, 0xd8dde0, 3.05 - i * 0.05, 0, -0.55 + i * 0.07);
  box(g, 0.34, 0.06, 0.5, 0xd8dde0, 2.93, 1.1, -0.38);

  // 減速慢行牌、速限牌
  cyl(g, 0.03, 0.03, 1.5, 6, STEEL, 3.5, 0, 1.7);
  decal(g, 'gate-sign.jpg', 0.5, 0.82, 3.5, 0.75, 1.75);
  cyl(g, 0.025, 0.025, 1.3, 6, STEEL, -1.25, 0, -1.2);
  cyl(g, 0.2, 0.2, 0.03, 16, 0xd9483b, -1.25, 1.25, -1.2).rotation.x = Math.PI / 2;
  cyl(g, 0.15, 0.15, 0.04, 16, 0xfaf6ee, -1.25, 1.25, -1.2).rotation.x = Math.PI / 2;

  // 路兩旁的矮籬、小樹，門外空地才不會空空的
  for (const [x, z, k, c] of [[-3.2, -1.1, 1.3, 0x5fa44e], [-2.2, -2.5, 1.1, 0x74b45a], [2.3, -2.4, 1.1, 0x5fa44e], [3.3, -1.0, 1.0, 0x74b45a], [-2.2, 2.7, 1.1, 0x74b45a], [-3.2, 1.7, 1.2, 0x5fa44e], [2.5, 2.8, 1.0, 0x5fa44e]]) bush(g, x, z, k, c);
  slimTree(g, -3.15, 0.6, 0.8);
  for (const [x, z, c] of [[-2.0, 2.0, 0xf28fad], [-2.5, 2.25, 0xf7c948], [2.3, 2.2, 0xf2826a], [2.75, 2.4, 0xfaf6ee]]) ball(g, 0.09, c, x, 0.42, z);
};

// ── 2. 球場（跑道＋綠色球場，正中央那一格） ─────────────

export const court = (g) => {
  const RX = 3.45, HZ = 4.0, CZ = HZ - RX;
  const PX = 146; // 每公尺幾像素
  const CW = Math.round(RX * 2 * PX), CH = Math.round(HZ * 2 * PX);
  const stadium = (ctx, inset) => {
    const r = RX - inset;
    const x = CW / 2;
    ctx.beginPath();
    ctx.arc(x, (HZ - CZ) * PX, r * PX, Math.PI, 0);
    ctx.arc(x, (HZ + CZ) * PX, r * PX, 0, Math.PI);
    ctx.closePath();
  };
  const tex = canvasTex(CW, CH, (c) => {
    c.fillStyle = '#b5523f';
    c.fillRect(0, 0, CW, CH);
    c.strokeStyle = '#f7efe4';
    c.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      stadium(c, 0.06 + i * 0.235);
      c.stroke();
    }
    // 內圈草地
    stadium(c, 1.0);
    c.fillStyle = '#86bd55';
    c.fill();
    // 球場
    const hw = 1.72 * PX, hh = 2.25 * PX, mx = CW / 2, my = CH / 2 - 0.25 * PX;
    c.fillStyle = '#f7efe4';
    c.fillRect(mx - hw - 8, my - hh - 8, hw * 2 + 16, hh * 2 + 16);
    c.fillStyle = '#c05a43';
    c.fillRect(mx - hw, my - hh, hw * 2, hh * 2);
    c.fillStyle = '#62ad70';
    c.fillRect(mx - hw + 9, my - hh + 9, hw * 2 - 18, hh * 2 - 18);
    // 藍色禁區與中圈
    c.fillStyle = '#2f6fd6';
    c.fillRect(mx - 0.72 * PX, my - hh + 9, 1.44 * PX, 1.1 * PX);
    c.beginPath();
    c.arc(mx, my, 0.5 * PX, 0, 7);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    c.moveTo(mx - hw + 9, my);
    c.lineTo(mx + hw - 9, my);
    c.stroke();
    // 三分線（白）與排球線（黃）
    c.beginPath();
    c.arc(mx, my - hh + 9, 1.45 * PX, 0.02, Math.PI - 0.02);
    c.stroke();
    c.beginPath();
    c.arc(mx, my + hh - 9, 1.2 * PX, Math.PI + 0.02, -0.02);
    c.stroke();
    c.strokeStyle = '#efb32e';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(mx, my + hh - 9, 0.75 * PX, Math.PI + 0.02, -0.02);
    c.stroke();
    c.beginPath();
    c.moveTo(mx - hw + 9, my - 0.85 * PX);
    c.quadraticCurveTo(mx, my - 0.2 * PX, mx + hw - 9, my - 0.85 * PX);
    c.stroke();
    // 跑道號碼
    c.fillStyle = '#f7efe4';
    c.font = 'bold 28px sans-serif';
    c.textAlign = 'center';
    for (let i = 0; i < 4; i++) c.fillText(String(4 - i), (0.2 + i * 0.235) * PX, CH / 2 + 60);
  });

  const sh = new THREE.Shape();
  sh.absarc(0, CZ, RX, 0, Math.PI, false);
  sh.absarc(0, -CZ, RX, Math.PI, Math.PI * 2, false);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 24 });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + RX) / (RX * 2), (pos.getY(i) + HZ) / (HZ * 2));
  geo.rotateX(-Math.PI / 2);
  const floor = addMesh(g, geo, texMat(tex, { shininess: 12 }), 0, 0.015, 0);
  floor.castShadow = false;

  // 北邊籃架
  const Z = -0.25 - 2.25 - 0.1;
  box(g, 0.1, 2.2, 0.1, 0x3f7bd0, 0, 0, Z);
  box(g, 0.7, 0.45, 0.05, 0xffffff, 0, 2.05, Z + 0.1);
  torus(g, 0.13, 0.025, 0xef7a2c, 0, 2.08, Z + 0.25).rotation.x = Math.PI / 2;

  // 南邊草地上的足球門
  const netTex = canvasTex(32, 32, (c) => {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.strokeRect(0, 0, 32, 32);
  }, [8, 4]);
  const net = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.82, 0.42), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  net.position.set(0, 0.42, 2.74);
  g.add(net);
  for (const s of [-1, 1]) box(g, 0.05, 0.86, 0.05, 0xffffff, s * 0.75, 0, 2.54);
  box(g, 1.55, 0.05, 0.05, 0xffffff, 0, 0.84, 2.54);
  ball(g, 0.1, 0xffffff, 0.9, 0.11, 1.9);
};

// ── 3. 教學大樓（跨兩格的 U 形兩層樓，中間包著司令台） ──────

function arched(g, x, y, z, c = 0x4b5a68) {
  const sh = new THREE.Shape();
  sh.moveTo(-0.2, 0);
  sh.lineTo(-0.2, 0.26);
  sh.absarc(0, 0.26, 0.2, Math.PI, 0, true);
  sh.lineTo(0.2, 0);
  sh.closePath();
  const m = addMesh(g, new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 8 }), mat(c), x, y, z);
  m.castShadow = false;
  box(g, 0.03, 0.46, 0.03, 0xffffff, x, y, z + 0.03);
  box(g, 0.4, 0.03, 0.03, 0xffffff, x, y + 0.26, z + 0.03);
}

/** 兩層樓的走廊段：後牆、中間樓板與矮牆、一排柱子、斜屋頂。 */
function wingSegment(p, w, d) {
  const H = 3.0;
  box(p, w, H, d * 0.55, CONCRETE, 0, 0, -d * 0.22);
  const front = -d * 0.22 + (d * 0.55) / 2 + 0.01;
  windows(p, Math.max(2, Math.round(w / 0.85)), 0.42, 0.55, w - 0.4, 0.45, front);
  windows(p, Math.max(2, Math.round(w / 0.85)), 0.42, 0.55, w - 0.4, 1.95, front);
  box(p, w, 0.14, d, 0xcbc4b3, 0, 1.45, 0);     // 二樓樓板
  box(p, w, 0.42, 0.1, 0xddd6c6, 0, 1.56, d / 2 - 0.05); // 二樓矮牆
  const n = Math.max(2, Math.round(w / 1.1));
  for (let i = 0; i <= n; i++) box(p, 0.2, H, 0.2, 0xe8e2d3, -w / 2 + 0.1 + (i * (w - 0.2)) / n, 0, d / 2 - 0.12);
}

export const campus = (g) => {
  const B = new THREE.Group();
  B.position.set(SEAM, 0, -0.1);
  g.add(B);

  // 中段
  const M = new THREE.Group();
  M.position.set(0, 0, -1.55);
  B.add(M);
  wingSegment(M, 6.2, 1.5);
  const roofSlab = box(M, 6.5, 0.1, 1.9, 0xa9b27a, 0, 3.12, 0);
  roofSlab.rotation.x = 0.18;
  for (let i = 0; i < 4; i++) { // 太陽能板
    const panel = box(M, 1.28, 0.05, 1.05, 0x2c3e66, -2.25 + i * 1.5, 3.22, -0.05);
    panel.rotation.x = 0.18;
    for (let k = 1; k < 3; k++) box(panel, 0.015, 0.06, 1.05, 0x8fa6c4, -0.64 + k * 0.427, 0, 0);
  }

  // 左右斜翼與尾端高塔
  for (const s of [-1, 1]) {
    const W = new THREE.Group();
    W.position.set(s * 4.05, 0, -0.75);
    W.rotation.y = -s * 0.42;
    B.add(W);
    wingSegment(W, 2.4, 1.4);
    const r = box(W, 2.7, 0.1, 1.75, 0x6e7a62, 0, 3.12, 0);
    r.rotation.x = 0.18;

    const T = new THREE.Group();
    T.position.set(s * 6.05, 0, 0.55);
    B.add(T);
    box(T, 2.3, 3.0, 2.3, 0xd2cbb9, 0, 0, 0);
    // 一樓開口
    box(T, 0.8, 1.2, 0.03, 0x6d6a62, -s * 0.55, 0, 1.15);
    box(T, 0.65, 0.65, 0.03, 0xf2ecd9, s * 0.5, 0.35, 1.15);
    // 白色山牆與兩個拱窗
    const gs = new THREE.Shape();
    gs.moveTo(-1.2, 0);
    gs.lineTo(0, 0.95);
    gs.lineTo(1.2, 0);
    gs.closePath();
    const gable = new THREE.ExtrudeGeometry(gs, { depth: 2.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    addMesh(T, gable, mat(0xfafaf4), 0, 3.0, -1.1);
    box(T, 2.45, 0.08, 2.45, 0x7f9a6a, 0, 2.97, 0);
    arched(T, -0.33, 3.12, 1.16);
    arched(T, 0.33, 3.12, 1.16);
  }

  // 左翼牆上的直條旗幟
  [0xd86a8a, 0xe58b5a, 0x6aa8d8, 0xd9483b].forEach((c, i) => box(B, 0.2, 1.3, 0.04, c, -6.85 + i * 0.28, 1.45, 1.72));
};

// ── 4. 司令台（波浪頂棚、背牆壁畫、底座學生彩繪） ─────────

function ovalBand(a, b, y0, h, wave, rows, segs = 56) {
  // rows: [半徑比例, 高度比例, 波浪比例, v]
  const pos = [], uv = [], idx = [];
  rows.forEach(([rk, hk, wk, v]) => {
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const w = wave * (Math.sin(t * 3 + 0.8) * 0.7 + Math.sin(t * 5) * 0.3);
      pos.push(Math.cos(t) * a * rk, y0 + h * hk + w * wk, Math.sin(t) * b * rk);
      uv.push((i / segs) * 4, v);
    }
  });
  const n = segs + 1;
  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const p = r * n + i;
      idx.push(p, p + n, p + 1, p + 1, p + n, p + n + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const stage = (g) => {
  const S = new THREE.Group();
  S.position.set(-SEAM, 0, 0.25);
  g.add(S);

  // 底座：前半圈貼學生彩繪，u 用 sin 換算才不會變形
  const a = 2.45, b = 1.3, h = 0.6;
  const pos = [], uv = [], idx = [];
  const segs = 48;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI; // 由東往西繞過南面
    const x = Math.cos(t) * a, z = Math.sin(t) * b;
    const u = 1 - (Math.cos(t) + 1) / 2;
    pos.push(x, 0, z, x, h, z);
    uv.push(u, 0, u, 1);
  }
  for (let i = 0; i < segs; i++) {
    const p = i * 2;
    idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
  }
  const front = new THREE.BufferGeometry();
  front.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  front.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  front.setIndex(idx);
  front.computeVertexNormals();
  addMesh(S, front, new THREE.MeshPhongMaterial({ map: photo('stage-base.jpg'), shininess: 20, side: THREE.DoubleSide }));
  const top = cyl(S, a, a, 0.06, 40, 0xcfc9ba, 0, h - 0.03, 0);
  top.scale.z = b / a;
  const curb = cyl(S, a + 0.16, a + 0.2, 0.05, 40, 0xbdb8aa, 0, 0, 0);
  curb.scale.z = (b + 0.16) / (a + 0.16);

  // 背牆與壁畫
  box(S, 3.7, 2.15, 0.2, 0xe9e2cf, 0, h, -0.75);
  const mural = decal(S, 'stage-mural.jpg', 3.4, 1.22, 0, h + 0.1, -0.64);
  mural.material.emissive = new THREE.Color(0xffffff); // 在頂棚陰影下仍看得清楚
  mural.material.emissiveMap = mural.material.map;
  mural.material.emissiveIntensity = 0.45;

  // 外斜的柱子
  for (const s of [-1, 1]) {
    const p = box(S, 0.26, 2.2, 0.3, 0xf0e9d6, s * 1.75, h - 0.05, -0.45);
    p.rotation.z = s * -0.06;
    box(S, 0.42, 0.35, 0.42, 0xf5f0e2, s * 1.82, h + 1.85, -0.45);
  }

  // 波浪頂棚：白邊夾一條綠色葉片帶
  const band = canvasTex(1024, 128, (c, W, H) => {
    c.fillStyle = '#fbf8ee';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#9fce6b';
    c.fillRect(0, 16, W, 88);
    for (let i = 0; i < 160; i++) {
      c.fillStyle = i % 2 ? '#3f8f4c' : '#2f7a42';
      c.beginPath();
      c.ellipse((i * 137) % W, 24 + ((i * 61) % 72), 6, 3.5, (i % 5) * 0.6, 0, 7);
      c.fill();
    }
  });
  band.wrapS = THREE.RepeatWrapping;
  const roof = ovalBand(2.75, 1.65, h + 2.0, 0.72, 0.15, [
    [0, 0, 0, 0.02],
    [0.9, 0, 0, 0.02],
    [0.985, 0.04, 0.2, 0.02],
    [1, 0.18, 0.5, 0.1],
    [1, 0.82, 1, 0.92],
    [0.97, 1, 1, 0.98],
    [0.72, 1.07, 0.7, 0.98],
    [0, 1.1, 0, 0.98],
  ]);
  addMesh(S, roof, new THREE.MeshPhongMaterial({ map: band, shininess: 45, specular: 0x262626, side: THREE.DoubleSide }), 0, 0, -0.1);

  // 後方旗桿與國旗
  const flagTex = canvasTex(96, 64, (c, W, H) => {
    c.fillStyle = '#d3322c';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#16307a';
    c.fillRect(0, 0, W / 2, H / 2);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(W / 4, H / 4, 9, 0, 7);
    c.fill();
  });
  cyl(S, 0.035, 0.05, 6.2, 8, 0xe2e2e2, 0, 0, -1.05);
  ball(S, 0.08, 0xdedede, 0, 6.24, -1.05);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.53), new THREE.MeshPhongMaterial({ map: flagTex, side: THREE.DoubleSide, shininess: 15 }));
  fl.position.set(-0.42, 5.8, -1.05);
  S.add(fl);

  // 司令台兩側的小樹
  slimTree(S, -3.1, 0.9, 0.85);
  slimTree(S, 3.1, 0.9, 0.85);
};

// ── 5. 樹屋（兩根彩色水泥管＋木平台＋A 字小屋） ─────────

function pipe(g, x, z, R, len, rimColor, inColor) {
  const shell = addMesh(g, new THREE.CylinderGeometry(R, R, len, 28, 1, true), new THREE.MeshPhongMaterial({ color: 0xe8e0c8, shininess: 20 }), x, R, z);
  shell.rotation.x = Math.PI / 2;
  const inner = addMesh(g, new THREE.CylinderGeometry(R - 0.09, R - 0.09, len, 28, 1, true), new THREE.MeshPhongMaterial({ color: inColor, shininess: 25, side: THREE.BackSide }), x, R, z);
  inner.rotation.x = Math.PI / 2;
  inner.castShadow = false;
  for (const s of [-1, 1]) {
    const scale = (R - 0.04) / 0.5;
    const rim = torus(g, 0.5, 0.05, rimColor, x, R, z + (s * len) / 2);
    rim.scale.set(scale, scale, 1.6);
  }
  box(g, R * 1.05, 0.14, len * 0.72, 0x8c5f46, x, 0.2, z); // 管裡的木椅
}

export const treehouse = (g) => {
  // 泥地
  const dirt = cyl(g, 3.45, 3.45, 0.03, 32, 0xd3bd96, -0.1, 0, -0.1);
  dirt.scale.z = 0.92;
  dirt.castShadow = false;

  const T = new THREE.Group();
  T.position.set(-0.75, 0, -0.1);
  T.rotation.y = -0.24;
  g.add(T);

  const R = 0.98, LEN = 2.0;
  pipe(T, -1.25, 0.05, R, LEN, 0xd93a35, 0x63b95c);
  pipe(T, 0.72, 0.05, R, LEN, 0x2d62c9, 0xdf9140);

  // 平台
  const DY = R * 2 + 0.03;
  box(T, 5.2, 0.16, 2.5, 0x6d4a35, -0.15, DY, 0);
  box(T, 5.25, 0.08, 2.55, 0x8a6246, -0.15, DY + 0.14, 0);
  const FY = DY + 0.2;

  // 右側竹編小間（在藍管旁，撐住平台）
  const bamboo = canvasTex(64, 64, (c) => {
    c.fillStyle = '#c2a06a';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#8f6f3e';
    c.lineWidth = 3;
    for (let i = -64; i < 128; i += 12) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 64, 64);
      c.moveTo(i + 64, 0);
      c.lineTo(i, 64);
      c.stroke();
    }
  }, [2, 3]);
  addMesh(T, new THREE.BoxGeometry(0.9, DY, 1.7), texMat(bamboo, { shininess: 10 }), 2.25, DY / 2, 0.15);
  box(T, 1.15, 0.08, 2.0, 0xa8865a, 2.25, DY - 0.08, 0.2);

  // A 字小屋（平台左端）
  const A = new THREE.Group();
  A.position.set(-1.95, FY, 0);
  T.add(A);
  const a = new THREE.Shape();
  a.moveTo(-0.95, 0);
  a.lineTo(0, 1.85);
  a.lineTo(0.95, 0);
  a.closePath();
  addMesh(A, new THREE.ExtrudeGeometry(a, { depth: 1.9, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 }), mat(0x8c6247), 0, 0, -0.95);
  for (let i = 0; i < 4; i++) box(A, 1.7 - i * 0.38, 0.025, 0.02, 0x6d4a35, 0, 0.28 + i * 0.32, 0.99);
  decal(A, 'tree-sign.jpg', 0.92, 0.2, 0, 0.42, 1.0);
  for (const s of [-1, 1]) { // 屋頂斜板與交叉的椽
    const sl = box(A, 1.2, 0.08, 2.1, 0x565c4c, s * 0.53, 0.72, 0);
    sl.rotation.z = -s * 1.1;
    const raf = box(A, 0.09, 2.5, 0.09, 0x6d4a35, s * 0.1, 0.25, 1.02);
    raf.rotation.z = s * 0.52;
  }

  // 小涼亭
  for (const [x, z] of [[-0.75, -0.75], [0.35, -0.75], [-0.75, 0.2], [0.35, 0.2]]) box(T, 0.1, 1.15, 0.1, 0x7a5238, x, FY, z);
  box(T, 1.6, 0.1, 1.5, 0x5b3e2d, -0.2, FY + 1.15, -0.28).rotation.z = 0.06;

  // 欄杆
  rail(T, -0.95, 1.2, 2.4, 1.2, FY, 0.7);
  rail(T, 2.4, 1.2, 2.4, -1.2, FY, 0.7);
  rail(T, -0.95, -1.2, 1.5, -1.2, FY, 0.7);

  // 樓梯：平台右後方往後走到地面
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    box(T, 0.75, 0.07, 0.3, 0x8d8a82, 2.0, FY - 0.05 - (i + 1) * (FY / (steps + 1)), -1.25 - t * 1.75);
  }
  for (const s of [-1, 1]) {
    const len = Math.hypot(FY, 1.85);
    const str = box(T, 0.06, len, 0.14, 0x6d4a35, 2.0 + s * 0.4, 0, -1.2);
    str.geometry.translate(0, 0, 0);
    str.position.set(2.0 + s * 0.4, FY / 2, -2.12);
    str.rotation.x = -Math.atan2(1.85, FY);
  }

  // 老樹、蕨類、鳥屋
  bigTree(g, 3.1, -1.1, 1);
  for (let i = 0; i < 7; i++) {
    const f = cone(g, 0.09, 0.75, 5, 0x83c551, 2.62 + i * 0.13, 0.95, -0.45 + (i % 2) * 0.1);
    f.rotation.x = Math.PI;
  }
  box(g, 0.3, 0.26, 0.26, 0xa8865a, 3.55, 2.0, -0.55);

  // 樹下兩階木平台與木圍籬
  box(g, 2.0, 0.2, 1.1, 0xa8795a, 2.75, 0, 0.75);
  box(g, 1.6, 0.2, 0.75, 0x96694d, 2.85, 0.2, 0.55);
  for (let i = 0; i < 7; i++) box(g, 0.24, 1.1 + Math.sin(i * 0.9) * 0.18, 0.08, 0xa8795a, 1.95 + i * 0.27, 0, -2.25 + i * 0.02);

  // 藍色單槓
  for (let i = 0; i < 3; i++) {
    box(g, 0.1, 1.5 + i * 0.25, 0.1, 0x2d62c9, -3.4, 0, -1.85 + i * 0.5);
    box(g, 0.05, 0.05, 0.5, 0xf0c24a, -3.4, 1.2 + i * 0.22, -1.6 + i * 0.5);
  }
};

// ── 6. 水池（水磨石池邊、岩石、白鷺、八哥、銅像） ─────────

export const pond = (g) => {
  const outline = (k) => {
    const s = new THREE.Shape();
    s.moveTo(0, -2.2 * k);
    s.bezierCurveTo(1.7 * k, -1.9 * k, 3.05 * k, -0.7 * k, 2.85 * k, 0.45 * k);
    s.bezierCurveTo(2.65 * k, 1.55 * k, 1.25 * k, 1.85 * k, 0, 1.85 * k);
    s.bezierCurveTo(-1.25 * k, 1.85 * k, -2.65 * k, 1.55 * k, -2.85 * k, 0.45 * k);
    s.bezierCurveTo(-3.05 * k, -0.7 * k, -1.7 * k, -1.9 * k, 0, -2.2 * k);
    return s;
  };
  const P = new THREE.Group();
  P.position.set(0.25, 0, 0.55);
  g.add(P);

  const rimShape = outline(1);
  rimShape.holes.push(new THREE.Path(outline(0.85).getPoints(40)));
  const rim = new THREE.ExtrudeGeometry(rimShape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 20 });
  rim.rotateX(-Math.PI / 2);
  addMesh(P, rim, texMat(terrazzo()));

  const wg = new THREE.ShapeGeometry(outline(0.87), 24);
  wg.rotateX(-Math.PI / 2);
  const water = addMesh(P, wg, new THREE.MeshPhongMaterial({ color: 0x3a6b68, shininess: 110, specular: 0x88aaaa }), 0, 0.26, 0);
  water.castShadow = false;

  // 睡蓮葉
  for (const [x, z, r] of [[0.2, 1.05, 0.13], [0.55, 1.2, 0.11], [0.95, 0.95, 0.12], [1.3, 1.05, 0.1], [0.65, 0.8, 0.09], [-0.5, 1.15, 0.1], [1.65, 0.55, 0.11], [-1.5, 0.8, 0.12], [-1.15, 1.1, 0.09], [-1.9, 0.3, 0.1]]) {
    const pad = cyl(P, r, r, 0.015, 12, 0x68ad58, x, 0.27, z);
    pad.castShadow = false;
  }
  // 岩石
  const rock = ball(P, 0.62, 0x9d9a90, 0.55, 0.65, -0.65);
  rock.scale.set(0.8, 1.15, 0.72);
  rock.rotation.z = -0.2;
  const rock2 = ball(P, 0.34, 0xaba79c, -0.05, 0.38, -0.45);
  rock2.scale.set(1.2, 0.7, 0.9);

  // 水生植物
  reeds(P, -0.55, 0.26, -0.55, 8, 0.75);
  reeds(P, 1.25, 0.26, -0.75, 7, 0.65, 0x7dbb54);
  reeds(P, -1.25, 0.26, 0.1, 6, 0.6, 0x7dbb54);
  const leaf = ball(P, 0.2, 0x6db85a, 1.45, 0.72, 0.35);
  leaf.scale.set(1.3, 0.3, 0.7);
  cyl(P, 0.02, 0.025, 0.5, 5, 0x5a9e45, 1.45, 0.26, 0.35);

  // 白鷺雕塑
  const egret = (x, z, rot) => {
    const e = new THREE.Group();
    e.position.set(x, 0.42, z);
    e.rotation.y = rot;
    P.add(e);
    ball(e, 0.15, 0xffffff, 0, 0.22, 0).scale.set(1.8, 0.8, 0.85);
    const n = cyl(e, 0.035, 0.05, 0.35, 6, 0xffffff, 0.22, 0.22, 0);
    n.rotation.z = -0.5;
    ball(e, 0.06, 0xffffff, 0.36, 0.55, 0);
    cone(e, 0.02, 0.13, 5, 0xf2b83a, 0.44, 0.52, 0).rotation.z = -Math.PI / 2;
    cyl(e, 0.012, 0.012, 0.2, 4, 0xe8d39c, 0, 0, 0);
  };
  egret(-0.3, -0.72, 0.25);
  egret(1.15, -0.2, 2.5);

  // 枯枝上的兩隻八哥
  const br = cyl(P, 0.025, 0.05, 1.05, 6, 0x5b4636, 0.28, 0.75, -0.65);
  br.rotation.z = 0.35;
  for (const [x, y] of [[0.02, 1.68], [0.42, 1.44]]) {
    const b = ball(P, 0.1, 0x25272b, x, y, -0.65);
    b.scale.set(1.25, 0.9, 0.85);
    ball(P, 0.06, 0x25272b, x + 0.09, y + 0.09, -0.65);
    cone(P, 0.018, 0.07, 5, 0xefb02e, x + 0.17, y + 0.06, -0.65).rotation.z = -Math.PI / 2;
  }

  // 左後方的銅像與基座
  const S = new THREE.Group();
  S.position.set(-2.55, 0, -2.0);
  g.add(S);
  box(S, 1.0, 0.1, 1.0, 0xa9a598, 0, 0, 0);
  box(S, 0.82, 1.1, 0.82, 0xc4bfb2, 0, 0.1, 0);
  box(S, 0.96, 0.1, 0.96, 0xd3cec1, 0, 1.2, 0);
  decal(S, 'bust-plaque.jpg', 0.2, 0.82, 0, 0.22, 0.42);
  const sh = ball(S, 0.3, 0xb7b3a7, 0, 1.46, 0);
  sh.scale.set(1.2, 0.72, 0.72);
  ball(S, 0.19, 0xc2bdb1, 0, 1.82, 0).scale.y = 1.1;

  // 周圍樹叢
  slimTree(g, 2.9, -1.95, 1.1);
  slimTree(g, -0.3, -2.7, 1.2);
  slimTree(g, 1.35, -2.7, 0.95);
  bush(g, -3.45, -0.9, 1.1);
  bush(g, 3.25, 1.5, 1.2, 0x8bbf4f);
  bush(g, -1.6, -2.75, 0.95, 0x74b45a);
};

// ── 7. 水稻田（紅磚矮牆、黑松、綠油油的稻子） ──────────

export const paddy = (g) => {
  const X0 = -2.75, X1 = 1.95, Z0 = -1.95, Z1 = 2.1;
  const soil = box(g, X1 - X0, 0.05, Z1 - Z0, 0x7ea25a, (X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  soil.castShadow = false;

  // 稻子：一根一根用 InstancedMesh，風格是細長的綠條
  const blade = new THREE.ConeGeometry(0.03, 0.82, 4).translate(0, 0.41, 0);
  const rows = 22, cols = 26;
  const n = rows * cols * 3;
  const rice = new THREE.InstancedMesh(blade, new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 35, specular: 0x1c2412 }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  let seed = 7;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let k = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let t = 0; t < 3; t++) {
        const x = X0 + 0.15 + ((j + 0.5) / cols) * (X1 - X0 - 0.3) + (r() - 0.5) * 0.14;
        const z = Z0 + 0.15 + ((i + 0.5) / rows) * (Z1 - Z0 - 0.3) + (r() - 0.5) * 0.14;
        e.set((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4);
        q.setFromEuler(e);
        const h = 0.85 + r() * 0.4;
        m.compose(p.set(x, 0.04, z), q, s.set(1, h, 1));
        rice.setMatrixAt(k, m);
        rice.setColorAt(k, c.setHSL(0.235 + r() * 0.04, 0.7, 0.5 + r() * 0.13));
        k++;
      }
    }
  }
  rice.castShadow = true;
  rice.receiveShadow = true;
  g.add(rice);

  // 插在田裡的紅色小標
  box(g, 0.035, 1.05, 0.035, 0xd9483b, -0.9, 0, 1.75);

  // 後方紅磚矮牆與柵欄
  for (let i = 0; i < 2; i++) box(g, 6.4, 0.22, 0.28, i ? 0xb5634a : 0xa85a42, -0.2, i * 0.22, -2.3);
  box(g, 6.5, 0.07, 0.34, 0xc9c1b0, -0.2, 0.44, -2.3);
  rail(g, -3.3, -2.3, 2.9, -2.3, 0.5, 0.42, 0x4a4f55, 0.3);

  // 黑松
  pine(g, -2.7, -3.0, 1.1);
  pine(g, -1.15, -3.3, 1.25);
  pine(g, 0.65, -3.15, 1.15);

  // 右邊的香草圃：仙草（太平Q雞的故鄉）
  for (const [x, z] of [[2.6, -1.3], [3.15, -0.7], [2.55, -0.25], [3.2, 0.3], [2.6, 0.75], [3.1, 1.25]]) xiancao(g, x, z, 1.1);
  bush(g, 2.75, -1.95, 1.1, 0x7fb45a);
  ball(g, 0.34, 0x9bb79a, 2.75, 0.3, 1.8).scale.y = 0.75; // 銀灰色的迷迭香叢
};

// ── 8. 雞舍（太平國小 27 屆夢想雞舍） ───────────────────

export const coop = (g) => {
  const C = new THREE.Group();
  C.position.set(-0.2, 0, 0.05);
  g.add(C);

  // 白碎石地與水泥邊框
  const gravel = canvasTex(128, 128, (c) => {
    c.fillStyle = '#c8c8c4';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = ['#efefea', '#9d9d98', '#ddddd8', '#7f7f7a'][i % 4];
      c.beginPath();
      c.arc((i * 71) % 128, (i * i * 13 + i * 37) % 128, 1 + (i % 3), 0, 7);
      c.fill();
    }
  }, [3, 2]);
  const pad = addMesh(C, new THREE.BoxGeometry(6.5, 0.05, 4.9), texMat(gravel, { shininess: 8 }), 0, 0.025, 0);
  pad.castShadow = false;
  for (const [w, d, x, z] of [[6.7, 0.12, 0, 2.5], [6.7, 0.12, 0, -2.5], [0.12, 5.0, 3.3, 0], [0.12, 5.0, -3.3, 0]]) box(C, w, 0.1, d, 0xcfc9bb, x, 0, z);

  const FX0 = -2.5, FX1 = 2.45, FZ0 = -1.45, FZ1 = 1.15, MID = -0.42;
  // 粗糠地
  const husk = box(C, FX1 - FX0, 0.1, FZ1 - FZ0, 0xc9a35f, (FX0 + FX1) / 2, 0.04, (FZ0 + FZ1) / 2);
  husk.castShadow = false;

  // 木屋（左側）
  const wood = planksTex();
  const shedW = MID - FX0, shedD = FZ1 - FZ0;
  addMesh(C, new THREE.BoxGeometry(shedW, 2.15, shedD), texMat(wood), FX0 + shedW / 2, 0.13 + 1.075, (FZ0 + FZ1) / 2);
  // 長條窗
  box(C, 1.45, 0.52, 0.03, 0x3a4048, FX0 + shedW / 2, 1.05, FZ1 + 0.01);
  box(C, 0.04, 0.52, 0.04, 0xc47a36, FX0 + shedW / 2 + 0.25, 1.05, FZ1 + 0.03);
  // 招牌
  decal(C, 'coop-sign.png', 1.02, 0.38, FX0 + shedW / 2, 1.72, FZ1 + 0.02, { alpha: true });
  // 集蛋箱
  addMesh(C, new THREE.BoxGeometry(1.6, 0.72, 0.5), texMat(wood), FX0 + shedW / 2 + 0.1, 0.18 + 0.36, FZ1 + 0.26);
  box(C, 1.72, 0.07, 0.6, 0x9b5f2c, FX0 + shedW / 2 + 0.1, 0.9, FZ1 + 0.27);

  // 鍍鋅鐵柱與橫管
  for (const x of [MID, 1.0, FX1]) for (const z of [FZ0, FZ1]) cyl(C, 0.05, 0.05, 2.25, 8, STEEL, x, 0.05, z);
  cyl(C, 0.05, 0.05, 2.1, 8, STEEL, FX1, 0.05, -0.15);
  for (const [z, y] of [[FZ1, 1.0], [FZ0, 1.0], [FZ1, 0.12], [FZ0, 0.12]]) {
    const h = cyl(C, 0.03, 0.03, FX1 - MID, 6, STEEL, (FX1 + MID) / 2, y, z);
    h.rotation.z = Math.PI / 2;
    h.position.y = y;
  }

  // 鐵絲網：菱格透明貼圖
  const mesh = canvasTex(32, 32, (c) => {
    c.strokeStyle = '#d4d9dc';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 16);
    c.lineTo(16, 0);
    c.lineTo(32, 16);
    c.lineTo(16, 32);
    c.closePath();
    c.stroke();
  }, [28, 14]);
  const wire = new THREE.MeshBasicMaterial({ map: mesh, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const addWire = (w, x, z, rotY) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.15), wire);
    pl.position.set(x, 1.15, z);
    pl.rotation.y = rotY;
    pl.renderOrder = 2;
    C.add(pl);
  };
  addWire(FX1 - MID, (FX1 + MID) / 2, FZ1, 0);
  addWire(FX1 - MID, (FX1 + MID) / 2, FZ0, 0);
  addWire(FZ1 - FZ0, FX1, (FZ0 + FZ1) / 2, Math.PI / 2);

  // 網子上的兩張說明牌
  box(C, 0.3, 0.42, 0.02, 0xf5f5f0, 0.05, 1.05, FZ1 + 0.03);
  box(C, 0.3, 0.42, 0.02, 0xf0a15e, 0.42, 1.05, FZ1 + 0.03);

  // 斜屋頂：白色浪板、灰色外框
  const R = new THREE.Group();
  R.position.set(0, 2.5, -0.15);
  R.rotation.x = 0.1;
  C.add(R);
  box(R, 5.7, 0.07, 3.5, 0xf5f4ee, 0, 0, 0);
  for (const [w, d, x, z] of [[5.82, 0.1, 0, 1.75], [5.82, 0.1, 0, -1.75], [0.1, 3.55, 2.88, 0], [0.1, 3.55, -2.88, 0]]) box(R, w, 0.16, d, 0x5e6468, x, -0.05, z);
  for (let i = 1; i < 5; i++) box(R, 0.07, 0.1, 3.4, 0x8d9498, -2.85 + i * 1.14, -0.1, 0);
  for (let i = 1; i < 16; i++) box(R, 0.035, 0.02, 3.42, 0xdcdad0, -2.85 + i * 0.356, 0.07, 0);
  // 投光燈
  box(C, 0.3, 0.2, 0.08, 0x2f3236, MID, 2.05, FZ1 + 0.1);
  box(C, 0.24, 0.14, 0.09, 0xf7f3d8, MID, 2.08, FZ1 + 0.11);

  // 棲木
  for (const [x, z, h, rz, rx] of [[0.65, -0.35, 1.35, 0.25, 0.1], [1.1, -0.2, 1.1, -0.3, -0.1]]) {
    const b = cyl(C, 0.035, 0.06, h, 6, 0x5b4636, x, 0.12, z);
    b.rotation.set(rx, 0, rz);
  }
  const perch = cyl(C, 0.03, 0.035, 1.5, 6, 0x5b4636, 0.85, 1.15, -0.25);
  perch.rotation.z = Math.PI / 2 - 0.1;
  perch.position.y = 1.15;

  // 住戶：照片裡有黑雞也有白雞
  chicken(C, 0.1, 0.45, 0x2c2a2e, 0.12);
  chicken(C, 1.45, 0.55, 0xfaf6ee, 0.12);
  chicken(C, 1.95, -0.5, 0xc98a4a, 0.12);
  chicken(C, 0.85, 0.75, 0xfaf6ee, 0.12);
  // 水盆與飼料盤
  cyl(C, 0.17, 0.13, 0.1, 12, 0xb5603f, 1.8, 0.14, 0.35);
  box(C, 0.42, 0.05, 0.22, 0x3a3440, 0.45, 0.14, -0.1);

  // 後方大樹
  bigTree(g, 3.0, -3.0, 0.9);
};

// ── 9. 五甲閱讀角（五甲教室裡的閱讀角，剖開牆壁看進去） ───

function panda(g, x, y, z, s = 1) {
  ball(g, 0.3 * s, 0xf7f5ef, x, y + 0.28 * s, z);
  ball(g, 0.22 * s, 0xf7f5ef, x, y + 0.66 * s, z + 0.04 * s);
  for (const k of [-1, 1]) {
    ball(g, 0.08 * s, 0x25252a, x + k * 0.17 * s, y + 0.84 * s, z); // 耳朵
    ball(g, 0.055 * s, 0x25252a, x + k * 0.09 * s, y + 0.69 * s, z + 0.21 * s); // 眼圈
    ball(g, 0.13 * s, 0x25252a, x + k * 0.27 * s, y + 0.34 * s, z + 0.08 * s); // 手
    ball(g, 0.13 * s, 0x25252a, x + k * 0.18 * s, y + 0.1 * s, z + 0.2 * s); // 腳
  }
}

function elephant(g, x, y, z, s = 1) {
  const c = 0x9da3a8;
  ball(g, 0.3 * s, c, x, y + 0.3 * s, z);
  ball(g, 0.23 * s, c, x, y + 0.65 * s, z + 0.08 * s);
  for (const k of [-1, 1]) ball(g, 0.15 * s, 0xb5bbc0, x + k * 0.26 * s, y + 0.7 * s, z).scale.z = 0.3;
  const t = cyl(g, 0.04 * s, 0.07 * s, 0.32 * s, 6, c, x, y + 0.3 * s, z + 0.3 * s);
  t.rotation.x = 0.25;
}

export const readingCorner = (g) => {
  const R = new THREE.Group();
  R.position.set(-0.25, 0, -0.35);
  g.add(R);

  const W = 5.8, D = 4.5, H = 3.0;
  const WALL_COLOR = 0xf8f3e6;
  // 地板
  box(R, W + 0.25, 0.16, D + 0.25, 0xe2c79a, 0, 0, 0);
  const FY = 0.16;
  // 兩面牆（北、東），照片就是這個角落
  box(R, W + 0.25, H, 0.14, WALL_COLOR, 0, FY, -D / 2 - 0.05);
  box(R, 0.14, H, D + 0.25, WALL_COLOR, W / 2 + 0.05, FY, 0);

  // 巧拼地墊
  const mat2 = canvasTex(512, 320, (c, w, h) => {
    const colors = ['#a593d8', '#6ec6c3', '#6fa9dc', '#efe7cf', '#8f7dcc', '#58b6b0'];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 8; x++) {
        c.fillStyle = colors[(x * 2 + y * 3 + (x > 4 ? 1 : 0)) % colors.length];
        c.fillRect((x * w) / 8, (y * h) / 5, w / 8 - 2, h / 5 - 2);
      }
    }
  });
  const eva = addMesh(R, new THREE.BoxGeometry(4.3, 0.04, 2.5), texMat(mat2, { shininess: 15 }), -0.4, FY + 0.02, 0.85);
  eva.castShadow = false;
  // 酒紅色長地墊
  const wine = box(R, 1.0, 0.05, 2.5, 0x7a2f55, 2.25, FY, 0.75);
  wine.castShadow = false;

  // 窗：黑框、外面是綠樹
  const NZ = -D / 2 + 0.03;
  box(R, 2.3, 1.6, 0.03, 0x8fc97a, -0.15, FY + 1.1, NZ);
  box(R, 2.4, 0.08, 0.06, 0x24242a, -0.15, FY + 1.05, NZ + 0.03);
  box(R, 2.4, 0.08, 0.06, 0x24242a, -0.15, FY + 2.65, NZ + 0.03);
  box(R, 2.4, 0.06, 0.05, 0x24242a, -0.15, FY + 2.15, NZ + 0.03);
  for (let i = 0; i <= 4; i++) box(R, 0.07, 1.65, 0.05, 0x24242a, -1.32 + i * 0.585, FY + 1.05, NZ + 0.03);
  ball(R, 0.42, 0x5fa44e, -0.8, FY + 1.75, NZ + 0.015).scale.z = 0.05;
  ball(R, 0.5, 0x4f9648, 0.5, FY + 1.6, NZ + 0.015).scale.z = 0.05;
  // 灰褐色窗簾
  for (const x of [-1.62, 1.32]) {
    for (let i = 0; i < 3; i++) box(R, 0.14, 2.0, 0.14, i % 2 ? 0x8d8278 : 0x9c9186, x + i * 0.13, FY + 0.72, NZ + 0.1);
  }
  box(R, 3.4, 0.06, 0.08, 0x5a544e, -0.15, FY + 2.72, NZ + 0.1);

  // 冷氣
  box(R, 1.25, 0.4, 0.28, 0xfafafa, -2.15, FY + 2.45, NZ + 0.15);
  box(R, 1.1, 0.03, 0.02, 0xbdbdbd, -2.15, FY + 2.53, NZ + 0.3);

  // 左牆上的六角形布告（深藍）＋彩色貼紙
  const hexes = [[0, 0], [0.34, 0], [-0.34, 0], [0.17, 0.29], [-0.17, 0.29], [0.17, -0.29], [-0.17, -0.29]];
  for (const [x, y] of hexes) {
    const h = cyl(R, 0.19, 0.19, 0.03, 6, 0x2a2f55, -2.3 + x, FY + 1.6 + y, NZ + 0.01);
    h.rotation.x = Math.PI / 2;
    h.rotation.y = Math.PI / 6;
  }
  const top = cyl(R, 0.17, 0.17, 0.035, 6, 0x4f5fb5, -2.3, FY + 2.2 - 0.15, NZ + 0.02);
  top.rotation.x = Math.PI / 2;

  // 橘色海報與閱讀角小牌
  box(R, 0.62, 0.42, 0.02, 0xe8743a, -1.05 + 0.0, FY + 0.72, NZ + 0.01);
  box(R, 0.42, 0.14, 0.02, 0x2f4a3a, -1.72, FY + 0.82, NZ + 0.01);

  // 內凹的木台（酒紅色）
  box(R, 3.1, 0.28, 1.5, 0x6b2f55, 0.25, FY, -D / 2 + 0.95);
  const SY = FY + 0.28;
  // 木櫃
  box(R, 1.0, 0.68, 0.45, 0xc48a4f, 0.05, SY, NZ + 0.32);
  box(R, 0.33, 0.42, 0.03, 0x4a2f20, -0.2, SY + 0.12, NZ + 0.56);
  box(R, 0.33, 0.42, 0.03, 0x4a2f20, 0.28, SY + 0.12, NZ + 0.56);
  // 櫃上的書與小玩偶
  [0xf0c24a, 0x5b8ac9, 0xe8743a, 0x6db85a, 0xd9483b].forEach((c, i) => box(R, 0.1, 0.34, 0.26, c, -0.3 + i * 0.13, SY + 0.68, NZ + 0.28));
  ball(R, 0.1, 0xd9483b, 0.45, SY + 0.8, NZ + 0.3);
  ball(R, 0.11, 0xc9b6e4, 0.68, SY + 0.82, NZ + 0.3);
  // 鐵書架
  box(R, 0.05, 1.55, 0.05, 0x8a8a8e, 1.3, FY + 0.05, NZ + 0.12);
  box(R, 0.05, 1.55, 0.05, 0x8a8a8e, 2.2, FY + 0.05, NZ + 0.12);
  for (let i = 0; i < 3; i++) {
    box(R, 1.0, 0.04, 0.45, 0x8a8a8e, 1.75, FY + 0.25 + i * 0.55, NZ + 0.27);
    [0xd9483b, 0x5b8ac9, 0xf0c24a, 0x6db85a, 0xa883d8, 0xe8743a, 0x5b8ac9].forEach((c, k) => box(R, 0.09, 0.4 - (k % 3) * 0.05, 0.3, c, 1.35 + k * 0.13, FY + 0.29 + i * 0.55, NZ + 0.27));
    box(R, 0.4, 0.25, 0.3, 0xc19a68, 1.98, FY + 0.29 + i * 0.55, NZ + 0.27);
  }
  // 黃色櫃子與橘色坐墊堆
  box(R, 0.55, 0.45, 0.4, 0xf0c24a, 0.9, SY, NZ + 0.32);
  for (let i = 0; i < 3; i++) box(R, 0.75, 0.09, 0.55, 0xef8a3c, 1.3, SY + i * 0.1, -D / 2 + 1.35).rotation.y = 0.1 * i;

  // 大貓熊和大象
  panda(R, 2.15, FY + 0.05, -0.25, 1.15);
  elephant(R, 1.45, FY + 0.05, -0.2, 1.05);
  // 綠烏龜與小布偶
  const turtle = ball(R, 0.2, 0x7cb85a, 0.45, SY + 0.14, -D / 2 + 1.35);
  turtle.scale.y = 0.55;
  ball(R, 0.13, 0xf28fad, -0.25, SY + 0.14, -D / 2 + 1.35);
  ball(R, 0.14, 0x6db85a, -1.25, FY + 0.28, -0.6);

  // 矮桌：牛奶紋桌巾、盆栽、攤開的書
  const clothTex = canvasTex(64, 64, (c) => {
    c.fillStyle = '#efe0c8';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#b8683a';
    for (const [x, y, r] of [[14, 14, 11], [46, 10, 8], [30, 38, 13], [54, 46, 9], [8, 50, 8]]) {
      c.beginPath();
      c.arc(x, y, r, 0, 7);
      c.fill();
    }
  });
  addMesh(R, new THREE.BoxGeometry(1.45, 0.1, 1.0), texMat(clothTex, { shininess: 12 }), -0.75, FY + 0.72, 0.5);
  for (const [x, z] of [[-1.35, 0.1], [-0.15, 0.1], [-1.35, 0.9], [-0.15, 0.9]]) box(R, 0.1, 0.67, 0.1, 0x2c2a2e, x, FY + 0.03, z);
  box(R, 0.6, 0.04, 0.42, 0xfaf6ee, -0.45, FY + 0.78, 0.65);
  box(R, 0.28, 0.03, 0.38, 0xe7a4b5, -0.6, FY + 0.81, 0.65);
  cyl(R, 0.11, 0.09, 0.14, 10, 0xc98a4a, -1.05, FY + 0.78, 0.35);
  ball(R, 0.2, 0x5fa44e, -1.05, FY + 1.08, 0.35);
  // 桌下的坐墊
  for (let i = 0; i < 2; i++) {
    const cs = cyl(R, 0.36, 0.38, 0.1, 14, 0xc9a35f, -0.75, FY + 0.05 + i * 0.1, 0.95);
    cs.scale.z = 0.8;
  }

  // 繪本靠在地上
  const pic = box(R, 0.55, 0.75, 0.05, 0x7fa66a, -2.25, FY + 0.05, -0.55);
  pic.rotation.x = -0.22;
  pic.rotation.y = 0.2;

  // 右牆：布告欄、兩幅畫、約法三章（照片）
  const EX = W / 2 - 0.03;
  box(R, 0.05, 1.5, 2.3, 0x6b3f2a, EX, FY + 1.05, 0.6);
  decal(R, 'corner-board.jpg', 2.1, 1.32, EX - 0.035, FY + 1.14, 0.6, { rotY: -Math.PI / 2 });
  for (const z of [-0.6, 0.55]) {
    box(R, 0.04, 0.46, 0.6, 0x7a4a2c, EX - 0.01, FY + 2.48, z);
    decal(R, 'corner-paint.jpg', 0.52, 0.38, EX - 0.04, FY + 2.52, z, { rotY: -Math.PI / 2 });
  }
  decal(R, 'corner-rules.jpg', 0.55, 0.78, EX - 0.02, FY + 1.3, -1.45, { rotY: -Math.PI / 2 });
  // 藍色馬賽克磁磚板
  for (let y = 0; y < 4; y++) {
    for (let z = 0; z < 3; z++) box(R, 0.02, 0.16, 0.16, (y + z) % 2 ? 0x6b92c9 : 0x9ab6dd, EX, FY + 0.3 + y * 0.18, -1.35 + z * 0.18);
  }
};
