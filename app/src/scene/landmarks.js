// 每一格的地標。原點＝格子地面中心，建物要收在半徑約 3 公尺內，
// 外圈 3.6 公尺是小人散步的路，最外圈角落放樹和路燈。
// 之後 Higgsfield 的 3D 地標（PRD 第 11 節 M4）會依 type 替換這裡的程式版本。
import * as THREE from 'three';
import { box, cyl, cone, ball, torus, roof, windows, tree, plumTree, xiancao, lamp, bench, flag, GLOW } from './kit.js';

const WALL = 0xf3ead8;
const WALL_WHITE = 0xf7f3ea;
const BRICK = 0xb5523b;
const ROOF = 0xc8664a;
const PURPLE = 0x6b5b95;
const ORANGE = 0xef8a3c;
const LEAF = 0x7fa66a;
const WOOD = 0x9c6b43;
const DARK = 0x3a3440;

const glass = new THREE.MeshLambertMaterial({ color: 0xcfe8ef, transparent: true, opacity: 0.45 });

/** 一棟一般建物：牆、屋頂、正面窗與門。回傳屋頂底部高度。 */
function building(g, w, d, h, { wall = WALL, roofColor = ROOF, z = -0.6, x = 0, flat = false, rows = 1 } = {}) {
  box(g, w, h, d, wall, x, 0, z);
  const front = z + d / 2 + 0.01;
  for (let r = 0; r < rows; r++) windows(g, Math.max(2, Math.round(w / 1.1)), 0.55, 0.6, w - 0.6, 0.7 + r * (h / rows), front, x);
  box(g, 0.6, 1.0, 0.06, 0x6b4a33, x, 0, front);
  if (flat) {
    box(g, w + 0.2, 0.2, d + 0.2, 0xcfc8bb, x, h, z);
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
    cyl(g, 1.7, 1.8, 0.35, 12, 0xd8cfc0, 0, 0, -0.4);
    for (const [x, z] of [[-1.2, -1.6], [1.2, -1.6], [-1.2, 0.8], [1.2, 0.8]]) cyl(g, 0.08, 0.08, 2.2, 5, 0xf0ece4, x, 0.35, z);
    cone(g, 2.0, 1.0, 4, PURPLE, 0, 2.55, -0.4).rotation.y = Math.PI / 4;
    flag(g, -2.6, -1.4, ORANGE);
    bench(g, -2.2, 1.6, 0.4);
    bench(g, 2.2, 1.6, -0.4);
  },

  principal(g) {
    building(g, 2.8, 2.2, 1.9, { roofColor: 0x5b4a6b, z: -0.9, x: 0.4 });
    plumTree(g, -2.0, 0.6, 1.1);
    box(g, 0.9, 0.5, 0.08, PURPLE, 0.4, 1.95 + 0.01, 0.22);
  },

  office(g) {
    building(g, 4.2, 2.4, 3.4, { flat: true, rows: 2, z: -0.8, wall: 0xe9e4da });
    for (let i = 0; i < 3; i++) { // 屋頂太陽能板
      const p = box(g, 1.1, 0.08, 1.6, 0x2c3e66, -1.3 + i * 1.3, 3.8, -0.8);
      p.rotation.x = -0.25;
    }
    box(g, 1.6, 0.45, 0.08, PURPLE, 0, 2.6, 0.42);
  },

  library(g) {
    building(g, 3.8, 2.4, 2.0, { flat: true, z: -0.8, wall: WALL });
    const books = [[0xd9483b, 0], [0x5b8ac9, 0.15], [LEAF, -0.1], [ORANGE, 0.2]];
    books.forEach(([c, rot], i) => { box(g, 2.4 - i * 0.3, 0.32, 1.5, c, 0, 2.2 + i * 0.32, -0.8).rotation.y = rot; });
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
    box(g, 4.0, 2.0, 2.4, 0xdcd6cc, 0, 0, -0.8);
    roof(g, 1.2, 0.9, 2.6, 0x8a8f98, -1.0, 2.0, -0.8, false);
    roof(g, 1.2, 0.9, 2.6, 0x8a8f98, 0.2, 2.0, -0.8, false);
    roof(g, 1.2, 0.9, 2.6, 0x8a8f98, 1.4, 2.0, -0.8, false);
    windows(g, 3, 0.7, 0.6, 3.2, 0.8, 0.41);
    torus(g, 0.55, 0.16, ORANGE, -1.2, 1.3, 0.48);
    box(g, 0.8, 0.5, 0.5, 0xd9483b, 1.6, 0, 1.2); // 工具箱
  },

  english(g) {
    building(g, 3.0, 2.2, 1.9, { wall: 0xfdf3e3, roofColor: 0x4a6fa5, z: -0.9 });
    [[0xd9483b, -1.6], [0x5b8ac9, -0.9], [0xf0b429, -1.25]].forEach(([c, x], i) => box(g, 0.6, 0.6, 0.6, c, x, i === 2 ? 0.6 : 0, 1.2));
    bench(g, 1.4, 1.3, 0);
  },

  books(g) {
    const colors = [0xd9483b, 0x5b8ac9, LEAF, ORANGE, PURPLE, 0xf0b429];
    colors.forEach((c, i) => { box(g, 2.2 - i * 0.18, 0.5, 1.6 - i * 0.1, c, 0, i * 0.5, -0.6).rotation.y = (i % 2 ? 0.18 : -0.12); });
    box(g, 0.9, 0.08, 1.4, 0xfaf6ee, 0, 3.0, -0.6); // 頂端打開的書
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
    cyl(g, 0.6, 0.8, 0.8, 8, 0xd8cfc0, 0, 0, -0.5);
    ball(g, 1.0, 0x5b8ac9, 0, 1.9, -0.5, 1);
    ball(g, 0.55, LEAF, 0.45, 2.2, -0.15, 0);
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
    roof(g, 1.6, 0.7, 4.0, 0x3d3a3a, 0, 1.6, -1.6);
    for (const x of [-1.6, 1.6]) {
      box(g, 1.0, 1.4, 2.0, BRICK, x, 0, 0);
      roof(g, 1.2, 0.6, 2.2, 0x3d3a3a, x, 1.4, 0, false);
    }
    box(g, 0.7, 1.0, 0.06, 0x6b2f22, 0, 0, -0.94);
  },

  stage(g) {
    box(g, 3.6, 0.6, 2.2, 0xd8cfc0, 0, 0, -0.8);
    box(g, 3.6, 2.2, 0.15, 0xb83a3a, 0, 0.6, -1.85);
    box(g, 3.9, 0.3, 2.4, PURPLE, 0, 2.8, -0.8);
    for (const x of [-1.85, 1.85]) box(g, 0.15, 2.2, 0.15, 0xe0d6c4, x, 0.6, 0.2);
  },

  campus(g) {
    // 教學大樓：L 形兩層樓（P3 會換成 3D 校園地圖的縮小版）
    box(g, 4.6, 2.8, 1.5, 0xeeeae2, 0, 0, -1.6);
    box(g, 1.5, 2.8, 2.6, 0xeeeae2, -1.55, 0, 0.45);
    windows(g, 5, 0.5, 0.55, 4.2, 0.6, -0.84);
    windows(g, 5, 0.5, 0.55, 4.2, 2.0, -0.84);
    box(g, 4.8, 0.15, 1.7, 0xc9c2b5, 0, 2.8, -1.6);
    box(g, 1.7, 0.15, 2.8, 0xc9c2b5, -1.55, 2.8, 0.45);
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
    const fence = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.6), new THREE.MeshLambertMaterial({ color: 0xbfc4c8, transparent: true, opacity: 0.35 }));
    fence.position.set(0, 0.45, 0.8);
    g.add(fence);
    for (const [x, z] of [[-0.9, 0.5], [0.3, 1.1], [1.0, 0.4], [-0.2, 0.9]]) chicken(g, x, z);
  },

  gate(g) {
    for (const x of [-1.6, 1.6]) box(g, 0.6, 2.4, 0.6, 0xd9d2c3, x, 0, -0.3);
    box(g, 3.9, 0.6, 0.7, 0x8a6a8f, 0, 2.4, -0.3);
    box(g, 2.2, 0.35, 0.06, 0xfaf6ee, 0, 2.52, 0.07);
    for (const s of [-1, 1]) box(g, 1.2, 1.0, 0.3, 0xd9d2c3, s * 2.6, 0, -0.3); // 圍牆
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
    cyl(g, 1.5, 1.5, 0.2, 6, 0xd8cfc0, 0, 0, -0.3);
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
  ball(g, 0.2, 0xfaf6ee, x, 0.22, z, 1);
  ball(g, 0.12, 0xfaf6ee, x + 0.14, 0.42, z, 1);
  box(g, 0.05, 0.08, 0.1, 0xd9483b, x + 0.15, 0.52, z);
}

// 地面材質色
export const GROUND = {
  lawn: 0x8fbf6a,
  stone: 0xdcd5c6,
  street: 0xc9c2b5,
  farm: 0xa48155,
  sand: 0xe8d7a8,
};

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

