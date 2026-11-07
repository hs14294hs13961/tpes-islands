// 太平小彩蛋的卡片與圖鑑。找到的紀錄存在訪客進度（save.js）的 `egg:<id>`，
// 跳過卡片的再記 `eggshown:<id>`：3D 校園小遊戲過關時只寫 egg:，回到群島才補跳卡片。
import { save } from '../data/save.js';
import { EGGS, HOW_LABEL } from '../data/eggs.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 彩蛋的樣子：奶油色蛋殼、主題色斑點、一圈青綠色緞帶（太平T 的顏色）。沒找到的是灰色問號。 */
export function eggArt(egg, locked = false, size = '') {
  const art = el('span', `egg-art ${size}${locked ? ' locked' : ''}`);
  art.style.setProperty('--egg', locked ? '#c9c4bb' : egg.color);
  art.setAttribute('aria-hidden', 'true');
  if (locked) art.append(el('span', 'egg-q', '?'));
  return art;
}

export function createEggs({ onFound }) {
  const modal = $('egg-modal');
  const body = $('egg-content');
  const queue = [];
  let after = null;

  const found = (egg) => save.seen(`egg:${egg.id}`);
  const count = () => EGGS.filter(found).length;

  function close() {
    modal.hidden = true;
    const next = queue.shift();
    if (next) { card(next, true); return; }
    const run = after;
    after = null;
    run?.();
  }
  $('egg-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  function card(egg, fresh) {
    save.mark(`eggshown:${egg.id}`);
    const box = el('div', 'egg-one');
    if (fresh) box.append(el('p', 'egg-kicker', `找到彩蛋！（${count()}／${EGGS.length}）`));
    box.append(eggArt(egg, false, 'big'), el('h3', 'egg-name', egg.name));
    box.append(el('p', 'egg-how', HOW_LABEL[egg.how]));
    box.append(el('p', egg.story ? 'egg-story' : 'egg-story pending', egg.story || '這顆彩蛋背後的故事，學校正在整理中，敬請期待！'));
    const btns = el('div', 'egg-btns');
    const ok = el('button', 'q-opt primary', '收進圖鑑');
    ok.type = 'button';
    ok.addEventListener('click', close);
    const all = el('button', 'q-opt', '看圖鑑');
    all.type = 'button';
    all.addEventListener('click', () => { modal.hidden = true; book(); });
    btns.append(ok, all);
    box.append(btns);
    body.replaceChildren(box);
    modal.hidden = false;
    ok.focus();
  }

  function book() {
    const box = el('div', 'egg-book');
    box.append(el('h3', 'egg-book-title', `太平小彩蛋圖鑑　${count()}／${EGGS.length}`));
    box.append(el('p', 'egg-book-sub', count() === EGGS.length ? '全部找齊了！你是太平小偵探！' : '點已找到的彩蛋看故事；問號的提示寫在下面。'));
    const grid = el('div', 'egg-grid');
    EGGS.forEach((egg) => {
      const got = found(egg);
      const b = el('button', `egg-cell${got ? '' : ' locked'}`);
      b.type = 'button';
      b.append(eggArt(egg, !got), el('span', 'egg-cell-name', got ? egg.name : '？？？'), el('span', 'egg-cell-hint', got ? HOW_LABEL[egg.how] : egg.hint));
      if (got) b.addEventListener('click', () => card(egg, false));
      else b.disabled = true;
      grid.append(b);
    });
    box.append(grid);
    body.replaceChildren(box);
    modal.hidden = false;
  }

  /** 拿到一顆彩蛋：第一次才跳卡片，回傳是不是第一次。then：卡片關掉後要做的事。 */
  function unlock(id, then) {
    const egg = EGGS.find((e) => e.id === id);
    if (!egg || !save.mark(`egg:${id}`)) return false;
    onFound?.(egg);
    if (!modal.hidden) queue.push(egg);
    else card(egg, true);
    if (then) after = then;
    return true;
  }

  /** 在別處（3D 校園）拿到、還沒看過卡片的彩蛋，補跳出來。 */
  function checkNew() {
    const fresh = EGGS.filter((e) => found(e) && !save.seen(`eggshown:${e.id}`));
    if (!fresh.length) return false;
    onFound?.(fresh[0]);
    fresh.slice(1).forEach((e) => queue.push(e));
    if (modal.hidden) card(fresh[0], true);
    return true;
  }

  return { unlock, checkNew, book, count, found: (id) => save.seen(`egg:${id}`), isOpen: () => !modal.hidden };
}
