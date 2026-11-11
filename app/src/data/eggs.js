// 太平小彩蛋：第一批 10 顆。緣由（story）要由學校提供，不自己編；還沒拿到的寫 null，畫面會顯示「緣由整理中」。
// how：find＝在島上找到（要靠近才看得到）、talk＝和人物互動、game＝3D 校園小遊戲過關。
// where：find 類放在哪座島的第幾格；night：只有夜晚才出現。
// 3D 校園地圖過關時，直接在群島的存檔寫入 `egg:<id>`（同一個網域），回到群島就會跳出彩蛋卡。

// ※ 新彩蛋只能加在最後面、最多 20 顆：彩蛋代碼（見最下面）是照這個順序記的，中間插隊會讓舊代碼對錯蛋。

export const EGGS = [
  {
    id: 'principal-key', name: '校長的金鑰匙', how: 'talk', color: '#e9b949',
    hint: '幫校長找到躲起來的太平Q喵',
    story: null, // 校長想告訴孩子的一件事
  },
  {
    id: 'uncle-toolbox', name: '叔公的工具箱', how: 'game', color: '#ef8a3c',
    hint: '在 3D 校園幫叔公吹完落葉',
    story: '謝謝你幫叔公把落葉吹乾淨！校園每天這麼整齊，都要謝謝叔公們細心照顧。',
  },
  {
    id: 'relay-baton', name: '接力棒', how: 'game', color: '#d9534f',
    hint: '在 3D 校園的接力賽跑第一名',
    story: '接力賽贏在默契：跑得快很重要，把棒子穩穩交給下一位更重要。',
  },
  {
    id: 'reading-bookmark', name: '五甲閱讀角的書籤', how: 'talk', color: '#7d62b8',
    hint: '讀一篇得報，寫心得給黃薇老師',
    story: null, // 閱讀角的由來
  },
  {
    id: 'grass-flower', name: '仙草花', how: 'find', where: { cluster: 'campus', tile: 3 }, color: '#9b7fd1',
    hint: '在稻田附近，有一抹淡紫色',
    story: null, // 為什麼太平跟仙草有關
  },
  {
    id: 'chick-feather', name: 'G米花的第一根羽毛', how: 'find', where: { cluster: 'campus', tile: 4 }, color: '#8b4a2b',
    hint: '去孩子們照顧雞的地方看看',
    story: null, // 雞舍的故事、G米花怎麼誕生
  },
  {
    id: 'taiping-t', name: '太平T', how: 'find', where: { cluster: 'campus', tile: 0 }, color: '#5fb8a6',
    hint: '下課最熱鬧的地方',
    story: null, // 校服的設計由來
  },
  {
    id: 'badge-wing', name: '校徽的翅膀', how: 'find', where: { cluster: 'campus', tile: 7 }, color: '#3e7cc9',
    hint: '每天上學第一個經過的地方',
    story: null, // 校徽的意義
  },
  {
    id: 'treehouse-secret', name: '樹屋的祕密', how: 'find', where: { cluster: 'campus', tile: 1 }, color: '#7a9a3a',
    hint: '兩根彩色水泥管撐起來的地方',
    story: null, // 樹屋怎麼蓋起來的
  },
  {
    id: 'pond-visitor', name: '水池的訪客', how: 'find', where: { cluster: 'campus', tile: 2 }, night: true, color: '#2f6f8f',
    hint: '天黑以後，去水池邊看看',
    story: null, // 水池的故事、住了什麼生物
  },
];

export const HOW_LABEL = { find: '在島上找到', talk: '和人物互動', game: '3D 校園小遊戲' };

// ── 彩蛋代碼 ─────────────────────────────────────────
// 紀錄只存在這台裝置的瀏覽器裡：Safari 一週沒來就會清掉、無痕模式關掉就沒了、換一台平板也看不到。
// 不做登入（不收學生個資），改給一組 6 個字的代碼：把「拿過哪幾顆」打亂後寫成字母數字，抄下來就能在任何裝置拿回彩蛋。
// 字母表拿掉 0、1、I、O，小朋友抄寫不會搞混；後 2 個字是檢查碼，抄錯會被發現，也不容易亂猜。
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const BITS = 0xfffff; // 20 顆的空間
const MIX = 0x9e375, SALT = 0x5a3c9;
let unmix = MIX;
for (let i = 0; i < 5; i++) unmix = Math.imul(unmix, 2 - Math.imul(MIX, unmix)); // MIX 在 2^32 下的倒數
const check = (n) => {
  let h = Math.imul(n + 0x3a7, 0x45d9f3b) >>> 0;
  h ^= h >>> 15;
  return Math.imul(h, 0x2c1b3c6d) >>> 22; // 10 位元
};

/** 拿過的彩蛋 → 代碼（例：K7M-2PQ）。found(egg) 回傳有沒有拿過。 */
export function eggCode(found) {
  const bits = EGGS.reduce((n, egg, i) => (found(egg) ? n | (1 << i) : n), 0);
  const mixed = Math.imul(bits ^ SALT, MIX) & BITS;
  const n = mixed * 1024 + check(mixed);
  let out = '';
  for (let i = 5; i >= 0; i--) out += ALPHA[Math.floor(n / 32 ** i) % 32];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

/** 代碼 → 拿過的彩蛋清單；代碼不對回傳 null。 */
export function readEggCode(text) {
  const clean = String(text).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length !== 6) return null;
  let n = 0;
  for (const ch of clean) {
    const v = ALPHA.indexOf(ch);
    if (v < 0) return null;
    n = n * 32 + v;
  }
  const mixed = Math.floor(n / 1024);
  if (check(mixed) !== n % 1024) return null;
  const bits = (Math.imul(mixed, unmix) & BITS) ^ SALT;
  if (bits >= 2 ** EGGS.length) return null;
  return EGGS.filter((_, i) => bits & (1 << i));
}
