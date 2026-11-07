// 藏在島上的彩蛋（find 類）：要靠近才看得到，夜晚限定的天黑才出現。找到後就不再顯示。
import * as THREE from 'three';
import { TOP } from './kit.js';
import { EGGS } from '../data/eggs.js';

const SHOW_WITHIN = 70; // 鏡頭離彩蛋多近才出現（全景下找不到，鼓勵逛島）
const EGG_GEO = new THREE.SphereGeometry(0.42, 20, 14).scale(1, 1.28, 1);
const BAND_GEO = new THREE.TorusGeometry(0.43, 0.06, 8, 24).rotateX(Math.PI / 2);
const BAND_MAT = new THREE.MeshStandardMaterial({ color: 0x5fb8a6, roughness: 0.5 });

export function createEggMarkers(scene, clusters, { isFound, isNight }) {
  const markers = [];
  const tmp = new THREE.Vector3();

  EGGS.filter((e) => e.how === 'find' && e.where).forEach((egg, i) => {
    const cluster = clusters.find((c) => c.id === egg.where.cluster);
    const tile = cluster?.tiles[egg.where.tile];
    if (!tile) return;
    const root = new THREE.Group();
    const shell = new THREE.Mesh(EGG_GEO, new THREE.MeshStandardMaterial({
      color: 0xfbf3e2, emissive: new THREE.Color(egg.color), emissiveIntensity: 0.35, roughness: 0.45,
    }));
    shell.castShadow = true;
    const band = new THREE.Mesh(BAND_GEO, BAND_MAT);
    band.position.y = 0.05;
    root.add(shell, band);
    // 放在格子邊緣、避開中間的建築
    const a = 0.6 + i * 1.7;
    root.position.set(tile.pos.x + Math.cos(a) * 3.1, TOP + 0.62, tile.pos.z + Math.sin(a) * 3.1);
    root.scale.setScalar(1.35);
    root.visible = false;
    shell.userData.eggId = egg.id;
    scene.add(root);
    markers.push({ egg, root, shell, base: root.position.y, phase: i });
  });

  function update(t, camera) {
    for (const m of markers) {
      m.root.visible = !isFound(m.egg.id)
        && (!m.egg.night || isNight())
        && camera.position.distanceTo(m.root.getWorldPosition(tmp)) < SHOW_WITHIN;
      if (!m.root.visible) continue;
      m.root.position.y = m.base + Math.sin(t * 2 + m.phase) * 0.12;
      m.root.rotation.y = t * 0.8 + m.phase;
      m.shell.material.emissiveIntensity = 0.3 + Math.sin(t * 3 + m.phase) * 0.15;
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
