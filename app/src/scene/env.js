// 海、天色、光線與晝夜：清晨／白天／黃昏／夜晚，「即時」依台灣時間自動切換。
// 切換時各項數值在一秒多內慢慢過渡，不會突然跳色。
import * as THREE from 'three';
import { GLOW } from './kit.js';

const PRESETS = {
  dawn: {
    sky: 0xf2cdb4, fog: 0x8fb9bd, hemiSky: 0xffe3cf, hemiGround: 0x6d7f8a, hemi: 1.6,
    sun: 0xffc9a0, sunI: 1.6, sunEl: 0.35, sunAz: -1.1,
    deep: 0x4f8e95, shallow: 0x9fd2c8, halo: 0xc7e6d6, window: 0.2, bulb: 0.3, glow: 0.15,
  },
  day: {
    sky: 0xcfe9ee, fog: 0x7fb3b8, hemiSky: 0xffffff, hemiGround: 0x7a8f86, hemi: 2.0,
    sun: 0xfff6e8, sunI: 2.4, sunEl: 0.95, sunAz: -0.6,
    deep: 0x3f8a92, shallow: 0x8fd3c7, halo: 0xbfe8dc, window: 0, bulb: 0.2, glow: 0,
  },
  dusk: {
    sky: 0xf0a77e, fog: 0x7c8ea3, hemiSky: 0xffc39b, hemiGround: 0x5a5470, hemi: 1.4,
    sun: 0xff9a5c, sunI: 1.7, sunEl: 0.28, sunAz: 1.2,
    deep: 0x3f6f86, shallow: 0x8bb7b9, halo: 0xd8c7b7, window: 0.7, bulb: 1.2, glow: 0.55,
  },
  night: {
    sky: 0x1b2440, fog: 0x1c2b44, hemiSky: 0x5d6fa8, hemiGround: 0x1d2030, hemi: 0.9,
    sun: 0x9db4ff, sunI: 0.55, sunEl: 0.8, sunAz: 0.4,
    deep: 0x16304a, shallow: 0x2f5f74, halo: 0x3e6f80, window: 1.6, bulb: 2.4, glow: 1,
  },
};

const COLOR_KEYS = ['sky', 'fog', 'hemiSky', 'hemiGround', 'sun', 'deep', 'shallow', 'halo'];
const NUM_KEYS = ['hemi', 'sunI', 'sunEl', 'sunAz', 'window', 'bulb', 'glow'];

/** 依台灣時間決定時段。 */
export function liveMode(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Taipei' }).format(date));
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

export function taipeiClock(date = new Date()) {
  return new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Taipei' }).format(date);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,220,150,1)');
  grd.addColorStop(0.4, 'rgba(255,190,110,0.35)');
  grd.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createEnv(scene, { lamps, haloMat, mobile }) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x777777, 2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 400 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  scene.fog = new THREE.Fog(0x7fb3b8, 320, 720);
  scene.background = new THREE.Color(0xcfe9ee);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() },
        uFog: { value: new THREE.Color() },
        uFogNear: { value: 320 },
        uFogFar: { value: 720 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying float vDist;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uDeep, uShallow, uFog;
        uniform float uFogNear, uFogFar;
        varying vec3 vWorld;
        varying float vDist;
        void main() {
          float r = length(vWorld.xz * vec2(0.8, 1.0));
          vec3 c = mix(uShallow, uDeep, smoothstep(25.0, 150.0, r));
          float n = sin(vWorld.x * 0.11 + uTime * 0.6) * sin(vWorld.z * 0.13 - uTime * 0.5)
                  + 0.5 * sin((vWorld.x + vWorld.z) * 0.21 + uTime * 0.9);
          c += vec3(0.05) * smoothstep(0.85, 1.35, n);
          c = mix(c, uFog, smoothstep(uFogNear, uFogFar, vDist));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // 路燈光暈：夜晚才看得到
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  scene.updateMatrixWorld(true);
  for (const bulb of lamps) {
    const s = new THREE.Sprite(glowMat);
    s.scale.set(2.6, 2.6, 1);
    bulb.getWorldPosition(s.position);
    scene.add(s);
  }

  const cur = {};
  const target = {};
  let mode = 'live';
  apply(PRESETS[liveMode()], true);

  function apply(preset, instant = false) {
    for (const k of COLOR_KEYS) {
      target[k] = new THREE.Color(preset[k]);
      if (instant || !cur[k]) cur[k] = target[k].clone();
    }
    for (const k of NUM_KEYS) {
      target[k] = preset[k];
      if (instant || cur[k] === undefined) cur[k] = preset[k];
    }
  }

  function setMode(next) {
    mode = next;
    apply(PRESETS[next === 'live' ? liveMode() : next]);
  }

  let liveCheck = 0;
  function update(dt, time) {
    if (mode === 'live' && (liveCheck -= dt) <= 0) {
      liveCheck = 30;
      apply(PRESETS[liveMode()]);
    }
    const k = Math.min(1, dt * 2.2);
    for (const key of COLOR_KEYS) cur[key].lerp(target[key], k);
    for (const key of NUM_KEYS) cur[key] += (target[key] - cur[key]) * k;

    scene.background.copy(cur.sky);
    scene.fog.color.copy(cur.fog);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.hemi;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    sun.position.setFromSphericalCoords(260, Math.PI / 2 - cur.sunEl, cur.sunAz);
    const u = water.material.uniforms;
    u.uTime.value = time;
    u.uDeep.value.copy(cur.deep);
    u.uShallow.value.copy(cur.shallow);
    u.uFog.value.copy(cur.fog);
    haloMat.color.copy(cur.halo);
    GLOW.window.emissiveIntensity = cur.window;
    GLOW.bulb.emissiveIntensity = cur.bulb;
    glowMat.opacity = cur.glow;
  }

  return { setMode, update, get mode() { return mode; } };
}
