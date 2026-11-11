// 太平小彩蛋的卡片與圖鑑。找到的紀錄存在訪客進度（save.js）的 `egg:<id>`，
// 跳過卡片的再記 `eggshown:<id>`：3D 校園小遊戲過關時只寫 egg:，回到群島才補跳卡片。
import { save } from '../data/save.js';
import { EGGS, HOW_LABEL, eggCode, readEggCode } from '../data/eggs.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** 彩蛋的樣子：設計稿切出來的圖（public/eggs/<id>.png，奶油色蛋殼＋青綠緞帶＋各自的圖案）。
 *  沒找到的只顯示灰色剪影和問號；圖讀不到時退回 CSS 畫的蛋。 */
export function eggArt(egg, locked = false, size = '') {
  const art = el('span', `egg-art has-img ${size}${locked ? ' locked' : ''}`);
  art.style.setProperty('--egg', locked ? '#c9c4bb' : egg.color);
  art.setAttribute('aria-hidden', 'true');
  const img = el('img', 'egg-img');
  img.src = `./public/eggs/${egg.id}.png`;
  img.alt = '';
  img.decoding = 'async';
  img.addEventListener('error', () => { img.remove(); art.classList.remove('has-img'); });
  art.append(img);
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

  // 圖鑑最下面：我的彩蛋代碼（抄下來）＋輸入代碼拿回彩蛋。紀錄只在這台裝置上，代碼是唯一的備份。
  function keeper(note = '') {
    const box = el('div', 'egg-keep');
    if (count()) {
      box.append(el('p', 'egg-keep-title', '我的彩蛋代碼'), el('p', 'egg-code', eggCode(found)));
      box.append(el('p', 'egg-keep-note', '把代碼抄下來！換一台平板、或是哪天紀錄不見了，在下面輸入代碼就能把彩蛋拿回來。每多找到一顆，代碼就會變。'));
    } else {
      box.append(el('p', 'egg-keep-title', '以前找過彩蛋嗎？'), el('p', 'egg-keep-note', '輸入你抄下來的彩蛋代碼，就能把彩蛋拿回來。'));
    }
    const form = el('form', 'egg-keep-form');
    const input = el('input');
    input.type = 'text';
    input.maxLength = 9;
    input.placeholder = '輸入彩蛋代碼';
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.setAttribute('aria-label', '輸入彩蛋代碼');
    const go = el('button', 'q-opt', '拿回彩蛋');
    go.type = 'submit';
    const msg = el('p', 'egg-keep-msg', note);
    msg.setAttribute('aria-live', 'polite');
    form.append(input, go, msg);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const list = readEggCode(input.value);
      if (!list) { msg.textContent = '代碼不對喔，再對一次看看（一共 6 個字）。'; return; }
      // 只會加、不會減：代碼裡沒有的彩蛋，這台裝置上原本拿到的照樣留著
      const fresh = list.filter((egg) => save.mark(`egg:${egg.id}`));
      list.forEach((egg) => save.mark(`eggshown:${egg.id}`));
      if (fresh.length) onFound?.(fresh[0]);
      book(fresh.length ? `拿回 ${fresh.length} 顆彩蛋了！` : '這些彩蛋你都已經有了。');
    });
    box.append(form);
    return box;
  }

  function book(note) {
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
    box.append(grid, keeper(note));
    body.replaceChildren(box);
    modal.hidden = false;
  }

  /** 拿到一顆彩蛋：第一次才跳卡片，回傳是不是第一次。then：卡片關掉後要做的事。 */
  function unlock(id, then) {
    const egg = EGGS.find((e) => e.id === id);
    if (!egg || !save.mark(`egg:${id}`)) return false;
    navigator.storage?.persist?.().catch(() => {}); // 請瀏覽器盡量別清掉紀錄（不保證，所以還是要抄代碼）
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
