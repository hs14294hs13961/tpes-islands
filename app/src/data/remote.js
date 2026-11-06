// 向學校端的介面拿資料：存一份在瀏覽器，拿不到就用上次存的，再不行才用網站內建的備份。
const FRESH_MS = 5 * 60 * 1000;        // 5 分鐘內不重抓
const USABLE_MS = 24 * 60 * 60 * 1000; // 一天內的舊資料先顯示，背景更新
const TIMEOUT_MS = 6000;               // GAS 冷啟動較慢，但不能讓人等太久

function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeCache(key, raw) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), raw }));
  } catch { /* 無痕模式或空間不足：下次重抓就好 */ }
}

/** url 是空字串時（學校端還沒部署）直接用內建備份；isValid 擋掉格式不對的回應。 */
export async function loadCached({ key, url, fallback, isValid }) {
  const backup = async () => (await fetch(fallback)).json();
  if (!url) return backup();

  const fetchLive = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const raw = await (await fetch(url, { signal: ctrl.signal })).json();
      if (!isValid(raw)) throw new Error('資料格式不對');
      writeCache(key, raw);
      return raw;
    } finally {
      clearTimeout(timer);
    }
  };

  const cached = readCache(key);
  const age = cached ? Date.now() - cached.at : Infinity;
  if (age < USABLE_MS) {
    if (age > FRESH_MS) fetchLive().catch(() => {}); // 先給舊的，下次進來就是新的
    return cached.raw;
  }
  try {
    return await fetchLive();
  } catch {
    return cached ? cached.raw : backup();
  }
}
