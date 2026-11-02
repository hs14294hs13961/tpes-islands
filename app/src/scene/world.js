// 依島嶼設定蓋出整個群島：六角格土台、地標、淺灘光暈、木棧橋。
import * as THREE from 'three';
import { HEX, TOP, axialToWorld, cyl, seeded } from './kit.js';
import { LANDMARKS, GROUND, decorate } from './landmarks.js';
import { RING } from '../data/islands.js';

const EARTH = 0x9c7552;
const WET_ROCK = 0x7d5d40;
const PLANK = 0xa77a50;
const POST = 0x6b4a33;

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

  const clusters = islands.map((isl, ci) => {
    const rnd = seeded(ci * 97 + 13);
    const group = new THREE.Group();
    root.add(group);

    const tiles = isl.tiles.map((t, i) => {
      const [dq, dr] = RING[i];
      const q = isl.center[0] + dq;
      const r = isl.center[1] + dr;
      const pos = axialToWorld(q, r);
      const tg = new THREE.Group();
      tg.position.copy(pos);
      group.add(tg);

      cyl(tg, HEX * 0.97, HEX * 0.88, 3.0, 6, EARTH, 0, -2.0, 0);
      cyl(tg, HEX * 0.99, HEX * 0.99, 0.5, 6, WET_ROCK, 0, -0.35, 0);
      const ground = cyl(tg, HEX * 0.95, HEX * 0.95, 0.25, 6, GROUND[t.ground] || GROUND.lawn, 0, TOP - 0.25, 0);
      ground.userData.pick = { cluster: isl.id, tile: i };
      pickables.push(ground);

      const top = new THREE.Group();
      top.position.y = TOP;
      tg.add(top);
      (LANDMARKS[t.type] || LANDMARKS.meadow)(top, rnd);
      lamps.push(...decorate(top, t, rnd));
      top.traverse((o) => { if (o.userData.flame) flames.push(o); });

      return { ...t, index: i, q, r, pos };
    });

    // 同一座島裡相鄰的格子（小人散步用）
    for (const a of tiles) {
      a.neighbors = tiles.filter((b) => b !== a && Math.abs(a.q - b.q) <= 1 && Math.abs(a.r - b.r) <= 1 && Math.abs(a.q + a.r - b.q - b.r) <= 1);
    }

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
  return { root, clusters, pickables, lamps, flames, haloMat };
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

  const plankMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: PLANK, flatShading: true }), planks.length);
  planks.forEach((mm, i) => plankMesh.setMatrixAt(i, mm));
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1, 0.14), new THREE.MeshLambertMaterial({ color: POST, flatShading: true }), posts.length);
  posts.forEach((mm, i) => postMesh.setMatrixAt(i, mm));
  for (const im of [plankMesh, postMesh]) {
    im.castShadow = true;
    im.receiveShadow = true;
    root.add(im);
  }
}
