// Higgsfield 做的 3D 島民（PRD M2、M3）：讀模型、把真正的太平T 圖案印進衣服貼圖、複製給每位島民。
// 模型都是同一套 24 根骨頭的骨架，身高 1.2 公尺、面向 +z，內含一段原地走路動作。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/SkeletonUtils.js';

// 每款模型的檔案與胸口圖案位置（y：圖案中心高度、w：圖案寬度，單位公尺）
const MODELS = {
  'student-m1': { url: './public/models/student-m1.glb', logo: { y: 0.535, w: 0.33 } },
};

const loader = new GLTFLoader();

// 求把 (px,py) 對到 (tx,ty) 的 2D 仿射矩陣，給 canvas setTransform 用
function affine([a, b, c], [A, B, C]) {
  const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const m11 = ((B[0] - A[0]) * (c[1] - a[1]) - (C[0] - A[0]) * (b[1] - a[1])) / d;
  const m12 = ((C[0] - A[0]) * (b[0] - a[0]) - (B[0] - A[0]) * (c[0] - a[0])) / d;
  const m21 = ((B[1] - A[1]) * (c[1] - a[1]) - (C[1] - A[1]) * (b[1] - a[1])) / d;
  const m22 = ((C[1] - A[1]) * (b[0] - a[0]) - (B[1] - A[1]) * (c[0] - a[0])) / d;
  return [m11, m21, m12, m22, A[0] - m11 * a[0] - m12 * a[1], A[1] - m21 * a[0] - m22 * a[1]];
}

// 圖案片：衣服底色、四邊漸淡，中間放太平T 圖案（蓋掉 AI 貼圖上模糊的字）
function logoPatch(color, logo) {
  const W = 512, H = 220;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-in';
  const fade = (x1, y1) => {
    const l = g.createLinearGradient(0, 0, x1, y1);
    l.addColorStop(0, 'rgba(0,0,0,0)');
    l.addColorStop(0.18, '#000');
    l.addColorStop(0.82, '#000');
    l.addColorStop(1, 'rgba(0,0,0,0)');
    return l;
  };
  g.fillStyle = fade(W, 0);
  g.fillRect(0, 0, W, H);
  g.fillStyle = fade(0, H);
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const lw = W * 0.78, lh = (lw * logo.height) / logo.width;
  g.drawImage(logo, (W - lw) / 2, (H - lh) / 2, lw, lh);
  return cv;
}

// 從正面把胸口範圍的三角形投影到圖案片上，逐一畫進貼圖的 UV 位置，圖案就會跟著衣服彎
function bakeLogo(root, logo, { y, w }) {
  root.updateMatrixWorld(true);
  let mesh;
  root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const { index, attributes: { uv } } = mesh.geometry;
  const img = mesh.material.map.image, W = img.width, H = img.height;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);

  const plain = new THREE.Raycaster(new THREE.Vector3(0, y - 0.11, 2), new THREE.Vector3(0, 0, -1)).intersectObject(mesh, false)[0];
  const [r, gg, b] = g.getImageData(Math.floor(plain.uv.x * W), Math.floor(plain.uv.y * H), 1, 1).data;
  const patch = logoPatch(`rgb(${r},${gg},${b})`, logo);
  const PW = patch.width, PH = patch.height, h = (w * PH) / PW;

  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    ids.forEach((k, j) => mesh.getVertexPosition(k, v[j]).applyMatrix4(mesh.matrixWorld)); // 套用骨架後的實際位置
    n.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize();
    const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
    if (n.z < 0.25 || cz < 0 || Math.abs(cx) > w / 2 + 0.03 || Math.abs(cy - y) > h / 2 + 0.03) continue;
    const P = v.map((q) => [((q.x + w / 2) / w) * PW, ((y + h / 2 - q.y) / h) * PH]);
    const T = ids.map((k) => [uv.getX(k) * W, uv.getY(k) * H]);
    // 三角形往外撐開不到 1 像素，避免接縫露出原本的字
    const ctr = [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3];
    g.save();
    g.beginPath();
    T.forEach(([x, z], j) => {
      const dx = x - ctr[0], dz = z - ctr[1], l = Math.hypot(dx, dz) || 1;
      g[j ? 'lineTo' : 'moveTo'](x + (dx / l) * 0.8, z + (dz / l) * 0.8);
    });
    g.closePath();
    g.clip();
    g.setTransform(...affine(P, T));
    g.drawImage(patch, 0, 0);
    g.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
}

/** 讀入全部模型；讀不到的會略過，島民改用暫代造型。 */
export async function loadCharacters() {
  const logo = await new THREE.ImageLoader().loadAsync('./public/textures/tee-logo.png').catch(() => null);
  const out = {};
  await Promise.all(Object.entries(MODELS).map(async ([key, def]) => {
    try {
      const gltf = await loader.loadAsync(def.url);
      if (logo && def.logo) bakeLogo(gltf.scene, logo, def.logo);
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false; // 骨架動畫會讓包圍盒跑掉，乾脆不裁切
        }
      });
      out[key] = { scene: gltf.scene, walk: gltf.animations[0] };
    } catch (err) {
      console.warn(`模型 ${key} 讀取失敗，改用暫代造型`, err);
    }
  }));
  return out;
}

/** 複製一位島民：回傳根節點與動畫控制器。 */
export function spawnCharacter(model) {
  const root = SkeletonUtils.clone(model.scene);
  const mixer = new THREE.AnimationMixer(root);
  const walk = mixer.clipAction(model.walk);
  walk.play();
  return { root, mixer, walk };
}
