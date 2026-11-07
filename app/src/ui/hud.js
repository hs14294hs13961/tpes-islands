// 畫面上的介面：品牌卡、統計數字、時段、工具列、小管家、格子資訊卡。
import { taipeiClock } from '../scene/env.js';
import { recordsFor, countView } from '../data/records.js';
import { createReadingPanel } from './readingPanel.js';
import { createComments } from './comments.js';

const $ = (id) => document.getElementById(id);

function rocDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y - 1911}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

export function createHud({ school, data, reading, residents, onGo, onTime, onToggle, onHome, onBird, onButler, getSocial }) {
  $('brand-sub').textContent = data.source === 'demo'
    ? `備份資料・成果截至 ${rocDate(data.asOf)}`
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

  // 右下角的太平Q雞：只在打開頁面時說一句，之後收成頭像，點了才打開選單
  ['wave', 'happy', 'think', 'wow'].forEach((f) => { new Image().src = `./public/qchick/${f}.png`; });
  let butlerTimer = null;
  function butlerSay({ face, text }) {
    const el = $('butler');
    $('butler-face').src = `./public/qchick/${face}.png`;
    $('butler-text').textContent = text;
    el.classList.remove('compact');
    clearTimeout(butlerTimer);
    butlerTimer = setTimeout(() => el.classList.add('compact'), 12000);
  }
  $('butler').addEventListener('click', onButler);

  // 成果預覽：PDF、影片用 Drive／YouTube 內嵌，圖片直接顯示，外部連結另開分頁
  const TYPE_LABEL = { pdf: 'PDF', 圖片: '圖片', 影片: '影片', 音檔: '音檔', YouTube: '影片', 連結: '連結' };
  const canEmbed = (url) => /^https:\/\/(drive\.google\.com|www\.youtube\.com)\//.test(url || '');
  const isHttps = (url) => /^https:\/\//.test(url || '');
  const viewer = $('viewer');
  const metaOf = (r) => `${rocDate(r.date)}・${r.className}・${r.subject}`;

  const comments = createComments();
  function closeViewer() {
    viewer.hidden = true;
    comments.hide();
    $('viewer-body').replaceChildren(); // 移除內嵌框，影片才會停
  }
  function openRecord(r) {
    countView(r.id);
    if (!canEmbed(r.embedUrl)) { // 外部連結：多半不允許內嵌
      if (isHttps(r.url)) window.open(r.url, '_blank', 'noopener');
      return;
    }
    $('viewer-meta').textContent = metaOf(r);
    $('viewer-title').textContent = r.title;
    $('viewer-desc').textContent = r.desc || '';
    $('viewer-desc').hidden = !r.desc;
    $('viewer-open').href = `${school.uploadUrl}?id=${encodeURIComponent(r.id)}`;
    let el;
    if (r.type === '圖片') {
      el = document.createElement('img');
      el.src = r.embedUrl;
      el.alt = r.title;
      el.referrerPolicy = 'no-referrer';
    } else {
      el = document.createElement('iframe');
      el.src = r.embedUrl;
      el.title = r.title;
      el.allow = 'autoplay; fullscreen';
      el.referrerPolicy = 'no-referrer';
    }
    $('viewer-body').replaceChildren(el);
    comments.show(r);
    viewer.hidden = false;
  }
  // 閱讀島的文件：雲端硬碟、YouTube 在站內預覽，其他網站（得報、教材包）另開分頁
  function embedUrlOf(url) {
    const yt = url.match(/youtube\.com\/watch\?v=([\w-]+)/)?.[1];
    if (yt) return `https://www.youtube.com/embed/${yt}`;
    if (/^https:\/\/drive\.google\.com\/file\/d\//.test(url)) return url.replace(/\/(view|edit).*$/, '/preview');
    if (/^https:\/\/docs\.google\.com\/(document|presentation|spreadsheets)\//.test(url)) return url.replace(/\/(edit|view|pub).*$/, '/preview');
    return null;
  }
  function openDoc({ title, meta, url }) {
    const embed = embedUrlOf(url);
    if (!embed) {
      if (isHttps(url)) window.open(url, '_blank', 'noopener');
      return;
    }
    $('viewer-meta').textContent = meta || '';
    $('viewer-title').textContent = title;
    $('viewer-desc').hidden = true;
    $('viewer-open').href = url;
    const el = document.createElement('iframe');
    el.src = embed;
    el.title = title;
    el.allow = 'autoplay; fullscreen';
    el.referrerPolicy = 'no-referrer';
    $('viewer-body').replaceChildren(el);
    viewer.hidden = false;
  }
  $('viewer-close').addEventListener('click', closeViewer);
  viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !viewer.hidden) closeViewer(); });

  function recordCard(r) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rec';
    const thumb = document.createElement('span');
    thumb.className = 'rec-thumb';
    thumb.textContent = TYPE_LABEL[r.type] || '成果';
    if (isHttps(r.thumb)) {
      const img = document.createElement('img');
      img.src = r.thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.remove()); // 縮圖拿不到就留類型文字
      thumb.append(img);
    }
    const body = document.createElement('span');
    body.className = 'rec-body';
    const title = document.createElement('span');
    title.className = 'rec-title';
    title.textContent = r.title;
    const meta = document.createElement('span');
    meta.className = 'rec-meta';
    meta.textContent = `${rocDate(r.date)}・${r.subject}・${TYPE_LABEL[r.type] || r.type}`;
    body.append(title, meta);
    b.append(thumb, body);
    b.addEventListener('click', () => openRecord(r));
    return b;
  }

  // 格子資訊卡：說明＋這一格的成果卡片
  const card = $('info-card');
  $('info-close').addEventListener('click', () => card.classList.remove('open'));
  $('info-more').href = school.uploadUrl;
  const readingPanel = createReadingPanel({
    root: $('read-panel'),
    reading,
    openDoc,
    recordCard,
    onGoTile: (index) => onGo('reading', index),
    getSocial,
  });
  function qNote({ face, text }) {
    $('info-q-face').src = `./public/qchick/${face}.png`;
    $('info-q-text').textContent = text;
    $('info-q').hidden = false;
  }
  function showInfo({ cluster, tile }) {
    $('info-q').hidden = true;
    const isReading = cluster.id === 'reading';
    card.classList.toggle('reading', isReading);
    $('read-panel').hidden = !isReading;
    if (isReading) {
      $('info-island').textContent = `${cluster.name}・${cluster.en}`;
      $('info-title').textContent = tile ? tile.name : cluster.name;
      $('info-meta').textContent = '';
      $('info-desc').textContent = tile ? '' : cluster.tagline;
      $('info-records').hidden = true;
      $('info-more').hidden = tile?.section !== 'gallery';
      $('info-link').hidden = true;
      readingPanel.show(tile, data);
      card.classList.add('open');
      return;
    }
    $('info-island').textContent = cluster.en ? `${cluster.name}・${cluster.en}` : cluster.name;
    $('info-title').textContent = tile ? tile.name : cluster.name;
    const bits = [];
    const list = recordsFor(data, { cluster, tile });
    if (list.length) bits.push(`${list.length} 件成果`);
    if (cluster.sub) bits.push(cluster.sub);
    $('info-meta').textContent = bits.join('・');
    $('info-desc').textContent = tile?.desc || cluster.tagline || '';
    const box = $('info-records');
    box.replaceChildren(...list.map(recordCard));
    box.scrollTop = 0;
    box.hidden = !list.length;
    $('info-more').hidden = !list.length;
    // 地標之間的捷徑：太平歲閱館、閱讀角都能直接到閱讀島
    const link = tile?.link || (!tile && cluster.link);
    $('info-link').hidden = !link;
    if (link) {
      $('info-link').textContent = link.map ? link.label : `${link.label} ›`;
      $('info-link').onclick = () => (link.map ? window.open(school.mapUrl, '_blank', 'noopener') : onGo(link.cluster));
    }
    card.classList.add('open');
  }

  function ready() {
    $('loading').classList.add('done');
  }

  return { showInfo, ready, butlerSay, qNote, openRecord, closeInfo: () => card.classList.remove('open') };
}
