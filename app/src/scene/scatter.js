// 島上大量的小裝飾：同一種形狀用 InstancedMesh 一次畫完，上千個也只有幾次繪圖呼叫，手機才跑得動。
import * as THREE from 'three';

const SHAPES = {
  blade: () => new THREE.ConeGeometry(0.07, 0.3, 6).translate(0, 0.15, 0),
  stem: () => new THREE.CylinderGeometry(0.025, 0.03, 0.28, 5).translate(0, 0.14, 0),
  bloom: () => new THREE.SphereGeometry(0.09, 8, 6),
  pebble: () => new THREE.SphereGeometry(0.13, 8, 6),
  cap: () => new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  chick: () => new THREE.SphereGeometry(0.14, 10, 8),
  chickHead: () => new THREE.SphereGeometry(0.095, 10, 8),
  beak: () => new THREE.ConeGeometry(0.035, 0.08, 6).rotateZ(-Math.PI / 2),
};

export function createScatter() {
  const items = {};
  return {
    /** sy：高度壓扁的比例。 */
    add(shape, x, y, z, s, color, sy = 1) {
      (items[shape] ||= []).push({ x, y, z, s, color, sy });
    },
    build(parent) {
      const m = new THREE.Matrix4(), c = new THREE.Color();
      const q = new THREE.Quaternion(), p = new THREE.Vector3(), v = new THREE.Vector3();
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 50, specular: 0x262626 });
      for (const [shape, list] of Object.entries(items)) {
        const mesh = new THREE.InstancedMesh(SHAPES[shape](), material, list.length);
        list.forEach((it, i) => {
          m.compose(p.set(it.x, it.y, it.z), q, v.set(it.s, it.s * it.sy, it.s));
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, c.set(it.color));
        });
        mesh.frustumCulled = false; // 散落全島，整批裁切沒有意義
        parent.add(mesh);
      }
    },
  };
}
