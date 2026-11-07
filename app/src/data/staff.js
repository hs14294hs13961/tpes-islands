// 教職員的對話。台詞用真實姓名公開，上線前要請本人看過（規劃文件第 4 節）。
// face：public/staff/ 的頭像；actions：說完開場後可以做的事（程式在 ui/staffTalk.js）。
// 沒有列在這裡的大人，用職稱找 ROLE_LINES；都找不到就只打招呼。

export const STAFF = {
  黃春嫺: {
    face: 'principal',
    hello: '你好！我是黃春嫺校長，歡迎來到太平。',
    actions: ['catQuest'],
  },
  莊紹群: {
    face: 'zhuang',
    hello: '我是總務主任莊紹群。校舍、設備、採購和校園安全，都是總務處在照顧。',
    actions: ['relay'],
  },
  黃薇: {
    face: 'huang',
    hello: '我是五年甲班的導師黃薇。',
    actions: ['reflect', 'myClass'],
  },
  陳美華: { face: 'teacher-b', hello: '我是教導主任陳美華，全校的課程、教學和學生活動由教導處安排。' },
  李易霖: { face: 'clerk', hello: '我是幹事李易霖，公文、財產和學校的各種行政大小事，常常要找我。' },
  楊瑞華: { face: 'teacher-c', hello: '我是教學組長楊瑞華，課表、教科書和學習評量都由我安排。' },
  簡翠華: { face: 'teacher-b', hello: '我是學務組長簡翠華，大家的生活教育、健康和各種活動由我負責。' },
  鄧芸妃: { face: 'teacher-c', hello: 'Hello！我是英文老師鄧芸妃，英語村是我們練習說英語的地方。' },
};

// 沒有名字的角色（叔公、故事媽媽）與一般導師
export const ROLE_LINES = {
  叔公: {
    face: 'uncle',
    hello: '我是學校的叔公。校園的花草樹木、環境整潔，都是我們每天在照顧的。',
    actions: ['leaves'],
  },
  故事媽媽: { face: 'teacher-c', hello: '我是故事媽媽，常常來學校陪孩子讀故事。' },
};

/** 導師（不在 STAFF 裡的）：介紹自己，並帶去看班級島。 */
export const homeroom = (role, name) => ({
  face: 'teacher-b',
  hello: `我是${role}${name}，歡迎來看我們班孩子的作品！`,
  actions: ['myClass'],
});

// 給大家選的身分：留言、心得都不收姓名，畫面上只顯示「一位家長」
export const ROLES = ['家長', '學生', '老師', '民眾'];
