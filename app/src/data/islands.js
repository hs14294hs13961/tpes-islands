// 太平群島的單一設定來源：島在哪、每格是什麼、島上有誰。
// 座標是尖頂六角形的 axial (q, r)；r 越大越靠近鏡頭（南方）。
// 加島、改格局、換老師，只改這個檔案。

export const SCHOOL = {
  name: '太平群島',
  en: 'TAIPING ISLANDS',
  school: '新竹縣關西鎮太平國民小學',
  // 老師上傳成果仍在電子書櫃
  uploadUrl: 'https://script.google.com/a/macros/tpes.hcc.edu.tw/s/AKfycbyzgcnqi0FfQzPmVZv7503wCspJNTwYMViYlbnIdPQ2ZdDHCZK90GeBCkwLJp4wmNCO/exec',
  // 電子書櫃的唯讀資料介面（只回傳上架成果的公開欄位）
  apiUrl: 'https://script.google.com/macros/s/AKfycbyzgcnqi0FfQzPmVZv7503wCspJNTwYMViYlbnIdPQ2ZdDHCZK90GeBCkwLJp4wmNCO/exec?api=islands',
  // 閱讀島內容表的唯讀介面（獨立的 Apps Script，部署後把網址填在這裡；空字串＝用內建 reading.json）
  readingApiUrl: 'https://script.google.com/macros/s/AKfycby02HfGXZnDwb-CrnGh5MJWlNm8AT1c0zZA2SZkeZttXTutywqKsqJX9DV36lQsIJPz/exec',
};

// 品牌色（PRD 第 7 節：仙草花紫＋小雞橘）
export const PALETTE = {
  primary: '#6B5B95',
  accent: '#EF8A3C',
  leaf: '#7FA66A',
  paper: '#FBF6EC',
  ink: '#2B201C',
};

const GRADE_NAME = ['', '一', '二', '三', '四', '五', '六'];

// 班級島的位置：依「目前年級」排，一年級在西邊，順時針繞到六年級
const CLASS_SLOTS = { 1: [-5, 1], 2: [-3, -3], 3: [1, -5], 4: [5, -5], 5: [6, -1], 6: [4, 3] };

// 屆別島：以入學學年度為身分（PRD 決策 A2），男女人數跟著這一屆走（115 學年實際人數）
export const COHORTS = [
  { entry: 115, boys: 5, girls: 4 },
  { entry: 114, boys: 2, girls: 4 },
  { entry: 113, boys: 3, girls: 2 },
  { entry: 112, boys: 2, girls: 3 },
  { entry: 111, boys: 3, girls: 2 },
  { entry: 110, boys: 2, girls: 2 },
];

// 導師依「目前年級」配（每年 8 月改這裡）；來源：教師名冊.xlsx
export const HOMEROOM = { 1: '李曉櫻', 2: '羅梅華', 3: '潘宛宜', 4: '邱惠雯', 5: '黃薇', 6: '盧志玲' };

// 科目 → 地標類型
export const SUBJECT_TYPE = {
  國語: 'books', 英語: 'english', 數學: 'math', 自然: 'greenhouse', 社會: 'globe',
  藝術: 'art', 健體: 'sports', 綜合: 'campfire', 生活: 'garden', 客語: 'hakka',
  主題活動: 'stage', 太平歲閱: 'library', 農情永續: 'farm', 智造太平: 'maker',
};

// 一座島最多 7 格：中心＋外圈 6 格，依這個順序長出來
export const RING = [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

// 固定的島（不隨學年變動）
const FIXED = [
  {
    id: 'hub', name: '太平本島', en: 'TAIPING MAIN ISLAND', center: [0, 0], dataKey: 'hub',
    tagline: '校長、主任與組長在這裡；跨年級與全校活動的成果都放在本島',
    tiles: [
      { name: '主題活動廣場', type: 'plaza', ground: 'stone', subject: '主題活動' },
      { name: '校長室', type: 'principal', ground: 'lawn' },
      { name: '英語村', type: 'english', ground: 'lawn' },
      { name: '太平歲閱館', type: 'library', ground: 'stone', subject: '太平歲閱', link: { cluster: 'reading', label: '到閱讀島看本月書展' } },
      { name: '行政中心', type: 'office', ground: 'stone' },
      { name: '農情永續田', type: 'farm', ground: 'farm', subject: '農情永續' },
      { name: '智造太平工坊', type: 'maker', ground: 'stone', subject: '智造太平' },
    ],
    people: [
      { role: '校長', name: '黃春嫺', gender: 'f', tile: 1 },
      { role: '教導主任', name: '陳美華', gender: 'f', tile: 4, prop: 'clipboard' },
      { role: '總務主任', name: '莊紹群', gender: 'm', tile: 4, prop: 'clipboard' },
      { role: '幹事', name: '李易霖', gender: 'm', tile: 4 },
      { role: '教學組長', name: '楊瑞華', gender: 'f', tile: 0 },
      { role: '學務組長', name: '簡翠華', gender: 'f', tile: 0 },
      { role: '英文老師', name: '鄧芸妃', gender: 'f', tile: 2, prop: 'book' },
    ],
  },
  {
    id: 'campus', name: '太平校園島', en: 'CAMPUS ISLE', center: [-1, 5],
    tagline: '真實校園的縮小版；之後可以從這裡走進 3D 校園地圖',
    // 依真實校園配置：校門在最南端，進門是水池，正中央是球場，後方是教學大樓與司令台
    tiles: [
      { name: '球場', type: 'court', ground: 'lawn', bare: true, desc: '校園正中央，紅色跑道圍著綠色球場，下課時最熱鬧的地方。' },
      { name: '樹屋', type: 'treehouse', ground: 'lawn', bare: true, desc: '太平樹屋：兩根彩色水泥管撐起木平台，旁邊就是老樹和稻田。' },
      { name: '水池', type: 'pond', ground: 'lawn', bare: true, desc: '一進校門就看得到的水池，有睡蓮、白鷺和停在枝頭的八哥。' },
      { name: '水稻田', type: 'paddy', ground: 'lawn', bare: true, desc: '學校自己的小稻田，旁邊還種著太平Q雞最愛的仙草。' },
      { name: '夢想雞舍', type: 'coop', ground: 'lawn', bare: true, desc: '太平國小 27 屆夢想雞舍，由孩子們一起照顧。' },
      { name: '教學大樓', type: 'campus', ground: 'stone', bare: true, noWalk: true, desc: 'U 形的兩層樓校舍，屋頂鋪著太陽能板，把司令台抱在中間。' },
      { name: '司令台', type: 'campusStage', ground: 'stone', bare: true, noWalk: true, desc: '波浪頂棚下的舞台，背牆與底座的彩繪都是校園裡真實的壁畫。' },
      { name: '校門', type: 'gate', ground: 'street', bare: true, at: [-1, 2], desc: '新竹縣關西鎮太平國民小學，歡迎光臨。' },
    ],
    people: [
      { role: '叔公', gender: 'm', tile: 0, worker: true, age: 'mid' },
      { role: '叔公', gender: 'm', tile: 4, worker: true, age: 'old' },
      { role: '叔公', gender: 'm', tile: 7, worker: true, age: 'old' },
    ],
  },
  {
    id: 'grad-109', name: '114 學年畢業生', en: 'CLASS OF 114', center: [-8, -2], small: true, entry: 109,
    tagline: '畢業後整座島會漂到外圈，成果一直留著',
    tiles: [{ name: '畢業紀念亭', type: 'pavilion', ground: 'lawn' }],
    people: [],
  },
  {
    // 不隨學年變動；內容每月換，由閱讀島內容表控制。guest：不算在島民人數裡
    id: 'reading', name: '閱讀島', en: 'READING ISLE', center: [-6, 5], bridgeFrom: 'campus',
    tagline: '全校一起讀的每月主題書展：書單、問題卡、文章、學習單與大家的閱讀成果',
    tiles: [
      { name: '主題書展館', type: 'bookHall', ground: 'stone', section: 'hall', bare: true },
      { name: '書櫃長廊', type: 'bookShelves', ground: 'lawn', section: 'books' },
      { name: '問題卡亭', type: 'quizBooth', ground: 'lawn', section: 'questions' },
      { name: '得報閱報亭', type: 'newsstand', ground: 'stone', section: 'articles' },
      { name: '學習單小屋', type: 'sheetHut', ground: 'lawn', section: 'sheets' },
      { name: '四大家族擂台', type: 'familyStage', ground: 'stone', section: 'events' },
      { name: '閱讀成果廊', type: 'readingGallery', ground: 'lawn', section: 'gallery' },
    ],
    people: [
      { role: '故事媽媽', gender: 'f', tile: 5, guest: true },
      { student: true, gender: 'm', tile: 1, guest: true },
      { student: true, gender: 'f', tile: 6, guest: true },
    ],
  },
];

// 閱讀島格子上的數字與旗幟顏色，都跟著目前的書展
function readingIsland(f, reading) {
  const m = reading.months[reading.current];
  const counts = { books: m.books.length, questions: m.questions.length, articles: m.articles.length, sheets: reading.worksheets.length, events: m.events.length, gallery: reading.recordCount };
  return {
    ...f, kind: f.id,
    sub: `${m.month} 月書展・SDG ${m.sdg}`,
    tiles: f.tiles.map((t) => ({ ...t, count: counts[t.section], month: m, color: m.color })),
  };
}

/**
 * 依目前學年度與成果資料，組出完整群島。
 * 班級島：中心＝教室、接著成果館，再依件數多寡長出科目格（最多補滿 7 格）。
 */
export function buildIslandList(currentYear, data, reading) {
  const classes = COHORTS.map((c) => {
    const grade = currentYear - c.entry + 1;
    const stats = data.cohorts?.[c.entry] || { total: 0, subjects: {} };
    const subjects = Object.entries(stats.subjects).slice(0, RING.length - 2);
    const tiles = [
      // 五甲教室有閱讀角，照真實教室做成剖面
      grade === 5
        ? { name: '五甲教室・閱讀角', type: 'readingCorner', ground: 'lawn', desc: '五甲教室裡的閱讀角：巧拼地墊、一櫃子的書，還有大貓熊和大象陪著看書。', link: { cluster: 'reading', label: '到閱讀島看本月書展' } }
        : { name: `${GRADE_NAME[grade]}甲教室`, type: 'classroom', ground: 'lawn' },
      { name: '成果館', type: 'gallery', ground: 'stone', count: stats.total },
      ...subjects.map(([s, n]) => ({ name: s, type: SUBJECT_TYPE[s] || 'meadow', ground: 'lawn', count: n, subject: s })),
    ];
    const count = c.boys + c.girls;
    const students = Array.from({ length: count }, (_, i) => ({ student: true, gender: i < c.boys ? 'm' : 'f', tile: i % tiles.length }));
    return {
      id: `c${c.entry}`, kind: 'class', grade, entry: c.entry,
      name: `${GRADE_NAME[grade]}年甲班`, en: `GRADE ${grade} ISLAND`,
      sub: `${c.entry} 學年入學・${count} 位同學`,
      tagline: `${c.entry} 學年入學的這一屆，一起長大的島`,
      center: CLASS_SLOTS[grade], total: stats.total, tiles,
      people: [{ role: `${GRADE_NAME[grade]}年級導師`, name: HOMEROOM[grade], gender: 'f', tile: 0 }, ...students],
    };
  });

  const fixed = FIXED.map((f) => {
    const stats = f.dataKey ? data[f.dataKey] : null;
    const tiles = f.tiles.map((t) => ({ ...t, count: t.subject && stats ? stats.subjects[t.subject] || 0 : undefined }));
    return { ...f, kind: f.id, total: stats?.total, tiles };
  });

  return [fixed[0], ...classes, fixed[1], fixed[2], readingIsland(FIXED[3], reading)];
}
