// 訪客進度：存在瀏覽器，不要帳號、不收個資。共用平板可以各選一格，進度才不會混在一起。
// 只記「發生過什麼」（看過開場、逛過哪座島），G米花、之後的彩蛋與任務都讀這份紀錄。
const KEY = 'tpes-islands-save-v1';
export const SLOT_COUNT = 3;

const blank = () => ({ slot: 0, quiet: false, slots: Array.from({ length: SLOT_COUNT }, () => ({})) });

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.slots) && s.slots.length === SLOT_COUNT && s.slots[s.slot]) return s;
  } catch { /* 無痕模式或資料壞了：當成新訪客 */ }
  return blank();
}

const state = read();

// 3D 校園小遊戲（同網域另一個分頁）過關會直接寫彩蛋進來：重新讀一次，免得之後存檔把它蓋掉
addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  const next = read();
  state.slot = next.slot;
  state.quiet = next.quiet;
  state.slots = next.slots;
});

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* 存不了就只記到關頁為止 */ }
}

export const save = {
  seen: (event) => event in state.slots[state.slot],
  /** 記下一件事，回傳是不是第一次。 */
  mark(event) {
    if (save.seen(event)) return false;
    state.slots[state.slot][event] = Date.now();
    write();
    return true;
  },
  /** 某一格裡有幾件以 prefix 開頭的事（例如逛過幾座島）。 */
  count: (prefix, slot = state.slot) => Object.keys(state.slots[slot]).filter((e) => e.startsWith(prefix)).length,
  slot: () => state.slot,
  useSlot(i) {
    state.slot = i;
    write();
  },
  clearSlot(i) {
    state.slots[i] = {};
    write();
  },
  quiet: () => state.quiet,
  setQuiet(on) {
    state.quiet = on;
    write();
  },
};
