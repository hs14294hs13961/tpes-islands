// 留言與得報心得：存在閱讀島內容表的「留言審核」分頁（同一支 Apps Script）。
// 送出後由學校端判斷：有負面詞、或看不出正面的先「待審」並寄信通知；網站只拿得到「通過」的。
import { SCHOOL } from './islands.js';

const API = SCHOOL.readingApiUrl;
const EMPTY = { comments: {}, reflections: [] };
let cache = null;
let at = 0;

export async function loadSocial(force = false) {
  if (!API) return EMPTY;
  if (!force && cache && Date.now() - at < 60000) return cache;
  try {
    const res = await fetch(`${API}?api=social`, { credentials: 'omit' });
    const json = await res.json();
    if (json && json.comments && Array.isArray(json.reflections)) {
      cache = json;
      at = Date.now();
    }
  } catch { /* 學校端還沒更新，或網路不通：當成還沒有留言 */ }
  return cache || EMPTY;
}

/** 送出一則留言或心得。回傳 'published'（直接公開）或 'pending'（等審核）。 */
export async function postSocial({ action, target, title, role, text }) {
  if (!API) throw new Error('留言功能還沒開放');
  let json;
  try {
    // 用 text/plain 送 JSON，瀏覽器才不會先做跨網域預檢；不帶 Google 登入，避免多帳號時被轉址
    const res = await fetch(API, { method: 'POST', credentials: 'omit', body: JSON.stringify({ action, target, title, role, text }) });
    json = await res.json();
  } catch {
    throw new Error('送不出去，請檢查網路後再試一次');
  }
  if (!json.ok) throw new Error(json.error || '送出失敗');
  if (json.status === 'published') at = 0; // 下次重新讀，自己的留言才看得到
  return json.status;
}

/** 字數：不算空白。 */
export const charCount = (text) => [...String(text).replace(/\s/g, '')].length;
