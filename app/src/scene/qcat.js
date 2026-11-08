// 太平Q喵：灰褐虎斑小貓，躲在某一格的設施裡；點開那一格才會跑出來，在建築外圍跑來跑去，點到牠可以餵貓糧。
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
  root.scale.setScalar(0.85); // 跟島上的小人差不多高的一半，躲起來才像貓
  // 看不見、比貓大一圈的點擊範圍：貓在跑的時候也點得到（小朋友用平板點）
  const hitBox = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hitBox.position.y = 0.6;
  root.add(hitBox);
  const hitMeshes = () => [hitBox];

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
  let home = null; // 躲在哪一格（還沒被發現前看不到）
  let out = false; // 已經被點開那一格、跑出來了
  let calm = false; // 吃飽了就不跑了
  let eating = 0;
  let pop = 0; // 跑出來的彈出動畫
  let ang = 0;
  let dir = 1;
  let run = 0; // >0 在跑、<0 坐著休息
  const RING = 3.1; // 繞著建築外圍跑的半徑
  const tmp = new THREE.Vector3();

  return {
    /** 躲進某一格的設施裡：先看不到，要點開那一格才會跑出來。 */
    hideAt(tile) {
      home = tile;
      out = false;
      calm = false;
      root.visible = false;
      bowl.visible = false;
    },
    /** 點開了某一格：是牠躲的地方就跑出來，回傳有沒有找到。 */
    reveal(tile) {
      if (!home || tile !== home || out) return false;
      out = true;
      pop = 0;
      ang = Math.random() * Math.PI * 2;
      run = 2.5;
      return true;
    },
    get hiding() { return !!home && !out; },
    leave() {
      home = null;
      out = false;
      root.visible = false;
    },
    hit: (ray) => root.visible && ray.intersectObjects(hitMeshes(), false).length > 0,
    /** 餵貓糧：放碗、低頭吃、冒愛心。吃完回傳。 */
    feed() {
      calm = true;
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
      root.visible = out && camera.position.distanceTo(root.getWorldPosition(tmp)) < SHOW_WITHIN;
      if (!root.visible) return;
      // 從建築裡彈出來
      pop = Math.min(1, pop + dt * 2.5);
      const k = pop < 1 ? Math.sin(pop * Math.PI * 0.5) * (1 + 0.25 * Math.sin(pop * Math.PI)) : 1;
      root.scale.setScalar(0.85 * k);
      // 沒吃飽前在建築外圍跑來跑去：跑一陣子、坐下來歪頭、換方向再跑
      let speed = 0;
      if (!calm && eating <= 0) {
        run -= dt;
        if (run < -2.2 - Math.random() * 1.2) { run = 1.5 + Math.random() * 1.5; if (Math.random() < 0.4) dir = -dir; }
        if (run > 0) speed = 0.45; // 約每秒 1.4 公尺，點得到
      }
      ang += dir * speed * dt;
      const r = RING * Math.min(1, pop * 1.3);
      root.position.set(home.pos.x + Math.cos(ang) * r, TOP, home.pos.z + Math.sin(ang) * r);
      if (speed > 0) root.rotation.y = Math.atan2(-Math.sin(ang) * dir, Math.cos(ang) * dir); // 面向跑的方向
      parts.body.position.y = speed > 0 ? Math.abs(Math.sin(t * 16)) * 0.06 : 0;
      if (eating > 0) {
        eating -= dt;
        parts.body.rotation.x = 0.45 + Math.sin(t * 14) * 0.08;
      } else {
        parts.body.rotation.x *= 0.9;
        parts.head.rotation.z = speed > 0 ? 0 : Math.sin(t * 1.3) * 0.12; // 坐著時歪頭
      }
      if (parts.tail) parts.tail.rotation.y = Math.sin(t * (speed > 0 ? 9 : 3)) * 0.35; // 搖尾巴
    },
  };
}
