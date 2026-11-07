// 島民：學生穿太平T、老師與行政穿太平 POLO、叔公穿工作背心。
// 一開始都是暫代造型（PRD 決策 E），Higgsfield 3D 模型下載好就換上，走路邏輯相同。
// 散步路線：每格外圈半徑 3.6 公尺的環形路，走到格子邊再穿到隔壁格。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { box, ball, cyl, TOP, HEX, seeded } from './kit.js';
import { spawnCharacter } from './characters.js';

const TEE = 0xb8e0d3;        // 太平T 海藍色
const SKIN = 0xf2c9a0;
const HAIR = 0x2b2118;
const RING_R = HEX * 0.72;
const MODEL_H = 1.2;         // 3D 模型原始身高（公尺）
// 3D 島民腳下的軟影：全島 50 位都算真影子太重（全身頂點要多畫一次），所有人共用一片圓
const FOOT_SHADOW_GEO = new THREE.CircleGeometry(0.2, 16).rotateX(-Math.PI / 2);
const FOOT_SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
const NAMED = { 黃春嫺: 'principal', 莊紹群: 'director-zhuang', 黃薇: 'teacher-huang', 李易霖: 'clerk' };

// 誰穿哪一款：學生男女各兩款輪流，指定人物用自己的，其他女老師兩款輪流
function modelKeyFor(p, turn) {
  if (p.student) return p.gender === 'f' ? (turn.f++ % 2 ? 'student-f2' : 'student-f1') : (turn.m++ % 2 ? 'student-m3' : 'student-m1');
  if (p.worker) return 'uncle';
  return NAMED[p.name] || (turn.t++ % 2 ? 'teacher-c' : 'teacher-b');
}

function limb(parent, w, h, d, color, x, y) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  box(pivot, w, h, d, color, 0, -h, 0);
  parent.add(pivot);
  return pivot;
}

function makePerson(p, rnd) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const girl = p.gender === 'f';
  const adult = !p.student;
  const bottom = adult ? 0x3b3f4a : girl ? 0x8a3a52 : 0x24325e;

  const legL = limb(body, 0.13, 0.5, 0.15, bottom, -0.09, 0.55);
  const legR = limb(body, 0.13, 0.5, 0.15, bottom, 0.09, 0.55);
  if (girl && !adult) box(body, 0.42, 0.22, 0.28, bottom, 0, 0.42, 0); // 裙子
  box(body, 0.4, 0.46, 0.24, TEE, 0, 0.55, 0);
  if (adult) box(body, 0.22, 0.06, 0.03, 0xffffff, 0, 0.98, 0.12); // POLO 領子
  if (p.worker) box(body, 0.43, 0.38, 0.27, 0xef8a3c, 0, 0.6, 0);  // 工作背心
  if (p.prop === 'clipboard') box(body, 0.2, 0.26, 0.03, 0xd8c8a8, 0.24, 0.55, 0.14);
  if (p.prop === 'book') box(body, 0.22, 0.28, 0.06, 0x5b8ac9, -0.25, 0.55, 0.12);
  const armL = limb(body, 0.1, 0.42, 0.12, TEE, -0.26, 0.98);
  const armR = limb(body, 0.1, 0.42, 0.12, TEE, 0.26, 0.98);

  ball(body, 0.2, SKIN, 0, 1.2, 0, 1);
  const hair = HAIR + Math.floor(rnd() * 3) * 0x080604;
  box(body, 0.38, 0.12, 0.38, p.worker ? 0x5b8ac9 : hair, 0, 1.33, -0.02); // 頭髮或叔公的帽子
  if (girl) box(body, 0.36, 0.32, 0.1, hair, 0, 0.98, -0.16);
  box(body, 0.05, 0.05, 0.02, 0x1d1d1d, -0.07, 1.22, 0.19);
  box(body, 0.05, 0.05, 0.02, 0x1d1d1d, 0.07, 1.22, 0.19);

  const scale = adult ? 1.3 : 0.9 + rnd() * 0.15;
  root.scale.setScalar(scale);
  return { root, body, legL, legR, armL, armR, height: 1.45 * scale };
}

/** onTalk(person)：點了可以說話的大人名牌。 */
export function createPeople(scene, clusters, { onTalk } = {}) {
  const people = [];
  const tags = [];
  const rnd = seeded(2026);
  const turn = { m: 0, f: 0, t: 0 };

  for (const c of clusters) {
    for (const p of c.people || []) {
      const tile = c.tiles[p.tile % c.tiles.length];
      const m = makePerson(p, rnd);
      scene.add(m.root);
      const person = {
        ...m, tile, cluster: c, student: !!p.student,
        modelKey: modelKeyFor(p, turn), tag: null, info: p,
        angle: rnd() * Math.PI * 2,
        speed: p.student ? 1.0 + rnd() * 0.4 : 0.7 + rnd() * 0.2,
        state: 'idle', wait: rnd() * 3, phase: rnd() * 10,
        from: null, to: null, t: 0,
      };
      placeOnRing(person);
      if (!p.student) {
        // 大人的名牌可以點：點了就和他說話
        const el = document.createElement(onTalk ? 'button' : 'div');
        el.className = onTalk ? 'name-tag talk' : 'name-tag';
        el.textContent = p.name ? `${p.role} ${p.name}` : p.role;
        if (onTalk) {
          el.type = 'button';
          el.setAttribute('aria-label', `和${el.textContent}說話`);
          el.addEventListener('click', () => onTalk(person));
        }
        const tag = new CSS2DObject(el);
        tag.position.set(0, m.height / m.root.scale.x + 0.35, 0);
        m.root.add(tag);
        tags.push(tag);
        person.tag = tag;
      }
      people.push(person);
    }
  }

  function ringPoint(tile, angle) {
    return new THREE.Vector3(tile.pos.x + Math.cos(angle) * RING_R, TOP, tile.pos.z + Math.sin(angle) * RING_R);
  }

  function placeOnRing(p) {
    p.root.position.copy(ringPoint(p.tile, p.angle));
  }

  // 決定下一步：沿環形路走一段、穿到隔壁格，或停下來
  function nextMove(p) {
    const r = rnd();
    if (r < 0.25) {
      p.state = 'idle';
      p.wait = 1 + rnd() * 3;
    } else if (r < 0.6 && p.tile.neighbors.length) {
      const nb = p.tile.neighbors[Math.floor(rnd() * p.tile.neighbors.length)];
      const a = Math.atan2(nb.pos.z - p.tile.pos.z, nb.pos.x - p.tile.pos.x);
      p.state = 'arc';
      p.arcTo = a;
      p.after = nb;
    } else {
      p.state = 'arc';
      p.arcTo = p.angle + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 1.6);
      p.after = null;
    }
  }

  let frame = 0;
  function update(dt, time) {
    frame++;
    for (const p of people) {
      let moving = false;
      if (p.state === 'idle') {
        if ((p.wait -= dt) <= 0) nextMove(p);
      } else if (p.state === 'arc') {
        let diff = p.arcTo - p.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const step = (p.speed * dt) / RING_R;
        const prev = p.root.position.clone();
        if (Math.abs(diff) <= step) {
          p.angle = p.arcTo;
          if (p.after) { // 走到格子邊，直線穿到隔壁格
            p.state = 'cross';
            p.from = ringPoint(p.tile, p.angle);
            p.tile = p.after;
            p.angle += Math.PI;
            p.to = ringPoint(p.tile, p.angle);
            p.t = 0;
          } else nextMove(p);
        } else p.angle += Math.sign(diff) * step;
        if (p.state !== 'cross') placeOnRing(p);
        face(p, prev);
        moving = true;
      } else if (p.state === 'cross') {
        const prev = p.root.position.clone();
        p.t = Math.min(1, p.t + (p.speed * dt) / p.from.distanceTo(p.to));
        p.root.position.lerpVectors(p.from, p.to, p.t);
        face(p, prev);
        if (p.t >= 1) nextMove(p);
        moving = true;
      }
      if (p.mixer) { // 3D 模型：走路動作淡入淡出，停下時回到站姿
        p.weight += ((moving ? 1 : 0) - p.weight) * Math.min(1, dt * 6);
        p.walk.setEffectiveWeight(p.weight);
        p.walk.timeScale = p.speed * 0.85;
        // 骨架動作輪流隔一格畫面更新，省一半計算，走路看起來一樣
        p.lag += dt;
        if ((frame + p.phase) % 2 < 1) {
          p.mixer.update(p.lag);
          p.lag = 0;
        }
        continue;
      }
      // 暫代造型：走路擺手擺腳、身體微微彈跳
      const s = moving ? Math.sin((time + p.phase) * 9) * 0.6 : 0;
      p.legL.rotation.x = s;
      p.legR.rotation.x = -s;
      p.armL.rotation.x = -s * 0.8;
      p.armR.rotation.x = s * 0.8;
      p.body.position.y = moving ? Math.abs(Math.cos((time + p.phase) * 9)) * 0.05 : 0;
    }
  }

  function face(p, prev) {
    const d = p.root.position.clone().sub(prev);
    if (d.lengthSq() > 1e-6) p.root.rotation.y = Math.atan2(d.x, d.z);
  }

  // 某一款模型下載好了：穿這款的島民原地換上，位置、方向、名牌都接著用
  function upgrade(key, model) {
    for (const p of people) {
      if (p.modelKey !== key) continue;
      const { root, mixer, walk } = spawnCharacter(model);
      const scale = p.student ? 1.1 + rnd() * 0.12 : 1.42 + rnd() * 0.08;
      root.scale.setScalar(scale);
      root.position.copy(p.root.position);
      root.rotation.copy(p.root.rotation);
      const shadow = new THREE.Mesh(FOOT_SHADOW_GEO, FOOT_SHADOW_MAT);
      shadow.position.y = 0.012;
      root.add(shadow);
      walk.time = rnd() * model.walk.duration; // 錯開步伐，不要大家同手同腳
      if (p.tag) {
        p.tag.position.set(0, MODEL_H + 0.28, 0);
        root.add(p.tag);
      }
      scene.remove(p.root);
      scene.add(root);
      Object.assign(p, { root, mixer, walk, weight: 0, lag: 0, height: MODEL_H * scale });
    }
  }

  /** 說話時停下來、轉向鏡頭。 */
  function hold(p, seconds, toward) {
    p.state = 'idle';
    p.wait = seconds;
    if (toward) p.root.rotation.y = Math.atan2(toward.x - p.root.position.x, toward.z - p.root.position.z);
  }

  return { update, upgrade, hold, tags, count: people.length };
}
