// 太平G米花。模型沒有骨架，動作全部用程式做：飄浮、跳躍壓扁、歪頭、轉身，翅膀在頂點著色器裡繞肩膀擺動。
// 牠是跟著畫面走的小嚮導，不是島上的東西：自己一層、用「鏡頭座標」擺位置，畫在群島上面。
// 這樣不管鏡頭怎麼轉、拉多近，牠都固定在畫面右下角、站得直直的、大小一樣，也不會被建築擋住或插進樹裡。
// 說話時才飛到畫面右側。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

const MODEL = './public/models/qchick.glb';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 彈簧式跟隨：接近臨界阻尼，飛過去不會來回晃
const SPRING = 7;
const DAMP = 5.2;

/** 把翅膀擺動加進材質：身體外側的頂點繞肩膀轉，越靠外轉越多（模型座標，翅膀約在 |x| > 0.42）。 */
function addWings(material, uniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWing = uniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWing;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float wSide = position.x >= 0.0 ? 1.0 : -1.0;
        float wWeight = smoothstep(0.42, 0.62, abs(position.x))
          * smoothstep(-0.55, -0.40, position.y) * (1.0 - smoothstep(0.30, 0.45, position.y));
        float wAngle = uWing * wWeight * wSide;
        vec2 wPivot = vec2(wSide * 0.42, 0.0);
        vec2 wArm = transformed.xy - wPivot;
        transformed.xy = wPivot + vec2(cos(wAngle) * wArm.x - sin(wAngle) * wArm.y, sin(wAngle) * wArm.x + cos(wAngle) * wArm.y);`);
  };
}

export function createQChick({ camera }) {
  const scene = new THREE.Scene();
  const eye = new THREE.PerspectiveCamera(); // 放在原點、朝 -z 看；投影每格照抄主鏡頭
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8f8478, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  root.visible = false;
  scene.add(root);

  const wing = { value: 0 };
  const goal = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const pull = new THREE.Vector3();
  const ORIGIN = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let mesh = null;
  let height = 1; // 模型原本的高度，用來換算「佔畫面多高」
  let speaking = false;
  let hop = 0; // 跳躍進度，1 → 0
  let arrived = false;
  let yaw = 0;

  new GLTFLoader().load(MODEL, (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      mesh = o;
      addWings(o.material, wing);
    });
    height = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y || 1;
    body.add(gltf.scene);
    root.visible = true;
  }, undefined, () => { /* 載不到就只留對話框的 2D 頭像 */ });

  // 位置用螢幕座標（-1～1）：平常在右下角、選單按鈕上方；說話時在畫面右側中間（對話框在下方）
  const DIST = 12; // 離鏡頭多遠（公尺）；只影響透視感，大小另外用畫面比例算
  const SPOT_IDLE = new THREE.Vector2(0.86, -0.6);
  const SPOT_TALK = new THREE.Vector2(0.7, 0.1);
  const TALL_IDLE = 0.085, TALL_TALK = 0.15; // 佔畫面高度的比例

  return {
    /** 到了一座島：跳一下打招呼（位置固定在畫面角落，不跟著島跑）。 */
    moveTo() { hop = 1; },
    leave() {},
    speak(on) {
      speaking = on;
      if (on) hop = 1;
    },
    hop() { hop = 1; },
    /** 滑鼠或手指有沒有點到牠。ndc：螢幕座標（-1～1）。 */
    hit(ndc) {
      if (!mesh || !root.visible) return false;
      ray.setFromCamera(ndc, eye);
      return ray.intersectObject(mesh, false).length > 0;
    },
    update(dt, t) {
      if (!mesh) return;
      eye.projectionMatrix.copy(camera.projectionMatrix);
      eye.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST;
      const halfW = halfH * camera.aspect;
      const spot = speaking ? SPOT_TALK : SPOT_IDLE;
      goal.set(spot.x * halfW, spot.y * halfH, -DIST);

      if (!arrived) { // 第一次現身：從畫面上方飛進來
        root.position.copy(goal).setY(halfH + 2);
        root.scale.setScalar(0);
        arrived = true;
      }
      if (still) {
        root.position.copy(goal);
        vel.set(0, 0, 0);
      } else {
        vel.addScaledVector(pull.copy(goal).sub(root.position), SPRING * dt);
        vel.multiplyScalar(Math.exp(-DAMP * dt));
        root.position.addScaledVector(vel, dt);
      }
      // 直式手機畫面窄，改用寬度當基準，才不會佔掉半個畫面
      const screen = 2 * halfH * Math.min(1, camera.aspect * 1.4);
      const want = ((speaking ? TALL_TALK : TALL_IDLE) * screen) / height;
      root.scale.setScalar(root.scale.x ? THREE.MathUtils.damp(root.scale.x, want, 6, dt) : want);

      const speed = vel.length();
      const moving = THREE.MathUtils.clamp(speed / 4, 0, 1);

      // 永遠正面朝鏡頭、站直；飛的時候轉向前進方向，停下來微微看向畫面中間
      const turn = moving > 0.3 ? THREE.MathUtils.clamp(vel.x * 0.25, -1.1, 1.1) : speaking ? -0.12 : -0.3;
      yaw = THREE.MathUtils.damp(yaw, turn, 6, dt);
      root.lookAt(ORIGIN);
      root.rotateY(yaw);

      if (still) {
        wing.value = 0;
        body.position.y = 0;
        body.rotation.set(0, 0, 0);
        return;
      }

      // 跳躍：起跳拉長、落地壓扁再回彈
      hop = Math.max(0, hop - dt * 1.6);
      const arc = Math.sin((1 - hop) * Math.PI);
      const land = hop > 0 && hop < 0.25 ? Math.sin((hop / 0.25) * Math.PI) : 0;
      const stretch = 1 + arc * 0.1 - land * 0.16;
      body.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      body.position.y = (arc * 0.55 + Math.sin(t * 1.9) * 0.09) * height * 0.6;
      body.rotation.z = speaking ? Math.sin(t * 2.4) * 0.08 : 0; // 說話時搖頭晃腦，平常站直
      body.rotation.x = 0.3 * moving; // 飛行時微微前傾

      // 翅膀：飛行快拍、說話輕拍、平常小幅度
      const beat = moving > 0.1 ? 15 : speaking ? 6 : 2.2;
      const amp = moving > 0.1 ? 0.5 : speaking ? 0.26 : 0.1;
      wing.value = Math.sin(t * beat) * amp + (moving > 0.1 ? 0.1 : 0);
    },
    /** 畫在群島上面：先清掉深度，牠就不會被前面的建築或樹蓋住。 */
    render(renderer) {
      if (!root.visible) return;
      const auto = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, eye);
      renderer.autoClear = auto;
    },
  };
}
