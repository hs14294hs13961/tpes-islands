// 每一格的地標。原點＝格子地面中心，建物要收在半徑約 3 公尺內，
// 外圈 3.6 公尺是小人散步的路，最外圈角落放樹和路燈。
// 之後 Higgsfield 的 3D 地標（PRD 第 11 節 M4）會依 type 替換這裡的程式版本。
import * as THREE from 'three';
import { box, cyl, cone, ball, torus, roof, windows, tree, plumTree, xiancao, lamp, bench, flag, GLOW } from './kit.js';

const WALL = 0xf8e8cf;
const WALL_WHITE = 0xfbf3e4;
const BRICK = 0xc7694c;
const ROOF = 0xb4483a;
const PURPLE = 0xa883d8;
const ORANGE = 0xf2913d;
const LEAF = 0x86c25c;
const WOOD = 0xc9834f;
const DARK = 0x3a3440;
const PAGES = 0xfff8ea;

const glass = new THREE.MeshPhongMaterial({ color: 0xcfe8ef, transparent: true, opacity: 0.45, shininess: 90 });

/** 一本書：上下封面夾著書頁，書背在左。 */
function book(g, w, h, d, color, y, z, rot = 0, x = 0) {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = rot;
  const t = h * 0.2;
  box(b, w, t, d, color, 0, 0, 0);
  box(b, w - 0.16, h - t * 2, d - 0.14, PAGES, 0.04, t, 0);
  box(b, w, t, d, color, 0, h - t, 0);
  box(b, t * 1.2, h, d, color, -w / 2 + t * 0.6, 0, 0);
  g.add(b);
}

/** 攤開的書：兩片微微翹起的書頁。 */
function openBook(g, w, d, color, y, z) {
  box(g, w + 0.12, 0.08, d + 0.12, color, 0, y, z);
  for (const s of [-1, 1]) box(g, w / 2, 0.1, d, PAGES, (s * w) / 4, y + 0.1, z).rotation.z = s * 0.1;
}

/** 一棟一般建物：牆、屋頂、正面窗與門。回傳屋頂底部高度。 */
function building(g, w, d, h, { wall = WALL, roofColor = ROOF, z = -0.6, x = 0, flat = false, rows = 1 } = {}) {
  box(g, w, h, d, wall, x, 0, z);
  const front = z + d / 2 + 0.01;
  for (let r = 0; r < rows; r++) windows(g, Math.max(2, Math.round(w / 1.1)), 0.55, 0.6, w - 0.6, 0.7 + r * (h / rows), front, x);
  box(g, 0.6, 1.0, 0.06, 0x6b4a33, x, 0, front);
  if (flat) {
    box(g, w + 0.2, 0.2, d + 0.2, 0xe9d9bf, x, h, z);
  } else {
    roof(g, d + 0.4, 1.0, w + 0.4, roofColor, x, h, z);
  }
  return h;
}

export const LANDMARKS = {
  classroom(g) {
    building(g, 4.4, 2.4, 2.0, { z: -0.9 });
    for (let i = 0; i < 5; i++) box(g, 0.18, 2.0, 0.18, 0xe0d6c4, -2 + i, 0, 0.55); // 走廊柱
    box(g, 4.6, 0.12, 1.5, 0xd9cfbd, 0, 2.0, -0.1);
    flag(g, 2.7, 0.9, ORANGE);
  },

  gallery(g) {
    building(g, 3.6, 2.4, 2.2, { wall: WALL_WHITE, roofColor: PURPLE, z: -1 });
    box(g, 1.6, 0.5, 0.08, ORANGE, 0, 1.6, 0.24); // 招牌
    for (const [x, c] of [[-1.5, ORANGE], [0, LEAF], [1.5, PURPLE]]) { // 戶外展示板
      box(g, 0.08, 1.0, 0.08, WOOD, x, 0, 1.2);
      box(g, 1.0, 0.8, 0.06, 0xfaf6ee, x, 0.8, 1.25);
      box(g, 0.8, 0.6, 0.07, c, x, 0.9, 1.26);
    }
  },

  plaza(g) {
    cyl(g, 1.7, 1.8, 0.35, 12, 0xf0dfc4, 0, 0, -0.4);
    for (const [x, z] of [[-1.2, -1.6], [1.2, -1.6], [-1.2, 0.8], [1.2, 0.8]]) cyl(g, 0.08, 0.08, 2.2, 5, 0xf0ece4, x, 0.35, z);
    cone(g, 2.0, 1.0, 4, PURPLE, 0, 2.55, -0.4).rotation.y = Math.PI / 4;
    flag(g, -2.6, -1.4, ORANGE);
    bench(g, -2.2, 1.6, 0.4);
    bench(g, 2.2, 1.6, -0.4);
  },

  principal(g) {
    building(g, 2.8, 2.2, 1.9, { roofColor: 0x8f6bb8, z: -0.9, x: 0.4 });
    plumTree(g, -2.0, 0.6, 1.1);
    box(g, 0.9, 0.5, 0.08, PURPLE, 0.4, 1.95 + 0.01, 0.22);
  },

  office(g) {
    building(g, 4.2, 2.4, 3.4, { flat: true, rows: 2, z: -0.8, wall: 0xf6ead6 });
    for (let i = 0; i < 3; i++) { // 屋頂太陽能板
      const p = box(g, 1.1, 0.08, 1.6, 0x2c3e66, -1.3 + i * 1.3, 3.8, -0.8);
      p.rotation.x = -0.25;
    }
    box(g, 1.6, 0.45, 0.08, PURPLE, 0, 2.6, 0.42);
  },

  library(g) {
    building(g, 3.8, 2.4, 2.0, { flat: true, z: -0.8, wall: WALL });
    const books = [[0xd9483b, 0], [0x5b8ac9, 0.15], [LEAF, -0.1], [ORANGE, 0.2]];
    books.forEach(([c, rot], i) => book(g, 2.4 - i * 0.3, 0.34, 1.5, c, 2.2 + i * 0.34, -0.8, rot));
    box(g, 2.4, 0.06, 1.0, 0xfaf6ee, -0.2, 0.01, 1.3); // 門前地墊
  },

  farm(g) {
    for (let r = 0; r < 4; r++) {
      box(g, 3.6, 0.15, 0.45, 0x6b4f33, -0.4, 0, -1.8 + r * 0.9);
      for (let i = 0; i < 6; i++) ball(g, 0.22, r % 2 ? 0x5f9b4c : 0x86b858, -2 + i * 0.62, 0.35, -1.8 + r * 0.9);
    }
    box(g, 1.2, 1.2, 1.0, WOOD, 2.2, 0, 0.9);
    roof(g, 1.4, 0.6, 1.4, ROOF, 2.2, 1.2, 0.9, false);
    scarecrow(g, -2.4, 1.6);
  },

  maker(g) {
    box(g, 4.0, 2.0, 2.4, 0xf3e6d2, 0, 0, -0.8);
    roof(g, 1.2, 0.9, 2.6, 0xa9b4c2, -1.0, 2.0, -0.8, false);
    roof(g, 1.2, 0.9, 2.6, 0xa9b4c2, 0.2, 2.0, -0.8, false);
    roof(g, 1.2, 0.9, 2.6, 0xa9b4c2, 1.4, 2.0, -0.8, false);
    windows(g, 3, 0.7, 0.6, 3.2, 0.8, 0.41);
    torus(g, 0.55, 0.16, ORANGE, -1.2, 1.3, 0.48);
    box(g, 0.8, 0.5, 0.5, 0xd9483b, 1.6, 0, 1.2); // 工具箱
  },

  english(g) {
    building(g, 3.0, 2.2, 1.9, { wall: 0xfdf3e3, roofColor: 0x6f9fd8, z: -0.9 });
    [[0xd9483b, -1.6], [0x5b8ac9, -0.9], [0xf0b429, -1.25]].forEach(([c, x], i) => box(g, 0.6, 0.6, 0.6, c, x, i === 2 ? 0.6 : 0, 1.2));
    bench(g, 1.4, 1.3, 0);
  },

  books(g) {
    const colors = [0xd9483b, 0x5b8ac9, LEAF, ORANGE, PURPLE, 0xf0b429];
    colors.forEach((c, i) => book(g, 2.4 - i * 0.17, 0.52, 1.75 - i * 0.1, c, i * 0.52, -0.6, i % 2 ? 0.22 : -0.14));
    openBook(g, 1.5, 1.0, 0xd9483b, 3.12, -0.6); // 頂端攤開的書
    book(g, 0.9, 0.3, 0.65, 0xf0b429, 0, 1.0, 0.5, -1.7); // 掉在旁邊的小書
    book(g, 0.8, 0.26, 0.6, 0x5b8ac9, 0.3, 1.0, 0.2, -1.7);
    bench(g, 1.9, 1.3, -0.3);
  },

  math(g) {
    box(g, 1.0, 1.0, 1.0, 0xd9483b, -1.2, 0, -0.6);
    cyl(g, 0.5, 0.5, 1.2, 10, 0x5b8ac9, 0, 0, -0.6);
    cone(g, 0.6, 1.3, 4, 0xf0b429, 1.2, 0, -0.6);
    box(g, 0.8, 0.8, 0.8, LEAF, -0.6, 1.0, -0.6);
    box(g, 1.2, 0.2, 0.2, ORANGE, 0.6, 1.6, -0.6);
    box(g, 0.2, 1.2, 0.2, ORANGE, 0.6, 1.1, -0.6);
  },

  greenhouse(g) {
    const gh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.4), glass);
    gh.position.set(0, 0.9, -0.7);
    g.add(gh);
    roof(g, 2.4, 0.8, 3.6, 0xe6f2f4, 0, 1.8, -0.7);
    for (let i = 0; i < 5; i++) ball(g, 0.3, 0x5f9b4c, -1.4 + i * 0.7, 0.35, -0.7);
  },

  globe(g) {
    cyl(g, 0.6, 0.8, 0.8, 8, 0xf0dfc4, 0, 0, -0.5);
    ball(g, 1.0, 0x5b8ac9, 0, 1.9, -0.5);
    ball(g, 0.55, LEAF, 0.45, 2.2, -0.15);
    torus(g, 1.2, 0.05, 0xf0b429, 0, 1.9, -0.5).rotation.x = 1.2;
  },

  art(g) {
    box(g, 0.08, 1.6, 0.08, WOOD, -0.5, 0, -0.4);
    box(g, 0.08, 1.6, 0.08, WOOD, 0.5, 0, -0.4);
    box(g, 1.4, 1.1, 0.08, 0xfaf6ee, 0, 0.9, -0.35);
    box(g, 1.1, 0.8, 0.09, PURPLE, 0, 1.05, -0.34);
    ball(g, 0.3, ORANGE, -0.2, 1.4, -0.28);
    cyl(g, 0.9, 0.9, 0.08, 10, 0xe8d6b5, 1.6, 0, 0.8);
    [0xd9483b, 0x5b8ac9, LEAF, 0xf0b429].forEach((c, i) => ball(g, 0.14, c, 1.3 + (i % 2) * 0.5, 0.15, 0.6 + Math.floor(i / 2) * 0.4));
  },

  sports(g) {
    box(g, 4.2, 0.05, 2.8, 0x5aa36a, 0, 0, -0.5);
    box(g, 4.0, 0.06, 0.06, 0xffffff, 0, 0, -0.5);
    box(g, 0.08, 2.6, 0.08, 0x9a9a9a, 1.9, 0, -0.5);
    box(g, 0.08, 0.7, 0.9, 0xffffff, 1.85, 2.3, -0.5);
    torus(g, 0.25, 0.04, ORANGE, 1.6, 2.4, -0.5).rotation.x = Math.PI / 2;
    ball(g, 0.2, ORANGE, -0.6, 0.2, 0.3);
  },

  campfire(g) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      box(g, 0.9, 0.35, 0.35, WOOD, Math.cos(a) * 2, 0, Math.sin(a) * 2 - 0.3).rotation.y = -a + Math.PI / 2;
    }
    for (let i = 0; i < 4; i++) box(g, 1.0, 0.16, 0.16, 0x6b4a33, 0, 0, -0.3).rotation.y = (i * Math.PI) / 4;
    const f = cone(g, 0.45, 1.0, 5, GLOW.fire, 0, 0.1, -0.3);
    f.castShadow = false;
    f.userData.flame = true;
  },

  garden(g, rnd) {
    const colors = [0xf28fad, 0xf0b429, 0xe86a5a, 0xc9b6e4, 0xffffff];
    for (let i = 0; i < 18; i++) {
      const x = -2 + (i % 6) * 0.8 + rnd() * 0.2;
      const z = -1.6 + Math.floor(i / 6) * 0.9;
      cyl(g, 0.03, 0.03, 0.4, 4, 0x4c8c55, x, 0, z);
      ball(g, 0.18, colors[i % colors.length], x, 0.5, z);
    }
    cyl(g, 0.04, 0.04, 1.4, 4, 0x4c8c55, 1.9, 0, 1.1);
    cyl(g, 0.35, 0.35, 0.08, 10, 0xf0b429, 1.9, 1.4, 1.1).rotation.x = 0.5;
  },

  hakka(g) {
    // 伙房：三合院，正身＋左右護龍
    box(g, 3.8, 1.6, 1.3, BRICK, 0, 0, -1.6);
    roof(g, 1.6, 0.7, 4.0, 0x7a5a4a, 0, 1.6, -1.6);
    for (const x of [-1.6, 1.6]) {
      box(g, 1.0, 1.4, 2.0, BRICK, x, 0, 0);
      roof(g, 1.2, 0.6, 2.2, 0x7a5a4a, x, 1.4, 0, false);
    }
    box(g, 0.7, 1.0, 0.06, 0x6b2f22, 0, 0, -0.94);
  },

  stage(g) {
    box(g, 3.6, 0.6, 2.2, 0xf0dfc4, 0, 0, -0.8);
    box(g, 3.6, 2.2, 0.15, 0xb83a3a, 0, 0.6, -1.85);
    box(g, 3.9, 0.3, 2.4, PURPLE, 0, 2.8, -0.8);
    for (const x of [-1.85, 1.85]) box(g, 0.15, 2.2, 0.15, 0xe0d6c4, x, 0.6, 0.2);
  },

  campus(g) {
    // 教學大樓：L 形兩層樓（P3 會換成 3D 校園地圖的縮小版）
    box(g, 4.6, 2.8, 1.5, 0xf8efdf, 0, 0, -1.6);
    box(g, 1.5, 2.8, 2.6, 0xf8efdf, -1.55, 0, 0.45);
    windows(g, 5, 0.5, 0.55, 4.2, 0.6, -0.84);
    windows(g, 5, 0.5, 0.55, 4.2, 2.0, -0.84);
    box(g, 4.8, 0.15, 1.7, 0xe9d9bf, 0, 2.8, -1.6);
    box(g, 1.7, 0.15, 2.8, 0xe9d9bf, -1.55, 2.8, 0.45);
    for (let i = 0; i < 3; i++) box(g, 1.0, 0.08, 1.2, 0x2c3e66, -0.6 + i * 1.1, 3.0, -1.6);
    flag(g, 1.6, 1.0, 0xd9483b);
  },

  track(g) {
    const t = cyl(g, 3.0, 3.0, 0.06, 24, 0xc8574a, 0, 0, -0.2);
    t.scale.z = 0.7;
    const f = cyl(g, 2.3, 2.3, 0.08, 24, 0x6fae5f, 0, 0, -0.2);
    f.scale.z = 0.55;
    box(g, 0.08, 0.09, 1.6, 0xffffff, 0, 0, -0.2);
  },

  xiancao(g) {
    for (let r = 0; r < 4; r++) {
      box(g, 3.8, 0.12, 0.5, 0x6b4f33, 0, 0, -1.9 + r * 0.95);
      for (let i = 0; i < 6; i++) xiancao(g, -1.7 + i * 0.68, -1.9 + r * 0.95, 1.0);
    }
  },

  coop(g) {
    box(g, 2.6, 1.4, 1.8, 0xb98a5e, 0, 0, -1.0);
    roof(g, 2.1, 0.8, 2.8, ROOF, 0, 1.4, -1.0);
    const fence = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.6), new THREE.MeshPhongMaterial({ color: 0xbfc4c8, transparent: true, opacity: 0.35 }));
    fence.position.set(0, 0.45, 0.8);
    g.add(fence);
    for (const [x, z] of [[-0.9, 0.5], [0.3, 1.1], [1.0, 0.4], [-0.2, 0.9]]) chicken(g, x, z);
  },

  gate(g) {
    for (const x of [-1.6, 1.6]) box(g, 0.6, 2.4, 0.6, 0xf2e4cd, x, 0, -0.3);
    box(g, 3.9, 0.6, 0.7, 0x8a6a8f, 0, 2.4, -0.3);
    box(g, 2.2, 0.35, 0.06, 0xfaf6ee, 0, 2.52, 0.07);
    for (const s of [-1, 1]) box(g, 1.2, 1.0, 0.3, 0xf2e4cd, s * 2.6, 0, -0.3); // 圍牆
  },

  playground(g) {
    box(g, 4.0, 0.04, 3.0, 0x7cc06c, 0, 0, -0.4);
    for (const x of [-1.6, 0.0]) { // 鳥巢鞦韆的 A 字架
      box(g, 0.1, 2.0, 0.1, 0x5b8ac9, x, 0, -1.4).rotation.z = x ? 0.2 : -0.2;
    }
    box(g, 1.9, 0.1, 0.1, 0x5b8ac9, -0.8, 1.95, -1.4);
    torus(g, 0.45, 0.1, ORANGE, -0.8, 0.8, -1.4).rotation.x = Math.PI / 2;
    box(g, 2.0, 0.1, 0.3, 0xf0b429, 1.3, 0.35, 0.6).rotation.z = 0.2; // 翹翹板
    cyl(g, 0.12, 0.15, 0.35, 6, 0x5b8ac9, 1.3, 0, 0.6);
  },

  paddy(g) {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const x = -1.1 + c * 2.2;
        const z = -1.4 + r * 2.0;
        box(g, 2.0, 0.08, 1.8, 0x8fbfb4, x, 0, z);
        for (let i = 0; i < 9; i++) cyl(g, 0.03, 0.05, 0.5, 4, 0x9cc35a, x - 0.7 + (i % 3) * 0.7, 0.05, z - 0.6 + Math.floor(i / 3) * 0.6);
      }
    }
  },

  pavilion(g) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cyl(g, 0.08, 0.08, 1.8, 5, 0xb5523b, Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3 - 0.3);
    }
    cyl(g, 1.5, 1.5, 0.2, 6, 0xf0dfc4, 0, 0, -0.3);
    cone(g, 1.9, 1.0, 6, PURPLE, 0, 1.8, -0.3);
    cone(g, 0.3, 0.4, 6, 0xf0b429, 0, 1.4, -0.3);
  },

  meadow(g, rnd) {
    for (let i = 0; i < 4; i++) tree(g, (rnd() - 0.5) * 3.5, (rnd() - 0.5) * 3, 0.9 + rnd() * 0.4);
  },
};

function scarecrow(g, x, z) {
  box(g, 0.08, 1.4, 0.08, WOOD, x, 0, z);
  box(g, 0.9, 0.08, 0.08, WOOD, x, 1.0, z);
  ball(g, 0.2, 0xf2d7a8, x, 1.55, z);
  cone(g, 0.32, 0.25, 8, 0xe2c27a, x, 1.65, z);
}

function chicken(g, x, z) {
  ball(g, 0.2, 0xfaf6ee, x, 0.22, z);
  ball(g, 0.12, 0xfaf6ee, x + 0.14, 0.42, z);
  box(g, 0.05, 0.08, 0.1, 0xd9483b, x + 0.15, 0.52, z);
}

// 地面材質色
export const GROUND = {
  lawn: 0x9ccb5e,
  stone: 0xf9ead0,
  street: 0xefdfc6,
  farm: 0xa97f58,
  sand: 0xf2dfae,
};
// 外圈比內圈鮮一點，像軟糖的邊
export const GROUND_RIM = {
  lawn: 0x86bb4c,
  stone: 0xf2cfa2,
  street: 0xe3cba8,
  farm: 0x86bb4c,
  sand: 0xe8c98e,
};

const FLOWERS = [0xf28fad, 0xf7c948, 0xfaf6ee, 0xc9b6e4, 0xf2826a];

/** 地上的小東西（草叢、花、小石頭、蘑菇、小雞）：都很矮，小人走過去也不違和。放在格子前緣與外圈。 */
export function scatterTile(sc, cx, y, cz, kind, rnd) {
  const spot = () => {
    if (rnd() < 0.45) return [(rnd() - 0.5) * 5, 1.9 + rnd() * 0.9]; // 建物前面的空地
    const a = rnd() * Math.PI * 2, r = 3.25 + rnd() * 0.5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const lawn = kind === 'lawn';
  for (let i = 0; i < (lawn ? 7 : 2); i++) { // 草叢
    if (kind === 'farm') break;
    const [x, z] = spot();
    const c = lawn ? 0x6fb04a : 0x8fbb60;
    sc.add('blade', cx + x, y, cz + z, 0.8 + rnd() * 0.5, c);
    sc.add('blade', cx + x + 0.1, y, cz + z + 0.05, 0.6 + rnd() * 0.3, c);
  }
  for (let i = 0; i < (lawn ? 4 : 1); i++) { // 花
    if (kind === 'farm') break;
    const [x, z] = spot();
    const c = FLOWERS[Math.floor(rnd() * FLOWERS.length)];
    sc.add('stem', cx + x, y, cz + z, 1, 0x5a9e45);
    sc.add('bloom', cx + x, y + 0.27, cz + z, 0.9 + rnd() * 0.4, c);
  }
  for (let i = 0; i < 2; i++) { // 小石頭
    const [x, z] = spot();
    sc.add('pebble', cx + x, y + 0.03, cz + z, 0.7 + rnd() * 0.7, lawn ? 0xe8e0d0 : 0xd9c7a8, 0.6);
  }
  if (lawn && rnd() < 0.45) { // 蘑菇
    const [x, z] = spot();
    sc.add('stem', cx + x, y, cz + z, 1.2, 0xfaf1dd);
    sc.add('cap', cx + x, y + 0.3, cz + z, 1.1, 0xe85d4f, 0.7);
  }
  if (lawn && rnd() < 0.35) { // 小雞
    const [x, z] = spot();
    sc.add('chick', cx + x, y + 0.13, cz + z, 1, 0xf7d65c, 0.92);
    sc.add('chickHead', cx + x + 0.08, y + 0.28, cz + z + 0.05, 1, 0xf7d65c);
    sc.add('beak', cx + x + 0.17, y + 0.28, cz + z + 0.08, 1, 0xf2913d);
  }
}

/** 角落裝飾：樹與路燈放在六角形的頂點附近，避開中間的散步路。 */
export function decorate(g, tile, rnd) {
  const lamps = [];
  const corners = [0, 1, 2, 3, 4, 5].map((i) => (Math.PI / 6) + (i * Math.PI) / 3); // 尖頂六角形的頂點方向
  corners.sort(() => rnd() - 0.5);
  const treeCount = tile.ground === 'lawn' ? 2 + Math.floor(rnd() * 2) : tile.ground === 'farm' ? 0 : 1;
  corners.slice(0, treeCount).forEach((a) => {
    const kind = rnd() < 0.3 ? 'pine' : 'round';
    tree(g, Math.cos(a) * 4.1, Math.sin(a) * 4.1, 0.75 + rnd() * 0.3, kind);
  });
  const a = corners[treeCount];
  lamps.push(lamp(g, Math.cos(a) * 4.1, Math.sin(a) * 4.1));
  if (tile.ground === 'lawn' && rnd() < 0.6) {
    const b = corners[treeCount + 1];
    xiancao(g, Math.cos(b) * 4.0, Math.sin(b) * 4.0, 1.2);
  }
  return lamps;
}

