// 太平小彩蛋：第一批 10 顆。緣由（story）要由學校提供，不自己編；還沒拿到的寫 null，畫面會顯示「緣由整理中」。
// how：find＝在島上找到（要靠近才看得到）、talk＝和人物互動、game＝3D 校園小遊戲過關。
// where：find 類放在哪座島的第幾格；night：只有夜晚才出現。
// 3D 校園地圖過關時，直接在群島的存檔寫入 `egg:<id>`（同一個網域），回到群島就會跳出彩蛋卡。

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
    id: 'chick-feather', name: 'Q 雞的第一根羽毛', how: 'find', where: { cluster: 'campus', tile: 4 }, color: '#8b4a2b',
    hint: '去孩子們照顧雞的地方看看',
    story: null, // 雞舍的故事、Q 雞怎麼誕生
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
