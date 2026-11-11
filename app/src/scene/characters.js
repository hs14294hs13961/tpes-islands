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
  clerk: { file: 'clerk.glb', logo: 'polo', oneTail: true },
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

// 幹事李易霖：設計是腦後一條低馬尾，3D 生成卻做成耳後左右各一條（從正面看像長髮）。
// 把脖子後面的深色頭髮往中線收攏，兩條併成一條。
// 模型頂點是壓縮過的整數，先換算成站姿時的實際位置（公尺）來判斷，再換回去改。
export function mergeTails(root) {
  root.updateMatrixWorld(true);
  let mesh;
  root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const img = mesh.material.map.image;
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, cv.width, cv.height).data;
  const { position: pos, uv } = mesh.geometry.attributes;
  const world = (i, v) => mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
  // 原始 x 與實際 x 是線性關係：拿最左、最右兩點求出比例與位移
  const v = new THREE.Vector3();
  let lo = 0, hi = 0;
  for (let i = 1; i < pos.count; i++) {
    if (pos.getX(i) < pos.getX(lo)) lo = i;
    if (pos.getX(i) > pos.getX(hi)) hi = i;
  }
  const xl = world(lo, v).x, xh = world(hi, v).x;
  const sx = (xh - xl) / (pos.getX(hi) - pos.getX(lo)), bx = xl - sx * pos.getX(lo);
  // 同一個位置可能有好幾個頂點（貼圖接縫切開的），要一起動，不然會裂開、長出尖刺
  const groups = new Map();
  const at = [];
  for (let i = 0; i < pos.count; i++) {
    const p = world(i, new THREE.Vector3());
    at.push(p);
    if (p.y < 0.8 || p.y > 1.0 || p.z > -0.05) continue;
    const key = `${Math.round(p.x * 2000)},${Math.round(p.y * 2000)},${Math.round(p.z * 2000)}`;
    if (!groups.has(key)) groups.set(key, { ids: [], dark: false });
    const grp = groups.get(key);
    grp.ids.push(i);
    const t = (Math.floor(uv.getY(i) * cv.height) * cv.width + Math.floor(uv.getX(i) * cv.width)) * 4;
    if (px[t] + px[t + 1] + px[t + 2] < 150) grp.dark = true; // 深色＝頭髮
  }
  const move = new Set();
  for (const grp of groups.values()) if (grp.dark) grp.ids.forEach((i) => move.add(i));
  // 再往外多帶一圈相鄰的頂點，頭髮邊緣才不會被拉出尖角
  const index = mesh.geometry.index;
  const ring = new Set();
  for (let f = 0; f < index.count; f += 3) {
    const tri = [index.getX(f), index.getX(f + 1), index.getX(f + 2)];
    if (tri.some((i) => move.has(i))) tri.forEach((i) => { if (at[i].y >= 0.8 && at[i].z < -0.03) ring.add(i); });
  }
  for (const i of ring) {
    const p = at[i];
    const key = `${Math.round(p.x * 2000)},${Math.round(p.y * 2000)},${Math.round(p.z * 2000)}`;
    (groups.get(key)?.ids || [i]).forEach((j) => move.add(j));
  }
  for (const i of move) {
    const { x, y } = at[i];
    const w = THREE.MathUtils.smoothstep(1.0 - y, 0, 0.05); // 越往下收得越緊
    const nx = x - Math.sign(x) * Math.min(Math.abs(x), 0.07) * w; // 整條平移到中間，粗細不變，兩條疊成一條
    pos.setX(i, (nx - bx) / sx);
  }
  if (pos.isInterleavedBufferAttribute) pos.data.needsUpdate = true;
  else pos.needsUpdate = true;
}

// 走路時大腿往後擺，原本屁股的皮膚跟著大腿轉，左右兩半就一上一下錯開（從背後拉近看很嚇人）。
// 把髖關節附近和以上的皮膚改成跟著骨盆，往下一小段再慢慢交還給大腿；背面的屁股比正面的大腿根低，所以背面多留一點。
const HIP_BAND = 0.3; // 交接區的長度，佔大腿長度的比例
export function firmHips(root) {
  root.updateMatrixWorld(true);
  let mesh;
  root.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const bones = mesh.skeleton.bones;
  const hips = bones.findIndex((b) => b.name === 'Hips');
  const legs = ['LeftUpLeg', 'RightUpLeg'].map((n) => bones.findIndex((b) => b.name === n));
  if (hips < 0 || legs.includes(-1)) return;
  const joint = boneAt(root, 'LeftUpLeg'), knee = boneAt(root, 'LeftLeg');
  const band = (joint.y - knee.y) * HIP_BAND;
  const { skinIndex: si, skinWeight: sw } = mesh.geometry.attributes;
  const get = ['getX', 'getY', 'getZ', 'getW'], set = ['setX', 'setY', 'setZ', 'setW'];
  const v = new THREE.Vector3();
  for (let i = 0; i < si.count; i++) {
    mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
    const top = joint.y - (v.z < joint.z ? band * 0.6 : 0); // 這個高度以上完全跟著骨盆
    const f = 1 - THREE.MathUtils.smoothstep(top - v.y, 0, band);
    if (f <= 0) continue;
    const idx = get.map((g) => si[g](i)), w = get.map((g) => sw[g](i));
    let moved = 0;
    for (let k = 0; k < 4; k++) {
      if (!legs.includes(idx[k]) || w[k] <= 0) continue;
      moved += w[k] * f;
      w[k] *= 1 - f;
    }
    if (moved <= 0) continue;
    let slot = idx.findIndex((b, k) => b === hips && w[k] > 0);
    if (slot < 0) slot = w.indexOf(Math.min(...w)); // 沒有骨盆的欄位：借用份量最小的那一格
    if (idx[slot] !== hips) { idx[slot] = hips; w[slot] = 0; }
    w[slot] += moved;
    const sum = w[0] + w[1] + w[2] + w[3];
    for (let k = 0; k < 4; k++) {
      si[set[k]](i, idx[k]);
      sw[set[k]](i, w[k] / sum);
    }
  }
  for (const a of [si, sw]) {
    if (a.isInterleavedBufferAttribute) a.data.needsUpdate = true;
    else a.needsUpdate = true;
  }
}

// 模型的站姿手臂張開約 60 度（A 字），站著不動時很僵硬，往下收一點比較自然。
// 原本的站姿記在 userData.rest0，套走路動作時要用原本的站姿算差值。單位：弧度
const ARM_DOWN = 0.26;
export function lowerArms(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isBone && !o.userData.rest0) o.userData.rest0 = o.quaternion.clone(); });
  const fwd = new THREE.Vector3(0, 0, 1);
  for (const [name, side] of [['LeftArm', 1], ['RightArm', -1]]) {
    const bone = root.getObjectByName(name);
    if (!bone) continue;
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const down = new THREE.Quaternion().setFromAxisAngle(fwd, -side * ARM_DOWN);
    bone.quaternion.premultiply(parent.clone().invert().multiply(down).multiply(parent));
  }
  root.updateMatrixWorld(true);
}

// 原始動作的手幾乎貼著身體，遠看像沒有擺手，所以依腿的節奏再加一段前後擺動。單位：弧度
const ARM_SWING = 0.36;
const ELBOW_REST = 0.08, ELBOW_SWING = 0.28;

// 腿的節奏：左右大腿前後的差，1＝右腿最前面、-1＝左腿最前面。原始動作左右不對稱，先扣掉平均，手才不會只往前擺
function legRhythm(clip, src) {
  const thigh = (name) => {
    const bone = src.getObjectByName(name);
    const axis = bone.children[0].position.clone().normalize();
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const track = clip.tracks.find((t) => t.name === `${name}.quaternion`).createInterpolant();
    const q = new THREE.Quaternion(), v = new THREE.Vector3();
    return (t) => v.copy(axis).applyQuaternion(q.fromArray(track.evaluate(t))).applyQuaternion(parent).z;
  };
  const left = thigh('LeftUpLeg'), right = thigh('RightUpLeg');
  const raw = (t) => right(t) - left(t);
  const samples = Array.from({ length: 120 }, (_, i) => raw((clip.duration * i) / 120));
  const mean = samples.reduce((n, v) => n + v, 0) / samples.length;
  const peak = Math.max(...samples.map((v) => Math.abs(v - mean)));
  return (t) => (raw(t) - mean) / peak;
}

// 某根手臂骨頭在時間 t 要往前轉多少（遠離腳的方向），沒有這根骨頭就回 null
function armForward(name, s) {
  const side = name.startsWith('Left') ? 1 : -1; // 右腿在前時左手在前
  if (name.endsWith('ForeArm')) return ELBOW_REST + ELBOW_SWING * Math.max(0, s * side);
  if (name.endsWith('Arm')) return ARM_SWING * s * side;
  return null;
}

// 全部島民共用男 1 的走路動作。原始動作連骨頭長度都寫死，直接套別人會被壓扁，
// 所以只取「相對站姿轉了多少」，再加到各自的站姿上；臀部位移照腿長比例縮放。
function retargetWalk(clip, src, tgt) {
  const tracks = [];
  const q = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const sideways = new THREE.Vector3(1, 0, 0);
  const rhythm = legRhythm(clip, src);
  for (const t of clip.tracks) {
    const [name, prop] = t.name.split('.');
    const a = src.getObjectByName(name), b = tgt.getObjectByName(name);
    if (!a || !b) continue;
    if (prop === 'quaternion') {
      const inv = (a.userData.rest0 || a.quaternion).clone().invert();
      const values = new Float32Array(t.values.length);
      const isArm = armForward(name, 0) !== null;
      const parent = b.parent.getWorldQuaternion(new THREE.Quaternion()), parentInv = parent.clone().invert();
      for (let i = 0; i < values.length; i += 4) {
        q.fromArray(t.values, i).multiply(inv).multiply(b.quaternion);
        if (isArm) { // 繞身體左右軸前後轉；換算到父骨頭座標，每款站姿不同也一樣往前
          turn.setFromAxisAngle(sideways, -armForward(name, rhythm(t.times[i / 4])));
          q.premultiply(parentInv.clone().multiply(turn).multiply(parent));
        }
        q.toArray(values, i);
      }
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
      if (def.logo && images[def.logo]) bakeLogo(gltf.scene, images[def.logo], LOGOS[def.logo], def);
      if (def.oneTail) mergeTails(gltf.scene);
      firmHips(gltf.scene);
      lowerArms(gltf.scene);
      const walk = retargetWalk((source || gltf).animations[0], (source || gltf).scene, gltf.scene);
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
