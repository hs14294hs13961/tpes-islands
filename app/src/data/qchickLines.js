// 太平Q雞的台詞。要改文字改這裡就好，不用動程式。主要讀者是家長與民眾，用語親切、一次一句短話。
// face 是表情：wave 揮手、happy 開心、think 思考、wow 驚訝。

export const LINES = {
  opening: { face: 'wave', text: '歡迎來到太平群島！我是太平Q雞。太平國小孩子們的學習成果都在這裡，想從哪裡開始？' },
  welcomeBack: { face: 'happy', text: '歡迎回來！想看什麼，點我一下就好。' },
  menu: { face: 'happy', text: '有什麼我可以幫忙的嗎？' },
  pickClass: { face: 'think', text: '每一屆都有自己的島，想看哪一班的作品？' },
  exploreFree: { face: 'happy', text: '好的！拖曳畫面可以轉動，點島名或格子就能飛過去。需要我的時候，點我一下。' },
  quietOn: { face: 'think', text: '好，我先安靜。還是可以隨時點我。' },
  quietOff: { face: 'happy', text: '我回來了！之後到新的島，我會再幫你介紹。' },
  slots: { face: 'think', text: '共用平板的話，可以各選一格，進度就不會混在一起，也不用填名字。現在要用哪一格？' },
  slotPicked: (n) => ({ face: 'happy', text: `好的，現在用第 ${n} 格。` }),
  clearAsk: (n) => ({ face: 'wow', text: `確定要清除第 ${n} 格嗎？清除後，我會當成第一次見面。` }),
  cleared: (n) => ({ face: 'happy', text: `第 ${n} 格清好了。` }),
  tourPickClass: { face: 'think', text: '接下來是班級島，每一班都有自己的島。想先看哪一班？我帶你飛過去。' },
  tourEnd: { face: 'wow', text: '導覽結束，謝謝你陪我逛一圈！接下來想看什麼？' },
};

// 功能介紹：最多三句
export const HELP = [
  { face: 'wave', text: '每座班級島都是一屆孩子。點島名或地上的格子，就能看到這裡的作品。' },
  { face: 'think', text: '右上角的「全景」可以回到整片群島；下方的按鈕能暫停畫面、切換鳥瞰。' },
  { face: 'happy', text: '作品可以直接在這裡打開看，也能用「另開」在新分頁看。' },
];

/** 導覽的一站：cluster 省略表示全景。 */
export const TOUR = [
  { stop: 'home', face: 'wave', text: () => '這就是太平群島！中間是太平本島，周圍的班級島各是一屆孩子，會跟著他們一起長大。' },
  { stop: 'class' }, // 由訪客自己選班，台詞是 LINES.tourPickClass 與 islandIntro
  { stop: 'campus', face: 'think', text: () => '這是太平校園島，照真實校園縮小蓋的，校門、球場、夢想雞舍都找得到。' },
  { stop: 'reading', face: 'wow', text: ({ month }) => `這是閱讀島！這個月的書展主題是「${month.theme}」，書單和孩子的閱讀成果都在這裡。` },
  { stop: 'grad', face: 'happy', text: ({ cluster }) => `畢業後，島會漂到外圈變成小島，這座是「${cluster.name}」。作品一直都在，隨時能回來看。` },
];

/** 第一次登上某座島時說的話。 */
export function islandIntro({ cluster, count, month }) {
  if (cluster.id === 'reading') {
    return { face: 'wow', text: `這個月的書展主題是「${month.theme}」，可以看書單、問題卡和孩子的閱讀成果。` };
  }
  if (cluster.id === 'hub') return { face: 'wave', text: `這裡是太平本島，全校與跨年級活動的成果放在這裡，共有 ${count} 件。` };
  if (cluster.id === 'campus') return { face: 'think', text: '這是照真實校園縮小蓋的校園島，點格子認識校園的每個角落。' };
  if (cluster.small) return { face: 'happy', text: `這是「${cluster.name}」的小島，${count} 件成果都留在這裡。` };
  if (!count) return { face: 'think', text: `這是${cluster.name}的島，正在等第一件作品上架喔！` };
  return { face: 'happy', text: `這是${cluster.name}的島，已經有 ${count} 件成果了。點地上的格子就能看！` };
}
