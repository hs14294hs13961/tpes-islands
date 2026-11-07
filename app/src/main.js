// 太平群島進入點：讀資料 → 蓋島 → 放人 → 掛介面 → 開始動畫。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/CSS2DRenderer.js';
import { SCHOOL, buildIslandList } from './data/islands.js';
import { loadData } from './data/records.js';
import { loadReading, readingRecords } from './data/reading.js';
import { buildWorld } from './scene/world.js';
import { createEnv } from './scene/env.js';
import { createPeople } from './scene/people.js';
import { loadCharacters } from './scene/characters.js';
import { createLabels } from './ui/labels.js';
import { createHud } from './ui/hud.js';
import { createDialog } from './ui/dialog.js';
import { createGuide } from './ui/guide.js';
import { createQChick } from './scene/qchick.js';
import { createQCat } from './scene/qcat.js';
import { createEggMarkers } from './scene/eggMarkers.js';
import { createEggs } from './ui/eggs.js';
import { createStaffTalk } from './ui/staffTalk.js';
import { loadSocial } from './data/social.js';
import { liveMode } from './scene/env.js';
import { GLOW } from './scene/kit.js';

const mobile = matchMedia('(max-width: 760px)').matches;
const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(mobile ? 40 : 32, innerWidth / innerHeight, 1, 1200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 22;
controls.maxDistance = 380;
controls.maxPolarAngle = 1.25;
controls.screenSpacePanning = false;

const [data, reading] = await Promise.all([loadData(), loadReading()]);
reading.recordCount = readingRecords(data, reading).length;
const islands = buildIslandList(data.currentYear, data, reading);
const world = buildWorld(scene, islands);
const env = createEnv(scene, { lamps: world.lamps, haloMat: world.haloMat, mobile });
const people = createPeople(scene, world.clusters, { onTalk: (p) => talkTo(p) });
loadCharacters(people.upgrade); // 不等模型，先讓島浮出來，下載好的島民再換裝

// ── 鏡頭 ─────────────────────────────────────────────

const bounds = new THREE.Box3();
world.clusters.filter((c) => !c.small).forEach((c) => bounds.expandByPoint(c.center));
const home = { target: bounds.getCenter(new THREE.Vector3()).setY(0), dist: 175, polar: 0.82 };
home.target.z += 12; // 校園島最南端的校門要露在下方訊息框之上

// 直式手機畫面窄，鏡頭要拉遠到左右的島都放得進來
function fitHome() {
  const halfWidth = (bounds.max.x - bounds.min.x) / 2 + 14;
  const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  home.dist = Math.min(controls.maxDistance, Math.max(175, halfWidth / Math.tan(hfov / 2)));
}
fitHome();

let fly = null;
function flyTo(target, dist, polar = 0.9, azimuth = null) {
  const offset = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  const toPos = target.clone().add(new THREE.Vector3().setFromSphericalCoords(dist, polar, azimuth ?? sph.theta));
  fly = { t: 0, fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget: target.clone() };
}

function goHome(instant = false) {
  const pos = home.target.clone().add(new THREE.Vector3().setFromSphericalCoords(home.dist, home.polar, 0));
  if (instant) {
    camera.position.copy(pos);
    controls.target.copy(home.target);
  } else flyTo(home.target, home.dist, home.polar, 0);
}
goHome(true);

function pick({ cluster, tile }) {
  if (tile) flyTo(tile.pos.clone().setY(1), mobile ? 50 : 38, 0.95);
  else flyTo(cluster.center.clone().setY(1), cluster.small ? 40 : cluster.radius * 3.2 + 20, 0.9);
  hud.showInfo({ cluster, tile });
  guide.enterIsland(cluster);
}

// 導覽用：鏡頭飛到島上，但不打開資訊卡
function focus(cluster) {
  flyTo(cluster.center.clone().setY(1), cluster.small ? 40 : cluster.radius * 3.2 + 20, 0.9);
  qchick.moveTo(cluster.center, cluster.radius);
}

// ── 介面 ─────────────────────────────────────────────

const labels = createLabels(scene, world.clusters, pick);
let showNames = true;
let paused = false;

const residents = islands.reduce((n, c) => n + (c.people || []).filter((p) => !p.guest).length, 0);
const hud = createHud({
  school: SCHOOL,
  data,
  reading,
  residents,
  onGo: (clusterId, tileIndex) => {
    const cluster = world.clusters.find((c) => c.id === clusterId);
    pick({ cluster, tile: tileIndex === undefined ? undefined : cluster.tiles[tileIndex] });
  },
  onTime: (m) => env.setMode(m),
  onToggle: (key, on) => {
    if (key === 'names') showNames = on;
    if (key === 'pause') paused = on;
  },
  onHome: () => { birdOff(); qchick.leave(); goHome(); },
  onButler: () => guide.menu(),
  getSocial: () => social,
  onBird: (on) => {
    if (on) {
      controls.minPolarAngle = 0;
      flyTo(home.target, home.dist * 1.25, 0.02, 0);
    } else goHome();
  },
});

const qchick = createQChick(scene, { camera, controls });
const dialog = createDialog({ onOpen: () => qchick.speak(true), onClose: () => qchick.speak(false) });
const eggs = createEggs({ onFound: () => qchick.hop() });
const guide = createGuide({ dialog, qchick, hud, data, reading, clusters: world.clusters, pick, focus, goHome, eggs });

// 教職員、太平Q喵、藏在島上的彩蛋
const qcat = createQCat(scene, { camera });
const isNight = () => (env.mode === 'live' ? liveMode() : env.mode) === 'night';
const eggMarkers = createEggMarkers(scene, world.clusters, { isFound: (id) => eggs.found(id), isNight });
const staff = createStaffTalk({ dialog, eggs, qcat, reading, clusters: world.clusters, mapUrl: SCHOOL.mapUrl, pick });
let social = { comments: {}, reflections: [] };
loadSocial().then((s) => { social = s; });

function talkTo(person) {
  hud.closeInfo();
  const at = person.root.position;
  flyTo(at.clone().setY(1.5), mobile ? 26 : 20, 1.05);
  people.hold(person, 14, camera.position);
  staff.talk(person);
}

// 從 3D 校園小遊戲回來：補跳那邊拿到的彩蛋
addEventListener('visibilitychange', () => { if (!document.hidden) eggs.checkNew(); });

function birdOff() {
  document.getElementById('btn-bird').classList.remove('on');
}

// 點地面也能選格子（拖曳轉視角時不算點擊）
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (qchick.hit(ray)) { guide.menu(); return; }
  if (qcat.hit(ray)) { staff.meetCat(); return; }
  const egg = eggMarkers.hit(ray);
  if (egg) { eggs.unlock(egg); return; }
  const hit = ray.intersectObjects(world.pickables, false)[0];
  if (!hit) return;
  const { cluster, tile } = hit.object.userData.pick;
  const c = world.clusters.find((x) => x.id === cluster);
  pick({ cluster: c, tile: c.tiles[tile] });
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  fitHome();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ── 動畫 ─────────────────────────────────────────────

const clock = new THREE.Clock();
let simTime = 0;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const viewerEl = document.getElementById('viewer');

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!viewerEl.hidden) return; // 看成果時 3D 先停，手機才不會同時撐兩邊
  if (!paused) simTime += dt;

  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.3);
    const k = ease(fly.t);
    camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, k);
    if (fly.t >= 1) {
      fly = null;
      if (!document.getElementById('btn-bird').classList.contains('on')) controls.minPolarAngle = 0.15;
    }
  }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -110, 110);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -100, 100);
  controls.update();

  env.update(dt, simTime);
  if (!paused) people.update(dt, simTime);
  qchick.update(dt, clock.elapsedTime);
  qcat.update(dt, clock.elapsedTime);
  eggMarkers.update(clock.elapsedTime, camera);
  for (const f of world.flames) f.scale.y = 1 + Math.sin(simTime * 12 + f.id) * 0.15;
  GLOW.fire.emissiveIntensity = 0.7 + Math.sin(simTime * 9) * 0.15;
  labels.update(camera, showNames, people.tags);

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

hud.ready();
guide.start();
setTimeout(() => eggs.checkNew(), 1500);
