// 場景裡的太平G米花。模型沒有骨架，動作全部用程式做：飄浮、跳躍壓扁、轉身面向鏡頭，
// 翅膀則在頂點著色器裡繞肩膀擺動。平常停在目前這座島外的海面上（全景時在右下角），說話時才飛到畫面右側。
// 停下來時整隻正面朝鏡頭、順著鏡頭的「上」站直：鏡頭是斜斜往下看的，照世界的「上」站會在畫面邊緣歪一邊。
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

export function createQChick(scene, { camera, controls }) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  root.visible = false;
  scene.add(root);

  const wing = { value: 0 };
  const goal = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const pull = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const lookM = new THREE.Matrix4();
  const faceQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  let mesh = null;
  let hasAnchor = false;
  let speaking = false;
  let hop = 0; // 跳躍進度，1 → 0
  let arrived = false;

  new GLTFLoader().load(MODEL, (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      mesh = o;
      o.castShadow = true;
      addWings(o.material, wing);
    });
    body.add(gltf.scene);
    root.visible = true;
  }, undefined, () => { /* 載不到就只留對話框的 2D 頭像 */ });

  // 說話時停在畫面右側中間（對話框在下方）；全景閒著時退到右下角、選單按鈕上方，不擋島和名牌。
  // 用螢幕座標算位置（NDC，-1～1），放在鏡頭到視線中心距離的 NEAR 倍處，手機直式也不會跑出畫面
  const NEAR = 0.55;
  const SPOT_TALK = new THREE.Vector2(0.7, 0.1);
  const SPOT_IDLE = new THREE.Vector2(0.86, -0.62);
  const ndc = new THREE.Vector3();
  function aim(dist, size) {
    if (speaking || !hasAnchor) {
      const spot = speaking ? SPOT_TALK : SPOT_IDLE;
      ndc.set(spot.x, spot.y, 0.5).unproject(camera).sub(camera.position).normalize();
      goal.copy(camera.position).addScaledVector(ndc, dist * NEAR);
    } else {
      goal.copy(anchor).setY(anchor.y + size * 1.1);
    }
  }

  return {
    /** 到某座島的島邊待命。 */
    moveTo(center, radius) {
      anchor.set(center.x + radius * 0.85, 3, center.z + radius * 0.85); // 島外的海面上，不擋建築
      hasAnchor = true;
    },
    leave() { hasAnchor = false; },
    speak(on) {
      speaking = on;
      if (on) hop = 1;
    },
    hop() { hop = 1; },
    /** 滑鼠或手指有沒有點到牠。 */
    hit: (ray) => !!mesh && root.visible && ray.intersectObject(mesh, false).length > 0,
    update(dt, t) {
      if (!mesh) return;
      const dist = camera.position.distanceTo(controls.target);
      const size = THREE.MathUtils.clamp(dist * 0.032, 1.5, 6.5);
      aim(dist, size);

      if (!arrived) { // 第一次現身：從上方飛進來
        root.position.copy(goal).setY(goal.y + 30);
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
      // 在畫面角落時離鏡頭比較近，縮小才會和在島邊時看起來差不多大
      const want = speaking ? size * NEAR * 1.3 : hasAnchor ? size : size * NEAR * 0.75;
      root.scale.setScalar(THREE.MathUtils.damp(root.scale.x, want, 6, dt));

      const speed = vel.length();
      const moving = THREE.MathUtils.clamp(speed / 12, 0, 1);

      // 轉身：飛行時看前進方向；停下來整隻正面朝鏡頭，並順著鏡頭的「上」站直，在畫面哪裡都不歪（模型正面朝 +z）
      if (moving > 0.35) faceQ.setFromAxisAngle(UP, Math.atan2(vel.x, vel.z));
      else {
        camUp.copy(UP).applyQuaternion(camera.quaternion);
        faceQ.setFromRotationMatrix(lookM.lookAt(camera.position, root.position, camUp));
      }
      root.quaternion.slerp(faceQ, Math.min(1, dt * 6));

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
      body.position.y = arc * 0.55 + Math.sin(t * 1.9) * 0.09;
      body.rotation.z = speaking ? Math.sin(t * 2.4) * 0.07 : 0; // 說話時輕輕搖，平常站直不歪
      body.rotation.x = 0.3 * moving; // 飛行時微微前傾

      // 翅膀：飛行快拍、說話輕拍、平常小幅度
      const beat = moving > 0.1 ? 15 : speaking ? 6 : 2.2;
      const amp = moving > 0.1 ? 0.5 : speaking ? 0.26 : 0.1;
      wing.value = Math.sin(t * beat) * amp + (moving > 0.1 ? 0.1 : 0);
    },
  };
}
