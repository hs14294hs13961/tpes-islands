// Higgsfield 做的 3D 島民（PRD M2、M3）：讀模型、把真正的太平T 圖案印進衣服貼圖、複製給每位島民。
// 模型都是同一套 24 根骨頭的骨架，身高 1.2 公尺、面向 +z，內含一段原地走路動作。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/SkeletonUtils.js';

// 每款模型的檔案與胸前圖案：tee＝太平T 正中央，polo＝POLO 左胸校徽，沒寫＝不印（叔公穿背心）。
// cover：AI 貼圖胸口有模糊的字，要先用衣服底色蓋掉（只有最早做的男 1）。
// erase：AI 自己多畫在衣服上的東西，填範圍 [x0, y0, x1, y1]（公尺）就會塗回衣服底色（黃薇胸前的紅蘿蔔）。
const BASE = './public/models/';
const MODELS = {
  'student-m1': { file: 'student-m1.glb', logo: 'tee', cover: true },
  'student-m3': { file: 'student-m3.glb', logo: 'tee' },
  'student-f1': { file: 'student-f1.glb', logo: 'tee' },
  'student-f2': { file: 'student-f2.glb', logo: 'tee' },
  'teacher-b': { file: 'teacher-b.glb', logo: 'polo' },
  'teacher-c': { file: 'teacher-c.glb', logo: 'polo' },
  principal: { file: 'principal.glb', logo: 'polo' },
  'director-zhuang': { file: 'director-zhuang.glb', logo: 'polo' },
  'teacher-huang': { file: 'teacher-huang.glb', logo: 'polo', erase: [-0.056, 0.722, -0.028, 0.785] },
  clerk: { file: 'clerk.glb', logo: 'polo' },
  uncle: { file: 'uncle.glb' },
};
// 圖案位置都用骨架比例算（f：臀到脖子之間的高度比例；w、x：相對肩寬），每位身材不同也對得上
const LOGOS = {
  tee: { src: './public/textures/tee-logo.png', f: 0.5, w: 1.0, x: 0 },
  polo: { src: './public/textures/polo-badge.png', f: 0.68, w: 0.24, x: 0.28 },
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

// 圖案片：太平T 圖案或校徽。cover 時先鋪衣服底色、四邊漸淡，蓋掉 AI 貼圖上模糊的字
function logoPatch(logo, cover) {
  const W = 512, H = cover ? 220 : Math.round((W * logo.height) / logo.width);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  if (cover) {
    g.fillStyle = cover;
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
  }
  const lw = cover ? W * 0.78 : W, lh = (lw * logo.height) / logo.width;
  g.drawImage(logo, (W - lw) / 2, (H - lh) / 2, lw, lh);
  return cv;
}

// 骨頭的世界座標
function boneAt(root, name) {
  const v = new THREE.Vector3();
  root.getObjectByName(name).getWorldPosition(v);
  return v;
}

// 從正面把胸口範圍的三角形投影到圖案片上，逐一畫進貼圖的 UV 位置，圖案就會跟著衣服彎
function bakeLogo(root, logo, spec, { cover, erase }) {
  root.updateMatrixWorld(true);
  let mesh;
  root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const hips = boneAt(root, 'Hips'), neck = boneAt(root, 'neck');
  const shoulders = Math.abs(boneAt(root, 'LeftArm').x - boneAt(root, 'RightArm').x);
  const y = hips.y + (neck.y - hips.y) * spec.f, x0 = shoulders * spec.x;
  const { index, attributes: { uv } } = mesh.geometry;
  const img = mesh.material.map.image, W = img.width, H = img.height;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const pixels = g.getImageData(0, 0, W, H).data;
  const colorAt = (u, v) => {
    const i = (Math.floor(v * H) * W + Math.floor(u * W)) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };

  // 衣服顏色取身體中線（男 1 胸口有字，改取腰部）；之後只印在顏色接近的三角形上，避開頭髮與手
  const plain = new THREE.Raycaster(new THREE.Vector3(0, hips.y + (neck.y - hips.y) * (cover ? 0.18 : 0.72), 2), new THREE.Vector3(0, 0, -1))
    .intersectObject(mesh, false)[0];
  const [sr, sg, sb] = colorAt(plain.uv.x, plain.uv.y);
  const isShirt = ([r, gg, b]) => Math.abs(r - sr) + Math.abs(gg - sg) + Math.abs(b - sb) < 90;

  // 掃過範圍，從每個點往外找「不是衣服色」的相連像素塗回底色（圖案可能被接縫切成好幾片）；限制半徑，不會跑到別的部位
  if (erase) {
    const data = g.getImageData(0, 0, W, H), d = data.data;
    const away = (i) => Math.abs(d[i] - sr) + Math.abs(d[i + 1] - sg) + Math.abs(d[i + 2] - sb) > 36;
    const ray = new THREE.Raycaster();
    for (let ey = erase[1]; ey <= erase[3]; ey += 0.005) {
      for (let ex = erase[0]; ex <= erase[2]; ex += 0.005) {
        ray.set(new THREE.Vector3(ex, ey, 2), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(mesh, false)[0];
        const cx = Math.floor(hit.uv.x * W), cy = Math.floor(hit.uv.y * H), R = 22;
        if (!away((cy * W + cx) * 4)) continue;
        const stack = [[cx, cy]];
        while (stack.length) {
          const [px, py] = stack.pop();
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) { // 連邊緣的漸層一起塗掉
              const i = ((py + dy) * W + px + dx) * 4;
              d[i] = sr; d[i + 1] = sg; d[i + 2] = sb;
            }
          }
          for (const [nx, ny] of [[px + 3, py], [px - 3, py], [px, py + 3], [px, py - 3]]) {
            if (Math.hypot(nx - cx, ny - cy) <= R && away((ny * W + nx) * 4)) stack.push([nx, ny]);
          }
        }
      }
    }
    g.putImageData(data, 0, 0);
  }

  const patch = logoPatch(logo, cover ? `rgb(${sr},${sg},${sb})` : null);
  const PW = patch.width, PH = patch.height, w = (shoulders * spec.w) / (cover ? 0.78 : 1), h = (w * PH) / PW;

  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    ids.forEach((k, j) => mesh.getVertexPosition(k, v[j]).applyMatrix4(mesh.matrixWorld)); // 套用骨架後的實際位置
    n.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize();
    const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
    if (n.z < 0.25 || cz < 0 || Math.abs(cx - x0) > w / 2 + 0.03 || Math.abs(cy - y) > h / 2 + 0.03) continue;
    if (!cover && !isShirt(colorAt((uv.getX(ids[0]) + uv.getX(ids[1]) + uv.getX(ids[2])) / 3, (uv.getY(ids[0]) + uv.getY(ids[1]) + uv.getY(ids[2])) / 3))) continue;
    const P = v.map((q) => [((q.x - x0 + w / 2) / w) * PW, ((y + h / 2 - q.y) / h) * PH]);
    const T = ids.map((k) => [uv.getX(k) * W, uv.getY(k) * H]);
    // 三角形往外撐開不到 1 像素，避免接縫露出原本的字
    const ctr = [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3];
    g.save();
    g.beginPath();
    T.forEach(([tx, tz], j) => {
      const dx = tx - ctr[0], dz = tz - ctr[1], l = Math.hypot(dx, dz) || 1;
      g[j ? 'lineTo' : 'moveTo'](tx + (dx / l) * 0.8, tz + (dz / l) * 0.8);
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
  mesh.material.map = tex;
  mesh.material.needsUpdate = true;
}

// 全部島民共用男 1 的走路動作。原始動作連骨頭長度都寫死，直接套別人會被壓扁，
// 所以只取「相對站姿轉了多少」，再加到各自的站姿上；臀部位移照腿長比例縮放。
function retargetWalk(clip, src, tgt) {
  const tracks = [];
  const q = new THREE.Quaternion();
  for (const t of clip.tracks) {
    const [name, prop] = t.name.split('.');
    const a = src.getObjectByName(name), b = tgt.getObjectByName(name);
    if (!a || !b) continue;
    if (prop === 'quaternion') {
      const inv = a.quaternion.clone().invert();
      const values = new Float32Array(t.values.length);
      for (let i = 0; i < values.length; i += 4) q.fromArray(t.values, i).multiply(inv).multiply(b.quaternion).toArray(values, i);
      tracks.push(new THREE.QuaternionKeyframeTrack(t.name, t.times, values));
    } else if (prop === 'position' && name === 'Hips') {
      const k = b.position.y / a.position.y;
      const values = new Float32Array(t.values.length);
      for (let i = 0; i < values.length; i += 3) {
        values[i] = b.position.x + (t.values[i] - a.position.x) * k;
        values[i + 1] = b.position.y + (t.values[i + 1] - a.position.y) * k;
        values[i + 2] = b.position.z + (t.values[i + 2] - a.position.z) * k;
      }
      tracks.push(new THREE.VectorKeyframeTrack(t.name, t.times, values));
    }
  }
  return new THREE.AnimationClip('walk', clip.duration, tracks);
}

/** 背景讀入全部模型，好一個就交給 onReady；走路動作來自男 1，所以先讀男 1。讀不到的略過，島民維持暫代造型。 */
export async function loadCharacters(onReady) {
  const images = {};
  await Promise.all(Object.entries(LOGOS).map(async ([k, l]) => {
    images[k] = await new THREE.ImageLoader().loadAsync(l.src).catch(() => null);
  }));
  const load = async (key, source) => {
    const def = MODELS[key];
    try {
      const gltf = await loader.loadAsync(BASE + def.file);
      const walk = retargetWalk((source || gltf).animations[0], (source || gltf).scene, gltf.scene);
      if (def.logo && images[def.logo]) bakeLogo(gltf.scene, images[def.logo], LOGOS[def.logo], def);
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          o.frustumCulled = false; // 骨架動畫會讓包圍盒跑掉，乾脆不裁切
          // 不產生縮圖：AI 貼圖接縫沒留邊，縮圖會把隔壁的顏色滲過來，變成衣服上的刮痕
          o.material.map.generateMipmaps = false;
          o.material.map.minFilter = THREE.LinearFilter;
          o.material.map.needsUpdate = true;
        }
      });
      onReady(key, { scene: gltf.scene, walk });
      return gltf;
    } catch (err) {
      console.warn(`模型 ${key} 讀取失敗，維持暫代造型`, err);
      return null;
    }
  };
  const first = await load('student-m1');
  if (!first) return;
  // 一次讀兩個，別把學校網路塞滿
  const queue = Object.keys(MODELS).filter((k) => k !== 'student-m1');
  const worker = async () => {
    while (queue.length) await load(queue.shift(), first);
  };
  await Promise.all([worker(), worker()]);
}

/** 複製一位島民：回傳根節點與動畫控制器。 */
export function spawnCharacter(model) {
  const root = SkeletonUtils.clone(model.scene);
  const mixer = new THREE.AnimationMixer(root);
  const walk = mixer.clipAction(model.walk);
  walk.play();
  return { root, mixer, walk };
}
