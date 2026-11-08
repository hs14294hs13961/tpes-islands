// 藏在島上的彩蛋（find 類）：要靠近才看得到，夜晚限定的天黑才出現。找到後就不再顯示。
import * as THREE from 'three';
import { TOP, HEX } from './kit.js';
import { EGGS } from '../data/eggs.js';

const SHOW_WITHIN = 70; // 鏡頭離彩蛋多近才出現（全景下找不到，鼓勵逛島）
// 看得到的是彩蛋設計圖（public/eggs/<id>.png）做成的看板，永遠面向鏡頭；點擊用一顆看不見的蛋形。
const HIT_GEO = new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.28, 1);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const texLoader = new THREE.TextureLoader();
const SIZE = 1.35;            // 整顆蛋放大倍數：看板約 1.1 × 1.5 公尺
const LIFT = 0.86;            // 蛋中心離地高度（上下浮動時也不會沉進地面）
const HALF = 0.62;            // 蛋佔的水平半寬（含左右搖擺）
const PATH_R = HEX * 0.72;    // 島民散步的環形路（people.js 的 RING_R），蛋別擺在路上

// 從正上方拍格子的「高度圖」：每個像素記下那裡最高的東西有多高（建築、樹冠、圍籬、稻子都算）。
// 島上的建築合併成幾大塊網格，用包圍盒判斷會整片擋住，所以改用 GPU 從上往下畫一次。
const MAP_PX = 64;            // 每格 10 × 10 公尺畫成 64 × 64，約 16 公分一格
const MAX_H = 16;             // 高度編碼範圍（公尺）
const heightMat = new THREE.ShaderMaterial({
  vertexShader: `varying float vY;
    void main() {
      vec4 p = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
      #endif
      vec4 w = modelMatrix * p;
      vY = w.y;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `varying float vY;
    void main() {
      float h = clamp(vY / ${MAX_H.toFixed(1)}, 0.0, 1.0) * 255.0;
      gl_FragColor = vec4(floor(h) / 255.0, fract(h), 0.0, 1.0);
    }`,
  side: THREE.DoubleSide,
});

function heightMap(renderer, scene, tile) {
  const half = HEX;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 60);
  cam.position.set(tile.pos.x, 40, tile.pos.z);
  cam.up.set(0, 0, -1); // 影像上方＝-z
  cam.lookAt(tile.pos.x, 0, tile.pos.z);
  const target = new THREE.WebGLRenderTarget(MAP_PX, MAP_PX);
  const prev = { override: scene.overrideMaterial, bg: scene.background, fog: scene.fog, rt: renderer.getRenderTarget() };
  const clear = renderer.getClearColor(new THREE.Color());
  const alpha = renderer.getClearAlpha();
  scene.overrideMaterial = heightMat;
  scene.background = null;
  scene.fog = null;
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(MAP_PX * MAP_PX * 4);
  renderer.readRenderTargetPixels(target, 0, 0, MAP_PX, MAP_PX, px);
  renderer.setRenderTarget(prev.rt);
  renderer.setClearColor(clear, alpha);
  Object.assign(scene, { overrideMaterial: prev.override, background: prev.bg, fog: prev.fog });
  target.dispose();
  // 世界座標 → 高度（讀到的第 0 列是影像最下面＝+z 那邊）
  return (x, z) => {
    const u = Math.floor(((x - tile.pos.x) / (2 * half) + 0.5) * MAP_PX);
    const v = Math.floor((0.5 - (z - tile.pos.z) / (2 * half)) * MAP_PX);
    if (u < 0 || v < 0 || u >= MAP_PX || v >= MAP_PX) return 0;
    const i = ((MAP_PX - 1 - v) * MAP_PX + u) * 4;
    return ((px[i] + px[i + 1] / 255) / 255) * MAX_H;
  };
}

// 在格子上找一個空地放蛋：從原本想放的方向開始繞一圈、由外往內試，
// 挑腳下範圍裡「冒出地面的東西」最少的位置
function clearSpot(tile, angle, heightAt) {
  let best = null;
  const step = (2 * HEX) / MAP_PX;
  for (const r of [3.0, 2.6, 3.3, 2.2, 1.8, 1.4]) {
    for (let k = 0; k < 24; k++) {
      const a = angle + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
      const x = tile.pos.x + Math.cos(a) * r, z = tile.pos.z + Math.sin(a) * r;
      let hits = 0;
      for (let dx = -HALF; dx <= HALF; dx += step) {
        for (let dz = -HALF; dz <= HALF; dz += step) {
          if (dx * dx + dz * dz <= HALF * HALF && heightAt(x + dx, z + dz) > TOP + 0.3) hits++;
        }
      }
      if (Math.abs(r - PATH_R) < 0.7) hits += 3; // 擋到島民的路，能避就避
      if (!best || hits < best.hits) best = { x, z, hits };
      if (hits === 0) return best;
    }
  }
  return best;
}

export function createEggMarkers(scene, clusters, { isFound, isNight, renderer }) {
  const markers = [];
  scene.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();

  EGGS.filter((e) => e.how === 'find' && e.where).forEach((egg, i) => {
    const cluster = clusters.find((c) => c.id === egg.where.cluster);
    const tile = cluster?.tiles[egg.where.tile];
    if (!tile) return;
    const root = new THREE.Group();
    const shell = new THREE.Mesh(HIT_GEO, HIT_MAT);
    const tex = texLoader.load(`./public/eggs/${egg.id}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    art.scale.set(0.84, 1.08, 1); // 圖是 170×220
    root.add(shell, art);
    // 放在格子上的空地，不要插進建築、樹或圍籬裡
    const fallback = 0.6 + i * 1.7;
    const spot = renderer
      ? clearSpot(tile, fallback, heightMap(renderer, scene, tile))
      : { x: tile.pos.x + Math.cos(fallback) * 3.1, z: tile.pos.z + Math.sin(fallback) * 3.1 };
    root.position.set(spot.x, TOP + LIFT, spot.z);
    root.scale.setScalar(SIZE);
    root.visible = false;
    shell.userData.eggId = egg.id;
    scene.add(root);
    markers.push({ egg, root, shell, art, base: root.position.y, phase: i });
  });

  function update(t, camera) {
    for (const m of markers) {
      m.root.visible = !isFound(m.egg.id)
        && (!m.egg.night || isNight())
        && camera.position.distanceTo(m.root.getWorldPosition(tmp)) < SHOW_WITHIN;
      if (!m.root.visible) continue;
      m.root.position.y = m.base + Math.sin(t * 2 + m.phase) * 0.12;
      m.art.material.rotation = Math.sin(t * 2.4 + m.phase) * 0.12; // 左右搖一搖，像在叫人
      const s = 1 + Math.sin(t * 3 + m.phase) * 0.04;
      m.art.scale.set(0.84 * s, 1.08 * s, 1);
    }
  }

  /** 點到哪一顆彩蛋（沒有就回 null）。 */
  function hit(ray) {
    const visible = markers.filter((m) => m.root.visible).map((m) => m.shell);
    const h = ray.intersectObjects(visible, false)[0];
    return h ? h.object.userData.eggId : null;
  }

  return { update, hit };
}
