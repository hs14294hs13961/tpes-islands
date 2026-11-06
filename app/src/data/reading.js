// 閱讀島的內容：每月主題書展的書單、問題卡、文章、活動。來源是一張 Google 試算表（閱讀島內容表），
// 學校端還沒部署時用內建的 reading.json。學生成果則沿用電子書櫃，這裡只負責把它們分到各月。
import { SCHOOL } from './islands.js';
import { loadCached } from './remote.js';

const taipeiToday = () => new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10);

export async function loadReading() {
  const raw = await loadCached({
    key: 'tpes-islands-reading-v1',
    url: SCHOOL.readingApiUrl && `${SCHOOL.readingApiUrl}?api=reading`,
    fallback: './src/data/reading.json',
    isValid: (r) => Array.isArray(r.months) && r.months.length > 0,
  });
  const months = [...raw.months].sort((a, b) => (a.start < b.start ? -1 : 1));
  // 目前的書展：最後一個已開幕的；都還沒開幕就顯示第一個
  const started = months.filter((m) => m.start <= taipeiToday());
  const current = Math.max(0, started.length - 1);
  return { ...raw, months, current };
}

/** 這筆成果是閱讀課程的成果嗎？「太平歲閱」一定是，其他科目看標題。 */
const isReading = (r) => r.subject === '太平歲閱' || /書展|閱讀/.test(r.title);

// 書名取冒號前的部分，才比得到老師簡寫的標題
const shortTitle = (t) => t.split(/[：（]/)[0].replace(/[！？!?]/g, '');

/** 這筆成果屬於哪個月的書展：先看標題有沒有寫 SDG、月份、書名，都沒有才看上傳日期。 */
function monthOf(r, months) {
  const sdg = r.title.match(/SDGs?\s*(\d+)/i)?.[1];
  const named = r.title.match(/(\d{1,2})\s*月/)?.[1];
  return months.find((m) => String(m.sdg) === sdg)
    || months.find((m) => String(m.month) === named)
    || months.find((m) => m.books.some((b) => shortTitle(b.title).length >= 4 && r.title.includes(shortTitle(b.title))))
    || [...months].reverse().find((m) => m.start <= r.date);
}

const GRADE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

/** 閱讀成果廊的清單。month 省略＝全部；grade 是當時的年級（看班級名稱）。 */
export function readingRecords(data, reading, { month, grade } = {}) {
  return data.records.filter((r) => {
    if (!isReading(r)) return false;
    if (month && monthOf(r, reading.months) !== month) return false;
    if (grade && GRADE[r.className[0]] !== grade) return false;
    return true;
  });
}
