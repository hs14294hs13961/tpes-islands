// 依島嶼設定蓋出整個群島：六角格土台、地標、淺灘光暈、木棧橋。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from '../../vendor/three/utils/BufferGeometryUtils.js';
import { HEX, TOP, axialToWorld, hexPlate, seeded } from './kit.js';
import { LANDMARKS, GROUND, GROUND_RIM, decorate, scatterTile } from './landmarks.js';
import { createScatter } from './scatter.js';
import { RING } from '../data/islands.js';

const ROCK = 0xf3e4c6;       // 奶油色圓石土台
const PLANK = 0xd08a52;
const POST = 0xa8693c;

/** 淺灘光暈貼圖：中心白、往外透明，顏色由材質 color 決定。 */
function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, islands) {
  const root = new THREE.Group();
  scene.add(root);
  const haloTex = haloTexture();
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, color: 0x9fd8d0 });
  const pickables = [];
  const lamps = [];
  const flames = [];
  const scatter = createScatter();

  const clusters = islands.map((isl, ci) => {
    const rnd = seeded(ci * 97 + 13);
    const group = new THREE.Group();
    root.add(group);

    const tiles = isl.tiles.map((t, i) => {
      const [dq, dr] = t.at || RING[i]; // t.at：不在一般環狀位置的格子
      const q = isl.center[0] + dq;
      const r = isl.center[1] + dr;
      const pos = axialToWorld(q, r);
      const tg = new THREE.Group();
      tg.position.copy(pos);
      group.add(tg);

      hexPlate(tg, HEX * 1.06, TOP + 0.6, ROCK, -0.9);
      const kind = GROUND[t.ground] ? t.ground : 'lawn';
      const rim = hexPlate(tg, HEX * 0.97, 0.42, GROUND_RIM[kind], TOP - 0.42 + 0.02);
      const ground = hexPlate(tg, HEX * 0.84, 0.12, GROUND[kind], TOP - 0.12);
      for (const m of [rim, ground]) {
        m.userData.pick = { cluster: isl.id, tile: i };
        pickables.push(m);
      }

      const top = new THREE.Group();
      top.position.y = TOP;
      tg.add(top);
      (LANDMARKS[t.type] || LANDMARKS.meadow)(top, rnd);
      if (!t.bare) { // bare：照真實場景手工佈置的地標，不再隨機加樹和小花
        lamps.push(...decorate(top, t, rnd));
        scatterTile(scatter, pos.x, TOP, pos.z, kind, rnd);
      }
      top.traverse((o) => { if (o.userData.flame) flames.push(o); });

      return { ...t, index: i, q, r, pos };
    });

    // 同一座島裡相鄰的格子（小人散步用）
    for (const a of tiles) {
      a.neighbors = tiles.filter((b) => b !== a && !b.noWalk && Math.abs(a.q - b.q) <= 1 && Math.abs(a.r - b.r) <= 1 && Math.abs(a.q + a.r - b.q - b.r) <= 1);
    }

    bakeStatic(group);

    const center = tiles.reduce((s, t) => s.add(t.pos), new THREE.Vector3()).divideScalar(tiles.length);
    const radius = Math.max(...tiles.map((t) => t.pos.distanceTo(center))) + HEX;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(radius + HEX * 1.4, 48), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(center.x, 0.03, center.z);
    halo.renderOrder = 1;
    root.add(halo);

    return { ...isl, group, tiles, center, radius };
  });

  buildBridges(root, clusters);
  scatter.build(root);
  return { root, clusters, pickables, lamps, flames, haloMat };
}

/**
 * 把一座島上不會動、同材質的物件合併成一個網格，繪圖呼叫從幾百次降到幾十次，手機才跑得動。
 * 要點擊的地面、會發光的燈泡與火焰（userData 有標記）和有貼圖、半透明的物件不合併。
 */
function bakeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Object.keys(o.userData).length) return;
    const m = o.material;
    if (Array.isArray(m) || m.map || m.transparent) return;
    const key = `${m.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { material: m, cast: o.castShadow, receive: o.receiveShadow, items: [] });
    buckets.get(key).items.push(o);
  });
  for (const { material, cast, receive, items } of buckets.values()) {
    if (items.length < 2) continue;
    const geos = items.map((o) => {
      const src = o.geometry;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', src.attributes.position.clone());
      g.setAttribute('normal', src.attributes.normal.clone());
      if (src.index) g.setIndex(src.index.clone());
      else g.setIndex([...Array(src.attributes.position.count).keys()]);
      g.applyMatrix4(o.matrixWorld);
      return g;
    });
    const merged = new THREE.Mesh(mergeGeometries(geos), material);
    geos.forEach((g) => g.dispose());
    merged.castShadow = cast;
    merged.receiveShadow = receive;
    group.add(merged);
    items.forEach((o) => o.parent.remove(o));
  }
}

/** 本島連到每一座島的木棧橋（外圈的畢業生小島不接橋）。用 InstancedMesh 一次畫完所有木板。 */
function buildBridges(root, clusters) {
  const hub = clusters.find((c) => c.id === 'hub');
  const planks = [];
  const posts = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);

  for (const c of clusters) {
    if (c === hub || c.small) continue;
    let best = null;
    for (const a of hub.tiles) {
      for (const b of c.tiles) {
        const d = a.pos.distanceTo(b.pos);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    const dir = best.b.pos.clone().sub(best.a.pos).normalize();
    const start = best.a.pos.clone().addScaledVector(dir, HEX * 0.86);
    const end = best.b.pos.clone().addScaledVector(dir, -HEX * 0.86);
    const len = start.distanceTo(end);
    const yaw = Math.atan2(dir.x, dir.z);
    q.setFromAxisAngle(up, yaw);
    const n = Math.ceil(len / 0.55);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = start.clone().lerp(end, t);
      p.y = TOP - 0.1 + Math.sin(Math.PI * t) * 0.9; // 微微拱起
      m.compose(p, q, new THREE.Vector3(1, 1, 1));
      planks.push(m.clone());
      if (i % 6 === 0) {
        const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(0.85);
        for (const s of [1, -1]) {
          const pp = p.clone().addScaledVector(side, s);
          const h = pp.y + 0.8;
          m.compose(new THREE.Vector3(pp.x, h / 2 - 0.4, pp.z), q, new THREE.Vector3(1, h + 0.4, 1));
          posts.push(m.clone());
        }
      }
    }
  }

  const plankMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(1.8, 0.16, 0.5, 1, 0.07), new THREE.MeshPhongMaterial({ color: PLANK, shininess: 40, specular: 0x222222 }), planks.length);
  planks.forEach((mm, i) => plankMesh.setMatrixAt(i, mm));
  const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 8), new THREE.MeshPhongMaterial({ color: POST, shininess: 40, specular: 0x222222 }), posts.length);
  posts.forEach((mm, i) => postMesh.setMatrixAt(i, mm));
  for (const im of [plankMesh, postMesh]) {
    im.castShadow = true;
    im.receiveShadow = true;
    root.add(im);
  }
}
