// 浮在 3D 上的島名牌與格子名牌（CSS2D）。點了會呼叫 onPick，由主程式移動鏡頭。
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { HEX, TOP } from '../scene/kit.js';

const KIND_CLASS = { hub: 'plate-hub', campus: 'plate-campus', class: 'plate-class', reading: 'plate-reading' };

export function createLabels(scene, clusters, onPick) {
  const plates = [];
  const chips = [];

  for (const c of clusters) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `island-plate ${KIND_CLASS[c.kind] || 'plate-small'}`;
    el.innerHTML = `<span class="plate-name"></span><span class="plate-en"></span>`;
    el.querySelector('.plate-name').textContent = c.name;
    el.querySelector('.plate-en').textContent = c.sub || c.en;
    el.addEventListener('click', () => onPick({ cluster: c }));
    const obj = new CSS2DObject(el);
    obj.position.set(c.center.x, c.small ? 6 : 10, c.center.z - HEX * 0.4);
    scene.add(obj);
    plates.push(obj);

    for (const t of c.tiles) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tile-chip';
      chip.innerHTML = '<span class="chip-dot"></span><span class="chip-name"></span><span class="chip-count"></span>';
      chip.querySelector('.chip-name').textContent = t.name;
      const count = chip.querySelector('.chip-count');
      if (t.count === undefined) count.remove();
      else {
        count.textContent = t.count || '·';
        if (t.count) count.classList.add('has');
      }
      chip.addEventListener('click', () => onPick({ cluster: c, tile: t }));
      const o = new CSS2DObject(chip);
      o.position.set(t.pos.x, TOP + 0.4, t.pos.z + HEX * 0.6);
      scene.add(o);
      chips.push(o);
    }
  }

  // 拉遠時藏起格子名牌與人名牌，畫面才不會擠成一團
  const tmp = new THREE.Vector3();
  function update(camera, show, nameTags) {
    for (const o of chips) {
      o.visible = show && camera.position.distanceTo(o.getWorldPosition(tmp)) < 190;
    }
    for (const o of nameTags) {
      o.visible = show && camera.position.distanceTo(o.getWorldPosition(tmp)) < 95;
    }
  }

  return { update, plates, chips };
}
