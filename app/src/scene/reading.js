// 閱讀島的七個地標。原點＝格子地面中心，建物收在半徑約 3 公尺內；正面朝南（+z），面向鏡頭。
// 第三個參數 t 是格子設定，主題書展館的書籤、旗幟與招牌跟著當月的 SDG。
import * as THREE from 'three';
import { box, cyl, cone, ball, roof, windows, tree, bench, flag } from './kit.js';
import { FAMILIES } from '../data/families.js';

const WALL = 0xf8e8cf;
const WOOD = 0xc9834f;
const WOOD_DARK = 0x8d5a38;
const PAGES = 0xfff8ea;
const TEAL = 0x3f8f9e;
const ORANGE = 0xf2913d;
const PURPLE = 0xa883d8;
const RED = 0xd9483b;
const BLUE = 0x5b8ac9;
const GREEN = 0x86c25c;
const YELLOW = 0xf0c24a;
const SPINES = [RED, BLUE, GREEN, ORANGE, PURPLE, YELLOW, TEAL];

/** 有字的招牌：用畫布寫字貼在平面上（有貼圖的物件不會被合併，所以一個招牌一次繪圖呼叫）。 */
function sign(g, lines, w, h, bg, x, y, z) {
  const S = 96, c = document.createElement('canvas');
  c.width = Math.round(w * S * 2);
  c.height = Math.round(h * S * 2);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fffaf0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach(([text, size], i) => {
    ctx.font = `700 ${size * S * 2}px "PingFang TC","Noto Sans TC",sans-serif`;
    ctx.fillText(text, c.width / 2, (c.height * (i + 0.5)) / lines.length);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhongMaterial({ map: tex, shininess: 20 }));
  m.position.set(x, y + h / 2, z);
  g.add(m);
  return m;
}

/** 一疊書。 */
function pile(g, x, z, n, rot = 0) {
  for (let i = 0; i < n; i++) {
    const b = box(g, 0.9 - i * 0.08, 0.16, 0.65, SPINES[(i * 2 + Math.round(x * 3)) % SPINES.length], x, i * 0.16, z);
    b.rotation.y = rot + i * 0.25;
  }
}

/** 主題書展館：屋頂是一本攤開的大書，書籤垂在正門上方。 */
export function bookHall(g, _rnd, t) {
  const color = t.color;
  const front = 0.72;
  box(g, 5.0, 0.2, 3.5, 0xe9d9bf, 0, 0, -0.5);
  box(g, 4.3, 2.1, 2.6, WALL, 0, 0.2, -0.6);
  windows(g, 2, 0.6, 0.55, 3.2, 0.72, front, 0);
  box(g, 0.9, 1.05, 0.08, 0x6b4a33, 0, 0.2, front);

  // 攤開的書：封面在下、書頁在上，中間書脊微凹
  for (const s of [-1, 1]) {
    const cover = box(g, 2.75, 0.14, 3.5, color, s * 1.3, 2.46, -0.6);
    cover.rotation.z = s * 0.2;
    const leaf = box(g, 2.55, 0.26, 3.28, PAGES, s * 1.26, 2.62, -0.6);
    leaf.rotation.z = s * 0.2;
    const top = box(g, 2.2, 0.1, 2.96, 0xfffdf6, s * 1.12, 2.86, -0.6);
    top.rotation.z = s * 0.15;
  }
  box(g, 0.24, 0.5, 3.5, color, 0, 2.28, -0.6);
  box(g, 0.34, 1.0, 0.05, color, 0.55, 1.95, 1.2).rotation.z = -0.08; // 書籤

  sign(g, [[`${t.month.month} 月主題書展`, 0.3], [`SDG ${t.month.sdg}・${t.month.theme}`, 0.22]], 3.0, 0.8, color, 0, 1.34, front + 0.06);

  flag(g, -3.05, 1.1, color);
  flag(g, 2.6, 1.3, TEAL);
  pile(g, -1.55, 1.75, 4);
  pile(g, 1.45, 1.8, 3, 0.4);
  tree(g, -3.7, -1.5, 0.8);
  tree(g, 3.7, -1.3, 0.75, 'pine');
  bench(g, 0, 2.7);
}

/** 書櫃長廊：一長排書櫃加頂棚，前面有坐著看書的小椅子。 */
export function bookShelves(g) {
  const z = -0.9;
  box(g, 5.0, 2.1, 0.5, WOOD, 0, 0, z);
  for (let row = 0; row < 3; row++) {
    const y = 0.2 + row * 0.62;
    box(g, 4.7, 0.5, 0.16, WOOD_DARK, 0, y, z + 0.2); // 書櫃內側的暗面
    for (let i = 0; i < 12; i++) {
      const h = [0.46, 0.38, 0.42][(i + row) % 3];
      box(g, 0.28, h, 0.12, SPINES[(i * 3 + row * 2) % SPINES.length], -2.1 + i * 0.38, y, z + 0.3);
    }
  }
  box(g, 5.5, 0.18, 1.8, TEAL, 0, 2.5, z + 0.35);
  for (const x of [-2.5, 2.5]) cyl(g, 0.08, 0.08, 2.5, 8, 0xdedbe2, x, 0, z + 1.1);
  for (const [x, c] of [[-1.3, ORANGE], [0.2, PURPLE], [1.5, GREEN]]) {
    cyl(g, 0.34, 0.38, 0.42, 12, c, x, 0, 0.7);
  }
  pile(g, -2.35, 1.05, 3);
}

/** 問題卡亭：拱門招牌下的大摸彩箱，旁邊的佈告欄釘著各年級的問題卡。 */
export function quizBooth(g) {
  const z = -0.5;
  for (const x of [-2.1, 2.1]) cyl(g, 0.12, 0.14, 2.5, 8, WOOD, x, 0, -1.5);
  box(g, 4.7, 0.2, 0.3, PURPLE, 0, 2.5, -1.5);
  sign(g, [['問題卡', 0.36]], 1.9, 0.56, '#7d62b8', 0, 1.9, -1.32);
  cyl(g, 1.35, 1.5, 0.3, 16, 0xe9d9bf, 0, 0, z);
  box(g, 2.0, 1.5, 2.0, ORANGE, 0, 0.3, z);
  box(g, 1.2, 0.05, 0.18, 0x3a3440, 0, 1.8, z); // 投入口
  box(g, 0.62, 0.44, 0.04, PAGES, 0.05, 1.82, z).rotation.z = 0.08; // 投到一半的卡
  sign(g, [['?', 0.8]], 1.05, 1.05, '#e0792a', 0, 0.5, z + 1.02);
  // 地上散落的答案卡
  for (const [x, zz, rot] of [[-1.9, 0.9, 0.4], [-1.45, 1.35, -0.3], [-2.3, 1.45, 1.1]]) {
    box(g, 0.42, 0.03, 0.3, PAGES, x, 0.01, zz).rotation.y = rot;
  }
  // 佈告欄
  for (const x of [1.95, 3.2]) box(g, 0.12, 1.3, 0.12, WOOD_DARK, x, 0, 1.65);
  box(g, 1.6, 1.05, 0.1, 0xe7c9a0, 2.57, 0.65, 1.65);
  [RED, BLUE, GREEN, ORANGE, PURPLE, YELLOW].forEach((c, i) => {
    box(g, 0.36, 0.28, 0.03, PAGES, 2.13 + (i % 3) * 0.44, 1.26 - Math.floor(i / 3) * 0.42, 1.71);
    box(g, 0.36, 0.08, 0.04, c, 2.13 + (i % 3) * 0.44, 1.46 - Math.floor(i / 3) * 0.42, 1.72);
  });
}

/** 閱報亭：條紋遮陽棚的小亭子，兩側報架插著報紙。 */
export function newsstand(g) {
  const z = -0.8;
  box(g, 3.0, 1.9, 1.7, WALL, 0, 0, z);
  box(g, 2.2, 0.75, 0.1, 0x6b4a33, 0, 0.95, z + 0.82); // 窗口
  box(g, 3.1, 0.14, 0.7, WOOD, 0, 0.82, z + 1.1); // 櫃台
  for (let i = 0; i < 6; i++) {
    const s = box(g, 0.56, 0.1, 1.15, i % 2 ? PAGES : RED, -1.45 + i * 0.58, 2.04, z + 1.0);
    s.rotation.x = 0.32;
  }
  box(g, 3.2, 0.2, 1.8, 0xe9d9bf, 0, 1.9, z);
  sign(g, [['閱報亭', 0.34]], 1.6, 0.46, '#3f8f9e', 0, 2.2, z + 0.92);
  // 櫃台上攤開的報紙
  for (const [x, rot] of [[-0.9, 0.2], [0.05, -0.15], [0.95, 0.1]]) {
    box(g, 0.68, 0.03, 0.46, PAGES, x, 0.97, z + 1.12).rotation.y = rot;
    box(g, 0.5, 0.03, 0.1, 0x8a8f99, x, 0.985, z + 1.04).rotation.y = rot;
  }
  // 報架
  for (const x of [-2.35, 2.35]) {
    box(g, 0.1, 1.5, 0.9, WOOD_DARK, x, 0, z + 0.3);
    for (let i = 0; i < 3; i++) {
      box(g, 0.05, 0.42, 0.72, PAGES, x + (x < 0 ? 0.08 : -0.08), 0.2 + i * 0.44, z + 0.3);
      box(g, 0.06, 0.1, 0.6, SPINES[i * 2], x + (x < 0 ? 0.09 : -0.09), 0.46 + i * 0.44, z + 0.3);
    }
  }
  cyl(g, 0.3, 0.34, 0.42, 12, ORANGE, -1.0, 0, 1.2);
  cyl(g, 0.3, 0.34, 0.42, 12, PURPLE, 1.0, 0, 1.2);
}

/** 學習單小屋：屋前的大鉛筆、信箱，曬衣繩上晾著學習單。 */
export function sheetHut(g) {
  const z = -1.0;
  box(g, 2.9, 1.7, 2.0, 0xfbf3e4, 0, 0, z);
  roof(g, 2.4, 1.0, 3.3, TEAL, 0, 1.7, z);
  box(g, 0.7, 1.05, 0.07, 0x6b4a33, -0.55, 0, z + 1.02);
  box(g, 0.68, 0.6, 0.07, 0x9fb8c8, 0.65, 0.65, z + 1.02);
  // 大鉛筆
  const pencil = new THREE.Group();
  pencil.position.set(2.05, 0, 0.1);
  pencil.rotation.z = -0.16;
  g.add(pencil);
  cyl(pencil, 0.26, 0.26, 2.0, 6, YELLOW, 0, 0.42, 0);
  cone(pencil, 0.26, 0.42, 6, 0xeed9b8, 0, 0, 0).rotation.x = Math.PI;
  cyl(pencil, 0.27, 0.27, 0.16, 6, 0xdedbe2, 0, 2.42, 0);
  ball(pencil, 0.25, 0xf0a0a8, 0, 2.66, 0);
  // 信箱
  cyl(g, 0.06, 0.07, 1.0, 8, WOOD_DARK, -2.25, 0, 0.4);
  box(g, 0.66, 0.42, 0.46, RED, -2.25, 1.0, 0.4);
  // 曬衣繩與學習單
  for (const x of [-1.6, 1.3]) cyl(g, 0.05, 0.06, 1.6, 8, WOOD_DARK, x, 0, 1.2);
  box(g, 2.9, 0.03, 0.03, 0xdedbe2, -0.15, 1.56, 1.2);
  for (const [x, c] of [[-1.05, ORANGE], [-0.15, GREEN], [0.75, PURPLE]]) {
    box(g, 0.62, 0.8, 0.03, PAGES, x, 0.76, 1.2);
    box(g, 0.46, 0.08, 0.04, c, x, 1.34, 1.21);
    for (let i = 0; i < 3; i++) box(g, 0.44, 0.03, 0.04, 0xc8c2b6, x, 0.92 + i * 0.12, 1.21);
  }
}

/** 一面家族牌：立在舞台邊的看板，上面是吉祥物圓徽和家族名。 */
function familySign(g, fam, x, z, turn) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = turn;
  g.add(s);
  cyl(s, 0.28, 0.34, 0.14, 12, 0xcfc6d6, 0, 0, 0);
  for (const px of [-0.5, 0.5]) box(s, 0.1, 1.0, 0.1, WOOD_DARK, px, 0.1, 0);
  box(s, 1.7, 2.1, 0.12, fam.color, 0, 1.0, 0);
  cyl(s, 0.74, 0.74, 0.03, 28, 0xfffaf0, 0, 2.3, 0.06).rotation.x = Math.PI / 2;
  const tex = new THREE.TextureLoader().load(fam.image);
  tex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.68, 32), new THREE.MeshPhongMaterial({ map: tex, shininess: 10 }));
  badge.position.set(0, 2.3, 0.095);
  s.add(badge);
  sign(s, [[fam.name, 0.27]], 1.56, 0.42, fam.banner, 0, 1.1, 0.07);
}

/** 四大家族擂台：圓形舞台與看板，四面家族牌圍著。 */
export function familyStage(g) {
  cyl(g, 2.1, 2.25, 0.45, 20, 0xe7c9a0, 0, 0, 0.1);
  cyl(g, 1.9, 1.9, 0.05, 20, 0xfaf0dd, 0, 0.45, 0.1);
  // 舞台後方的看板
  for (const x of [-1.5, 1.5]) box(g, 0.14, 2.2, 0.14, WOOD_DARK, x, 0.45, -1.6);
  box(g, 3.4, 1.1, 0.14, TEAL, 0, 1.5, -1.6);
  sign(g, [['四大家族', 0.5]], 3.1, 0.85, '#3f8f9e', 0, 1.62, -1.52);
  // 講台與麥克風
  box(g, 0.8, 0.95, 0.55, WOOD, 0, 0.5, 0.25);
  cyl(g, 0.02, 0.02, 0.32, 6, 0x4a4650, 0.1, 1.45, 0.2);
  ball(g, 0.06, 0x4a4650, 0.1, 1.8, 0.2);
  // 四面家族牌：後排兩面、前排兩面，微微轉向舞台
  familySign(g, FAMILIES[0], -3.05, -1.2, 0.3);
  familySign(g, FAMILIES[1], 3.05, -1.2, -0.3);
  familySign(g, FAMILIES[2], -3.2, 1.5, 0.45);
  familySign(g, FAMILIES[3], 3.2, 1.5, -0.45);
}

/** 閱讀成果廊：頂棚下的展示牆，掛著孩子的作品，前面還有兩個畫架。 */
export function readingGallery(g) {
  const z = -1.05;
  box(g, 5.0, 2.0, 0.28, 0xfbf3e4, 0, 0, z);
  box(g, 5.5, 0.18, 1.6, PURPLE, 0, 2.3, z + 0.4);
  for (const x of [-2.55, 2.55]) cyl(g, 0.08, 0.08, 2.3, 8, 0xdedbe2, x, 0, z + 1.05);
  [[-1.8, ORANGE], [-0.6, TEAL], [0.6, GREEN], [1.8, RED]].forEach(([x, c], i) => {
    const y = i % 2 ? 0.75 : 0.85;
    box(g, 0.95, 1.05, 0.06, WOOD, x, y, z + 0.16);
    box(g, 0.78, 0.86, 0.07, PAGES, x, y + 0.09, z + 0.17);
    box(g, 0.58, 0.36, 0.08, c, x, y + 0.48, z + 0.18);
    for (let k = 0; k < 2; k++) box(g, 0.56, 0.03, 0.08, 0xc8c2b6, x, y + 0.2 + k * 0.1, z + 0.18);
  });
  // 畫架
  for (const [x, c] of [[-1.25, YELLOW], [1.25, BLUE]]) {
    const leg = (dx, dz) => {
      const l = box(g, 0.07, 1.5, 0.07, WOOD_DARK, x + dx, 0, 0.75 + dz);
      l.rotation.x = -dz * 0.6;
    };
    leg(-0.34, 0.1);
    leg(0.34, 0.1);
    leg(0, -0.28);
    box(g, 0.92, 0.72, 0.05, PAGES, x, 0.72, 0.84).rotation.x = -0.12;
    box(g, 0.66, 0.46, 0.06, c, x, 0.85, 0.86).rotation.x = -0.12;
  }
}
