// 太平Q喵：灰色虎斑小貓，躲在某一格的邊邊，要靠近才看得到。點了可以餵貓糧。
// 現在是程式拼的暫代貓；Higgsfield 3D 模型確認後放到 MODEL，就會自動換上。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { TOP } from './kit.js';

const MODEL = null; // 例：'./public/models/qcat.glb'
const SHOW_WITHIN = 75;
// 配色照學校那隻真貓（美術/參考/貓咪）：灰褐虎斑、奶油白胸口、深色腳掌、黑尾尖
const GREY = 0x8f8379;
const STRIPE = 0x3f3833;
const WHITE = 0xf3ead8;
const DARK = 0x2a2522;

function mat(color, rough = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}

/** 暫代貓：圓滾滾的身體、大頭、三角耳、額頭 M 字紋、虎斑條紋、黑尾尖的捲尾巴。 */
function makeCat() {
  const cat = new THREE.Group();
  const body = new THREE.Group(); // 吃東西時整個往前低頭
  cat.add(body);
  const add = (geo, m, x, y, z, parent = body) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const grey = mat(GREY);
  const stripe = mat(STRIPE);
  const white = mat(WHITE);
  add(new THREE.SphereGeometry(0.34, 20, 16).scale(1, 1.05, 1.15), grey, 0, 0.36, 0);
  add(new THREE.SphereGeometry(0.22, 16, 12).scale(1, 1.1, 0.7), white, 0, 0.33, 0.2);
  const dark = mat(DARK, 0.5);
  for (const x of [-0.17, 0.17]) {
    add(new THREE.SphereGeometry(0.1, 12, 10), dark, x, 0.07, 0.2);
    add(new THREE.SphereGeometry(0.1, 12, 10), dark, x, 0.08, -0.18);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.05);
  body.add(head);
  add(new THREE.SphereGeometry(0.33, 22, 18).scale(1.08, 0.95, 0.95), grey, 0, 0, 0, head);
  add(new THREE.SphereGeometry(0.17, 16, 12).scale(1.25, 0.8, 0.7), white, 0, -0.1, 0.22, head);
  for (const s of [-1, 1]) {
    const ear = add(new THREE.ConeGeometry(0.11, 0.2, 4), grey, s * 0.2, 0.28, 0, head);
    ear.rotation.set(0, Math.PI / 4, s * -0.35);
    add(new THREE.SphereGeometry(0.055, 12, 10), mat(0x2a2522, 0.3), s * 0.12, 0.02, 0.29, head);
    add(new THREE.BoxGeometry(0.06, 0.035, 0.02), stripe, s * 0.3, 0.02, 0.1, head).rotation.y = s * 1.2;
  }
  add(new THREE.SphereGeometry(0.03, 10, 8), mat(0xf08a9a), 0, -0.06, 0.32, head);
  // 額頭 M 字紋
  for (const [dx, rz] of [[-0.1, 0.25], [-0.035, -0.2], [0.035, 0.2], [0.1, -0.25]]) {
    const s = add(new THREE.BoxGeometry(0.03, 0.11, 0.02), stripe, dx, 0.2, 0.25, head);
    s.rotation.set(-0.6, 0, rz);
  }
  for (const z of [-0.12, 0.02, 0.16]) add(new THREE.BoxGeometry(0.5, 0.035, 0.06), stripe, 0, 0.5 + z * 0.2, z - 0.08).rotation.x = 0.2;
  // 尾巴：一段往上捲的管子，加三圈深色條紋和黑尾尖
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.25, -0.34), new THREE.Vector3(0, 0.3, -0.55), new THREE.Vector3(0, 0.6, -0.62), new THREE.Vector3(0, 0.82, -0.5),
  ]);
  const tail = new THREE.Group();
  body.add(tail);
  add(new THREE.TubeGeometry(curve, 20, 0.055, 8), grey, 0, 0, 0, tail);
  for (const t of [0.35, 0.6, 0.85]) {
    const ring = add(new THREE.TorusGeometry(0.06, 0.018, 6, 12), stripe, 0, 0, 0, tail);
    ring.position.copy(curve.getPoint(t));
    ring.lookAt(ring.position.clone().add(curve.getTangent(t)));
  }
  add(new THREE.SphereGeometry(0.075, 12, 10), dark, 0, 0, 0, tail).position.copy(curve.getPoint(1));
  return { cat, body, head, tail };
}

export function createQCat(scene, { camera }) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  let parts = makeCat();
  root.add(parts.cat);
  root.scale.setScalar(1.5);
  const hitMeshes = () => { const list = []; root.traverse((o) => { if (o.isMesh) list.push(o); }); return list; };

  if (MODEL) {
    new GLTFLoader().load(MODEL, (gltf) => {
      root.remove(parts.cat);
      const cat = new THREE.Group();
      const body = new THREE.Group();
      body.add(gltf.scene);
      cat.add(body);
      gltf.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      parts = { cat, body, head: body, tail: null };
      root.add(cat);
    }, undefined, () => {});
  }

  // 餵食：碗、貓糧、冒愛心
  const bowl = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.1, 18), mat(0xd9534f, 0.4));
  dish.position.y = 0.05;
  bowl.add(dish);
  for (let i = 0; i < 9; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), mat(0x9a6233));
    k.position.set(Math.cos(i * 2.4) * 0.1 * (i % 3) / 2, 0.11, Math.sin(i * 2.4) * 0.1 * (i % 3) / 2);
    bowl.add(k);
  }
  bowl.position.set(0, 0, 0.62);
  bowl.visible = false;
  root.add(bowl);

  const hearts = [];
  let hidden = false;
  let eating = 0;
  const tmp = new THREE.Vector3();

  return {
    /** 躲到某一格的邊邊。 */
    hideAt(tile) {
      const a = Math.random() * Math.PI * 2;
      root.position.set(tile.pos.x + Math.cos(a) * 3.3, TOP, tile.pos.z + Math.sin(a) * 3.3);
      root.rotation.y = a + Math.PI; // 面向格子中間
      hidden = true;
      bowl.visible = false;
    },
    leave() {
      hidden = false;
      root.visible = false;
    },
    hit: (ray) => root.visible && ray.intersectObjects(hitMeshes(), false).length > 0,
    /** 餵貓糧：放碗、低頭吃、冒愛心。吃完回傳。 */
    feed() {
      bowl.visible = true;
      eating = 2.6;
      for (let i = 0; i < 5; i++) {
        const el = document.createElement('span');
        el.className = 'cat-heart';
        el.textContent = '♥';
        el.style.animationDelay = `${0.4 + i * 0.35}s`;
        const o = new CSS2DObject(el);
        o.position.set((i - 2) * 0.18, 1.5, 0);
        root.add(o);
        hearts.push(o);
      }
      return new Promise((done) => setTimeout(() => {
        hearts.splice(0).forEach((o) => { o.element.remove(); root.remove(o); });
        done();
      }, 2800));
    },
    update(dt, t) {
      root.visible = hidden && camera.position.distanceTo(root.getWorldPosition(tmp)) < SHOW_WITHIN;
      if (!root.visible) return;
      if (eating > 0) {
        eating -= dt;
        parts.body.rotation.x = 0.45 + Math.sin(t * 14) * 0.08;
      } else {
        parts.body.rotation.x *= 0.9;
        parts.head.rotation.z = Math.sin(t * 1.3) * 0.12; // 歪頭
      }
      if (parts.tail) parts.tail.rotation.y = Math.sin(t * 3) * 0.35; // 搖尾巴
    },
  };
}
