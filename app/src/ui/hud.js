// 畫面上的介面：品牌卡、統計數字、時段、工具列、小管家、格子資訊卡。
import { taipeiClock } from '../scene/env.js';

const $ = (id) => document.getElementById(id);

function rocDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y - 1911}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

export function createHud({ school, data, residents, onTime, onToggle, onHome, onBird }) {
  $('brand-sub').textContent = data.source === 'demo'
    ? `示範資料・成果截至 ${rocDate(data.asOf)}`
    : `即時・${rocDate(data.asOf)} 更新`;
  $('upload-link').href = school.uploadUrl;

  const stats = [
    [residents, '島民'],
    [data.totals.records, '累計成果'],
    [data.totals.thisYear, `${data.currentYear} 學年成果`],
    [data.totals.week, '本週新成果'],
  ];
  $('stats').innerHTML = stats.map(([n, l]) => `<div class="stat"><b>${n.toLocaleString()}</b><span>${l}</span></div>`).join('');

  // 時段
  const timeBtns = [...document.querySelectorAll('[data-time]')];
  const liveBtn = timeBtns.find((b) => b.dataset.time === 'live');
  const tick = () => { liveBtn.querySelector('.clock').textContent = taipeiClock(); };
  tick();
  setInterval(tick, 20000);
  timeBtns.forEach((b) => b.addEventListener('click', () => {
    timeBtns.forEach((x) => x.classList.toggle('on', x === b));
    onTime(b.dataset.time);
  }));

  // 工具列
  document.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    onToggle(b.dataset.toggle, on);
  }));
  $('btn-home').addEventListener('click', onHome);
  $('btn-bird').addEventListener('click', () => {
    const on = !$('btn-bird').classList.contains('on');
    $('btn-bird').classList.toggle('on', on);
    onBird(on);
  });

  // 小管家：輪播最新上架的成果
  const lines = [
    '歡迎來到太平群島！拖曳畫面轉一轉，點島名就能飛過去。',
    ...data.recent.map((r) => `${r.cls}・${r.subject}：〈${r.title}〉上架了（${rocDate(r.date)}）`),
  ];
  let li = 0;
  const say = () => {
    const el = $('butler-text');
    el.classList.remove('show');
    setTimeout(() => { el.textContent = lines[li++ % lines.length]; el.classList.add('show'); }, 250);
  };
  say();
  setInterval(say, 7000);

  // 格子資訊卡（P2 會擴充成完整側欄：成果卡片＋預覽）
  const card = $('info-card');
  $('info-close').addEventListener('click', () => card.classList.remove('open'));
  function showInfo({ cluster, tile }) {
    $('info-island').textContent = cluster.en ? `${cluster.name}・${cluster.en}` : cluster.name;
    $('info-title').textContent = tile ? tile.name : cluster.name;
    const bits = [];
    if (tile?.count !== undefined) bits.push(`${tile.count} 件成果`);
    if (!tile && cluster.total !== undefined) bits.push(`共 ${cluster.total} 件成果`);
    if (cluster.sub) bits.push(cluster.sub);
    $('info-meta').textContent = bits.join('・');
    $('info-desc').textContent = cluster.tagline || '';
    card.classList.add('open');
  }

  function ready() {
    $('loading').classList.add('done');
  }

  return { showInfo, ready };
}
