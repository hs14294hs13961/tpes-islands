// 閱讀島的資訊卡內容：月份切換，加上每一格各自的內容（書單、問題卡、文章、學習單、活動、成果）。
// 一律用 createElement 放文字：內容表是老師填的，不當成 HTML。
import { readingRecords } from '../data/reading.js';
import { FAMILIES } from '../data/families.js';

const GRADE_NAME = ['', '一', '二', '三', '四', '五', '六'];

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

const fmt = (iso) => iso.slice(5).replace('-', '/').replace(/^0/, '').replace(/\/0/, '/');

function monthStatus(m) {
  const today = new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10);
  if (today < m.start) return '即將開展';
  return today > m.end ? '已結束' : '展出中';
}

/** 回傳 render(cluster, tile)，把內容畫進 root。 */
export function createReadingPanel({ root, reading, openDoc, recordCard, onGoTile, getSocial }) {
  let monthIndex = reading.current;
  let grade = 0;
  let current = null;
  let allMonths = true; // 成果廊預設看全部月份，切換月份才篩

  function gradeChips() {
    const row = el('div', 'read-chips');
    [0, 1, 2, 3, 4, 5, 6].forEach((g) => {
      const b = el('button', `read-chip${g === grade ? ' on' : ''}`, g ? `${GRADE_NAME[g]}年級` : '全部');
      b.type = 'button';
      b.addEventListener('click', () => { grade = g; render(); });
      row.append(b);
    });
    return row;
  }

  function monthBar(m) {
    const bar = el('div', 'read-month');
    const step = (d, label) => {
      const b = el('button', 'read-step', label);
      b.type = 'button';
      b.setAttribute('aria-label', d < 0 ? '上一個月' : '下一個月');
      b.disabled = !reading.months[monthIndex + d];
      b.addEventListener('click', () => { monthIndex += d; allMonths = false; render(); });
      return b;
    };
    const title = el('div', 'read-month-title');
    const dot = el('span', 'read-dot');
    dot.style.background = m.color;
    title.append(dot, el('b', '', `${m.month} 月・SDG ${m.sdg}`), el('span', 'read-status', monthStatus(m)));
    bar.append(step(-1, '‹'), title, step(1, '›'));
    return bar;
  }

  function row(title, meta, { url, tag } = {}) {
    const clickable = !!url;
    const r = el(clickable ? 'button' : 'div', 'read-row');
    if (clickable) {
      r.type = 'button';
      r.addEventListener('click', () => openDoc({ title, meta, url }));
    }
    const body = el('span', 'read-row-body');
    body.append(el('span', 'read-row-title', title));
    if (meta) body.append(el('span', 'read-row-meta', meta));
    r.append(body);
    if (tag) r.append(el('span', `read-tag${tag === '必讀' ? ' must' : ''}`, tag));
    if (clickable) r.append(el('span', 'read-go', '›'));
    return r;
  }

  const empty = (text) => el('p', 'read-empty', text);

  const sections = {
    // 主題書展館（也是點島名時看到的總覽）：主題、展期、一句話，下面是到各格的捷徑
    hall(m, box) {
      box.append(el('h3', 'read-theme', m.theme));
      box.append(el('p', 'read-dates', `展期 ${fmt(m.start)}～${fmt(m.end)}`));
      box.append(el('p', 'read-blurb', m.blurb));
      const docs = [['三折頁', m.links?.trifold], ['書單', m.links?.booklist], ['全校成果月報', m.links?.report], ['開閉幕簡報', m.links?.slides]];
      docs.filter(([, u]) => u).forEach(([n, u]) => box.append(row(n, `${m.month} 月主題書展`, { url: u })));
      (m.extras || []).forEach((x) => box.append(row(x.name, '延伸資源', { url: x.url })));
      const go = (name, sub, index) => {
        const b = el('button', 'read-row');
        b.type = 'button';
        const body = el('span', 'read-row-body');
        body.append(el('span', 'read-row-title', name), el('span', 'read-row-meta', sub));
        b.append(body, el('span', 'read-go', '›'));
        b.addEventListener('click', () => onGoTile(index));
        box.append(b);
      };
      box.append(el('p', 'read-sub', '這個月可以做什麼'));
      go('看書單', `${m.books.filter((b) => b.required).length} 本必讀、${m.books.filter((b) => !b.required).length} 本選讀`, 1);
      go('想一想問題卡', '每個年級兩題，答案投進圖書館摸彩箱', 2);
      if (m.articles.length) go('讀得報文章', `${m.articles.length} 篇選讀`, 3);
      go('看四大家族與活動', `${m.events.length} 場活動`, 5);
    },
    books(m, box) {
      box.append(gradeChips());
      const list = m.books.filter((b) => !grade || !b.grades.length || b.grades.includes(grade));
      list.sort((a, b) => b.required - a.required);
      list.forEach((b) => box.append(row(b.title, [b.publisher, b.level].filter(Boolean).join('・'), { tag: b.required ? '必讀' : '選讀' })));
      if (m.links?.booklist) box.append(row('完整書目表', 'PDF', { url: m.links.booklist }));
    },
    questions(m, box) {
      box.append(el('p', 'read-note', '讀完必讀書，把想法寫在答案卡上，投進圖書館的摸彩箱！'));
      box.append(gradeChips());
      const list = m.questions.filter((q) => !grade || q.grade === grade);
      list.forEach((q) => {
        const c = el('div', 'read-card');
        c.append(el('span', 'read-card-tag', `${GRADE_NAME[q.grade]}年級・問題${q.no === 1 ? '一' : '二'}`), el('span', 'read-card-text', q.text));
        box.append(c);
      });
    },
    articles(m, box) {
      if (!m.articles.length) { box.append(empty('這個月沒有選讀文章。')); return; }
      box.append(el('p', 'read-note', '得報的文章會出現在閉幕的 Hi-teach 挑戰賽喔！點了會開啟得報。'));
      m.articles.forEach((a) => {
        const meta = [a.issue && `第 ${a.issue} 期`, '★'.repeat(a.stars || 0)].filter(Boolean).join('・');
        box.append(row(a.title, meta, { url: a.url }));
      });
      // 大家的心得（找五甲黃薇老師寫的，審核通過才會出現）
      const urls = new Set(m.articles.map((a) => a.url));
      const mine = (getSocial?.().reflections || []).filter((r) => urls.has(r.target));
      box.append(el('p', 'read-sub', '大家的得報心得'));
      if (!mine.length) box.append(empty('還沒有心得。到五年甲班的島找黃薇老師，抽一篇文章來寫吧！'));
      mine.forEach((r) => {
        const c = el('div', 'read-card');
        c.append(el('span', 'read-card-tag', `一位${r.role}・讀〈${r.title}〉`), el('span', 'read-card-text', r.text));
        box.append(c);
      });
    },
    sheets(_m, box) {
      reading.worksheets.forEach((w) => box.append(row(w.name, w.url ? w.level : `${w.level}・檔案整理中`, { url: w.url })));
    },
    events(m, box) {
      const families = el('div', 'read-families');
      FAMILIES.forEach((f) => {
        const card = el('div', 'read-family');
        const pic = el('img', 'read-family-pic');
        pic.src = f.image;
        pic.alt = '';
        pic.style.borderColor = f.banner;
        const name = el('b', '', f.name);
        name.style.color = f.banner;
        card.append(pic, name, el('span', 'read-family-slogan', f.slogan));
        families.append(card);
      });
      box.append(families, el('p', 'read-sub', '這個月的活動'));
      m.events.forEach((e) => {
        const r = el('div', 'read-event');
        const body = el('div', 'read-row-body');
        body.append(el('span', 'read-row-title', e.name));
        if (e.note) body.append(el('span', 'read-row-meta', e.note));
        r.append(el('span', 'read-event-date', e.date), body);
        box.append(r);
      });
      if (m.links?.slides) box.append(row('開閉幕簡報', '投影片', { url: m.links.slides }));
    },
    gallery(m, box, data) {
      const all = el('button', `read-chip${allMonths ? ' on' : ''}`, '全部月份');
      all.type = 'button';
      all.addEventListener('click', () => { allMonths = true; render(); });
      const one = el('button', `read-chip${allMonths ? '' : ' on'}`, `${m.month} 月`);
      one.type = 'button';
      one.addEventListener('click', () => { allMonths = false; render(); });
      const chips = el('div', 'read-chips');
      chips.append(all, one);
      box.append(chips, gradeChips());
      const list = readingRecords(data, reading, { month: allMonths ? null : m, grade });
      box.append(el('p', 'read-note', `${list.length} 件成果`));
      if (list.length) list.forEach((r) => box.append(recordCard(r)));
      else box.append(empty('這裡還沒有成果，老師上傳到電子書櫃後就會出現。'));
    },
  };

  let dataRef = null;
  function render() {
    if (!current) return;
    const m = reading.months[monthIndex];
    const key = current.tile?.section || 'hall';
    root.replaceChildren();
    if (key !== 'sheets') root.append(monthBar(m));
    const box = el('div', 'read-body');
    sections[key](m, box, dataRef);
    root.append(box);
    box.scrollTop = 0;
  }

  return {
    show(tile, data) {
      dataRef = data;
      current = { tile };
      render();
    },
  };
}
