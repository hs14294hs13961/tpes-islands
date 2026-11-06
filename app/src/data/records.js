// 成果資料：向電子書櫃的唯讀介面拿，存一份在瀏覽器；拿不到就用上次存的，再不行才用網站內建的備份。
// 電子書櫃只負責回傳成果清單，班級島的統計都在這裡算，島的分配規則改動時不必重新部署學校端。
import { SCHOOL } from './islands.js';
import { loadCached } from './remote.js';

const GRADE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

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
  return summarize(await loadCached({
    key: 'tpes-islands-records-v1',
    url: SCHOOL.apiUrl,
    fallback: './src/data/demo.json',
    isValid: (raw) => Array.isArray(raw.records),
  }));
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
