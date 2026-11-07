// 太平Q雞的流程：開場、登島介紹、功能選單、導覽、存檔格。台詞在 data/qchickLines.js。
import { save, SLOT_COUNT } from '../data/save.js';
import { recordsFor } from '../data/records.js';
import { readingRecords } from '../data/reading.js';
import { LINES, HELP, TOUR, islandIntro } from '../data/qchickLines.js';

export function createGuide({ dialog, qchick, hud, data, reading, clusters, pick, focus, goHome }) {
  const byId = (id) => clusters.find((c) => c.id === id);
  const month = () => reading.months[reading.current];
  const countOf = (cluster) => (cluster.id === 'reading' ? readingRecords(data, reading) : recordsFor(data, { cluster })).length;

  const latest = () => data.records.reduce((a, b) => (b.date > a.date ? b : a));

  const say = (line, options) => dialog.say({ ...line, options });
  const explore = { label: '自己逛逛', run: () => say(LINES.exploreFree) };

  const classOptions = (run) => clusters
    .filter((c) => c.kind === 'class')
    .sort((a, b) => a.grade - b.grade)
    .map((c) => ({ label: `${c.name}（${countOf(c)}）`, run: () => run(c) }));

  function chooseClass() {
    say(LINES.pickClass, [
      ...classOptions((c) => pick({ cluster: c })),
      ...(data.records.length ? [{ label: '最新上架的作品', run: () => hud.openRecord(latest()) }] : []),
    ]);
  }

  function help(i = 0) {
    say(HELP[i], i < HELP.length - 1
      ? [{ label: '下一句', run: () => help(i + 1) }, { label: '知道了' }]
      : [{ label: '知道了' }]);
  }

  // ── 導覽 ─────────────────────────────────────────────

  // 班級島這一站由訪客自己選：家長多半想看自己孩子的班
  function tourPickClass(i) {
    say(LINES.tourPickClass, [
      ...classOptions((c) => {
        focus(c);
        say(islandIntro({ cluster: c, count: countOf(c), month: month() }), [
          { label: '下一站', run: () => tourStop(i + 1) },
          { label: '換一班', run: () => tourPickClass(i) },
          { label: '先到這裡', run: () => say(LINES.exploreFree) },
        ]);
      }),
      { label: '跳過，下一站', run: () => tourStop(i + 1) },
    ]);
  }

  function tourStop(i) {
    const stop = TOUR[i];
    if (!stop) {
      save.mark('tour');
      say(LINES.tourEnd, [{ label: '看孩子的作品', run: chooseClass }, explore]);
      return;
    }
    if (stop.stop === 'class') { tourPickClass(i); return; }
    let cluster = null;
    if (stop.stop === 'home') {
      qchick.leave();
      goHome();
    } else {
      cluster = {
        campus: () => byId('campus'),
        reading: () => byId('reading'),
        grad: () => clusters.find((c) => c.small),
      }[stop.stop]();
      if (!cluster) { tourStop(i + 1); return; } // 這一站目前沒有島（例如還沒有畢業生）就跳過
      focus(cluster);
    }
    const text = stop.text({ cluster, count: cluster ? countOf(cluster) : 0, month: month() });
    const last = i === TOUR.length - 1;
    say({ face: stop.face, text }, [
      { label: last ? '完成導覽' : '下一站', run: () => tourStop(i + 1) },
      { label: '先到這裡', run: () => say(LINES.exploreFree) },
    ]);
  }

  function tour() {
    hud.closeInfo();
    tourStop(0);
  }

  // ── 存檔格 ───────────────────────────────────────────

  function slots() {
    const options = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const seen = save.count('isle:', i);
      const now = i === save.slot() ? '使用中・' : '';
      return {
        label: `第 ${i + 1} 格（${now}${seen ? `逛過 ${seen} 座島` : '還沒開始'}）`,
        run: () => {
          save.useSlot(i);
          say(LINES.slotPicked(i + 1));
        },
      };
    });
    say(LINES.slots, [...options, { label: '清除目前這格', run: askClear }, { label: '返回', run: menu }]);
  }

  function askClear() {
    const i = save.slot();
    say(LINES.clearAsk(i + 1), [
      { label: '先不要', run: slots },
      { label: '確定清除', run: () => { save.clearSlot(i); say(LINES.cleared(i + 1)); } },
    ]);
  }

  // ── 選單與開場 ───────────────────────────────────────

  function menu() {
    qchick.hop();
    say(LINES.menu, [
      { label: '看孩子的作品', run: chooseClass },
      { label: '跟我導覽', run: tour },
      { label: '功能介紹', run: () => help() },
      { label: '回到全景', run: () => { hud.closeInfo(); qchick.leave(); goHome(); } },
      { label: '我的進度', run: slots },
      {
        label: save.quiet() ? '請你多說一點' : '讓我安靜一下',
        run: () => {
          const on = !save.quiet();
          save.setQuiet(on);
          say(on ? LINES.quietOn : LINES.quietOff);
        },
      },
    ]);
  }

  function opening() {
    save.mark('intro');
    say(LINES.opening, [
      { label: '看孩子的作品', run: chooseClass },
      { label: '跟我導覽', run: tour },
      { label: '看閱讀島', run: () => pick({ cluster: byId('reading') }) },
      explore,
    ]);
  }

  function latestLine() {
    const r = data.recent[0];
    if (!r) return LINES.welcomeBack;
    const fresh = (new Date(data.asOf) - new Date(r.date)) / 864e5 <= 7;
    return fresh ? { face: 'wow', text: `最新上架：${r.cls}〈${r.title}〉` } : LINES.welcomeBack;
  }

  return {
    menu,
    /** 頁面載入後：第一次見面開場，之後只在右下角說一句。 */
    start() {
      if (save.seen('intro') || save.quiet()) hud.butlerSay(latestLine());
      else setTimeout(opening, 900);
    },
    /** 登島：Q 雞飛到島邊；第一次來時在資訊卡上方說一兩句。 */
    enterIsland(cluster) {
      qchick.moveTo(cluster.center, cluster.radius);
      if (save.quiet()) return;
      const first = save.mark(`isle:${cluster.id}`);
      if (first) {
        hud.qNote(islandIntro({ cluster, count: countOf(cluster), month: month() }));
        qchick.hop();
      }
    },
  };
}
