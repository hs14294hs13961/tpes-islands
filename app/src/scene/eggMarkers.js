// 藏在島上的彩蛋（find 類）：要靠近才看得到，夜晚限定的天黑才出現。找到後就不再顯示。
import * as THREE from 'three';
import { TOP } from './kit.js';
import { EGGS } from '../data/eggs.js';

const SHOW_WITHIN = 70; // 鏡頭離彩蛋多近才出現（全景下找不到，鼓勵逛島）
// 看得到的是彩蛋設計圖（public/eggs/<id>.png）做成的看板，永遠面向鏡頭；點擊用一顆看不見的蛋形。
const HIT_GEO = new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.28, 1);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const texLoader = new THREE.TextureLoader();

export function createEggMarkers(scene, clusters, { isFound, isNight }) {
  const markers = [];
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
    // 放在格子邊緣、避開中間的建築
    const a = 0.6 + i * 1.7;
    root.position.set(tile.pos.x + Math.cos(a) * 3.1, TOP + 0.62, tile.pos.z + Math.sin(a) * 3.1);
    root.scale.setScalar(1.35);
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
