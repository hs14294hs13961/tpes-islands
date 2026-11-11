// 成果預覽視窗下方的留言。只看得到審核通過的；送出後有負面詞或看不出正面的會先待審。
import { loadSocial, postSocial } from '../data/social.js';
import { createCompose } from './compose.js';

const $ = (id) => document.getElementById(id);
const MAX = 80;

export function createComments() {
  const root = $('talk');
  const panel = $('talk-panel');
  const list = $('talk-list');
  const note = $('talk-note');
  let current = null;

  const send = $('talk-send');
  const compose = createCompose({
    min: 2, max: MAX, rows: 2,
    placeholder: '給孩子們一句鼓勵吧（請勿留下姓名、電話）',
    onChange: (ok) => { send.disabled = !ok; },
  });
  $('talk-compose').replaceChildren(compose.root);

  function render(items) {
    $('talk-count').textContent = items.length ? `（${items.length}）` : '';
    list.replaceChildren(...items.map((c) => {
      const li = document.createElement('li');
      const who = document.createElement('span');
      who.className = 'talk-who';
      who.textContent = `一位${c.role}`;
      const text = document.createElement('span');
      text.className = 'talk-text';
      text.textContent = c.text;
      li.append(who, text);
      return li;
    }));
    list.hidden = !items.length;
  }

  async function refresh(force) {
    const id = current?.id;
    const social = await loadSocial(force);
    if (current?.id === id) render(social.comments[id] || []);
  }

  $('talk-toggle').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    $('talk-toggle').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) {
      compose.focus();
      panel.scrollIntoView({ block: 'nearest' });
    }
  });

  send.addEventListener('click', async () => {
    if (!current || !compose.valid()) return;
    send.disabled = true;
    send.textContent = '送出中…';
    note.textContent = '';
    try {
      const status = await postSocial({ action: 'comment', target: current.id, title: current.title, ...compose.value() });
      compose.reset();
      note.textContent = status === 'published' ? '謝謝你的鼓勵！留言已經貼出來了。' : '收到了，謝謝你！老師看過之後就會貼出來。';
      if (status === 'published') refresh(true);
    } catch (err) {
      note.textContent = err.message;
      send.disabled = false;
    } finally {
      send.textContent = '送出留言';
    }
  });

  return {
    show(record) {
      current = record;
      root.hidden = false;
      panel.hidden = true;
      $('talk-toggle').setAttribute('aria-expanded', 'false');
      note.textContent = '';
      compose.reset(true); // 上一件作品打到一半的字和身分不要留到這一件
      send.textContent = '送出留言';
      render([]);
      refresh(false);
    },
    hide() {
      current = null;
      root.hidden = true;
    },
  };
}
