// 成果資料：向電子書櫃的唯讀介面拿，存一份在瀏覽器；拿不到就用上次存的，再不行才用網站內建的備份。
// 電子書櫃只負責回傳成果清單，班級島的統計都在這裡算，島的分配規則改動時不必重新部署學校端。
import { SCHOOL } from './islands.js';

const CACHE_KEY = 'tpes-islands-records-v1';
const FRESH_MS = 5 * 60 * 1000;      // 5 分鐘內不重抓
const USABLE_MS = 24 * 60 * 60 * 1000; // 一天內的舊資料先顯示，背景更新
const TIMEOUT_MS = 6000;             // GAS 冷啟動較慢，但不能讓人等太久

const GRADE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCache(raw) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), raw }));
  } catch { /* 無痕模式或空間不足：下次重抓就好 */ }
}

async function fetchLive() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SCHOOL.apiUrl, { signal: ctrl.signal });
    const raw = await res.json();
    if (!Array.isArray(raw.records)) throw new Error('資料格式不對');
    writeCache(raw);
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

async function loadRaw() {
  const cached = readCache();
  const age = cached ? Date.now() - cached.at : Infinity;
  if (age < USABLE_MS) {
    if (age > FRESH_MS) fetchLive().catch(() => {}); // 先給舊的，下次進來就是新的
    return cached.raw;
  }
  try {
    return await fetchLive();
  } catch {
    if (cached) return cached.raw;
    const res = await fetch('./src/data/demo.json');
    return res.json();
  }
}

/** 開啟成果時計一次瀏覽（寫進電子書櫃）。不等回應，失敗也不影響看成果。 */
export function countView(id) {
  const url = new URL(SCHOOL.apiUrl);
  url.searchParams.set('api', 'view');
  url.searchParams.set('id', id);
  fetch(url, { mode: 'no-cors', keepalive: true }).catch(() => {});
}

/** 一筆成果屬於哪裡：'hub'（跨年級放本島）或入學學年度（班級跟著屆走）。 */
function homeOf(r) {
  if (r.className.startsWith('跨年級')) return 'hub';
  const m = r.className.match(/^([一二三四五六])年/);
  return m ? Number(r.year) - GRADE[m[1]] + 1 : null;
}

function tally(list) {
  const subjects = {};
  list.forEach((r) => { subjects[r.subject] = (subjects[r.subject] || 0) + 1; });
  const sorted = Object.entries(subjects).sort((a, b) => b[1] - a[1]);
  return { total: list.length, subjects: Object.fromEntries(sorted) };
}

const iso = (d) => String(d).replaceAll('/', '-');

/** 把成果清單整理成島嶼要用的統計。 */
export function summarize(raw) {
  const currentYear = Number(raw.currentYear);
  const asOf = iso(raw.asOf);
  const records = raw.records
    .map((r) => ({ ...r, date: iso(r.date), home: homeOf(r) }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const cohorts = {};
  [...new Set(records.map((r) => r.home))].forEach((h) => {
    if (typeof h === 'number') cohorts[h] = tally(records.filter((r) => r.home === h));
  });
  const weekAgo = new Date(asOf).getTime() - 7 * 864e5;

  return {
    source: raw.source,
    asOf,
    currentYear,
    totals: {
      records: records.length,
      thisYear: records.filter((r) => Number(r.year) === currentYear).length,
      week: records.filter((r) => new Date(r.date).getTime() > weekAgo).length,
    },
    cohorts,
    hub: tally(records.filter((r) => r.home === 'hub')),
    recent: records.slice(0, 12).map((r) => ({ cls: r.className, subject: r.subject, title: r.title, date: r.date })),
    records,
  };
}

export async function loadData() {
  return summarize(await loadRaw());
}

/** 點島或點格子時要列出的成果。 */
export function recordsFor(data, { cluster, tile }) {
  const home = cluster.id === 'hub' ? 'hub' : cluster.entry;
  if (home === undefined) return [];
  const list = data.records.filter((r) => r.home === home);
  if (tile?.subject) return list.filter((r) => r.subject === tile.subject);
  // 校長室、英語村這類沒有對應科目的格子不列成果；班級的教室、成果館列全班
  if (tile && cluster.kind !== 'class') return [];
  return list;
}
