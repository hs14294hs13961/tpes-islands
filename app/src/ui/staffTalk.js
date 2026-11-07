// 和教職員說話：點名牌 → 鏡頭靠近、人物停下 → 對話框。台詞在 data/staff.js。
// 校長：找太平Q喵；叔公：3D 校園吹落葉；總務主任：3D 校園接力賽；黃薇老師：讀得報寫心得。
import { STAFF, ROLE_LINES, homeroom } from '../data/staff.js';
import { postSocial } from '../data/social.js';
import { createCompose } from './compose.js';

const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

export function createStaffTalk({ dialog, eggs, qcat, reading, clusters, mapUrl, pick }) {
  const month = () => reading.months[reading.current];
  // 太平Q喵的捉迷藏：躲在本島、校園島或班級島的某一格
  const hideouts = clusters.filter((c) => c.id === 'hub' || c.id === 'campus' || c.kind === 'class');
  const quest = { active: false, fed: false, cluster: null, tile: null, hints: 0 };

  function lineFor(person) {
    const { role, name } = person.info;
    if (name && STAFF[name]) return STAFF[name];
    if (ROLE_LINES[role]) return ROLE_LINES[role];
    if (/導師$/.test(role)) return homeroom(role, name);
    return { face: 'teacher-b', hello: name ? `你好，我是${role}${name}。` : `你好，我是${role}。` };
  }

  function talk(person) {
    const line = lineFor(person);
    const who = person.info.name ? `${person.info.role} ${person.info.name}` : person.info.role;
    const speak = (text, options, extra) => dialog.say({ text, options, extra, name: who, faceUrl: `./public/staff/${line.face}.jpg` });
    const acts = line.actions || [];

    if (acts.includes('catQuest')) return principal(speak, line);
    const options = [];
    let text = line.hello;
    if (acts.includes('leaves')) {
      text += eggs.found('uncle-toolbox')
        ? '上次多虧你幫忙！落葉又掉了一地，要再來一場嗎？'
        : '落葉又掉滿地了，可以到 3D 校園幫我用吹葉機清乾淨嗎？小心別撞到在玩的孩子喔！';
      options.push({ label: '去 3D 校園幫忙 ↗', run: () => openGame('leaves') });
    }
    if (acts.includes('relay')) {
      text += '要不要到 3D 校園挑戰一場接力賽？跑得快之外，接棒的時機最重要！';
      options.push({ label: '去 3D 校園比賽 ↗', run: () => openGame('relay') });
    }
    if (acts.includes('reflect') && month()?.articles?.some((a) => a.url)) {
      text += `這個月的得報選了 ${month().articles.length} 篇好文章，我幫你抽一篇，讀完寫 30～50 字的心得給我好嗎？`;
      options.push({ label: '好，抽一篇', run: () => draw(speak) });
    }
    if (acts.includes('myClass')) {
      const mine = person.cluster;
      if (mine?.kind === 'class') options.push({ label: '看我們班的作品', run: () => pick({ cluster: mine }) });
    }
    options.push({ label: options.length ? '下次再說' : '你好！' });
    speak(text, options);
  }

  function openGame(game) {
    window.open(`${mapUrl}?game=${game}&from=islands`, '_blank', 'noopener');
  }

  // ── 校長：找太平Q喵 ────────────────────────────────────

  function startQuest(speak) {
    quest.cluster = pickOne(hideouts);
    quest.tile = pickOne(quest.cluster.tiles);
    Object.assign(quest, { active: true, fed: false, hints: 0 });
    qcat.hideAt(quest.tile);
    hint(speak);
  }

  function hint(speak) {
    const lines = [
      `我剛剛好像看到牠往「${quest.cluster.name}」跑過去了。`,
      `牠最喜歡待在「${quest.tile.name}」那一格附近。`,
      '靠近一點，仔細看格子的邊邊，有沒有一條黑尾尖的虎斑尾巴在搖？',
    ];
    const text = lines[quest.hints];
    quest.hints = Math.min(quest.hints + 1, lines.length);
    const left = lines.length - quest.hints;
    speak(text, [
      { label: '我去找找', run: () => pick({ cluster: quest.cluster }) },
      ...(left ? [{ label: `再給我一點提示（還有 ${left} 個）`, run: () => hint(speak) }] : []),
    ]);
  }

  function principal(speak, line) {
    if (quest.fed) {
      quest.active = false;
      quest.fed = false;
      const first = !eggs.found('principal-key');
      speak(first
        ? '你找到太平Q喵，還餵牠吃飽了！謝謝你。送你一顆我珍藏的彩蛋。'
        : '謝謝你又幫我找到太平Q喵！牠最喜歡跟大家玩捉迷藏了。', [
        first
          ? { label: '收下彩蛋', run: () => eggs.unlock('principal-key') }
          : { label: '再玩一次', run: () => startQuest(speak) },
        { label: '不客氣！' },
      ]);
      return;
    }
    if (quest.active) {
      speak('找到太平Q喵了嗎？牠吃飽了才會乖乖待著喔。', [
        ...(quest.hints < 3 ? [{ label: '再給我一點提示', run: () => hint(speak) }] : []),
        { label: '帶我回牠躲的島', run: () => pick({ cluster: quest.cluster }) },
        { label: '我再找找' },
      ]);
      return;
    }
    speak(`${line.hello}學校裡住著一隻小貓「太平Q喵」，牠很愛躲起來。你可以幫我找到牠，餵牠吃貓糧嗎？`, [
      { label: '好，交給我！', run: () => startQuest(speak) },
      { label: '下次再說' },
    ]);
  }

  /** 點到太平Q喵。 */
  function meetCat() {
    const speak = (text, options) => dialog.say({ text, options, name: '太平Q喵', faceUrl: './public/staff/qcat.jpg' });
    if (quest.fed) {
      speak('喵～（Q喵舔舔嘴巴，看起來很滿足）', [{ label: '回去告訴校長' }]);
      return;
    }
    speak('喵～？（灰褐色的虎斑小貓探出頭來，肚子咕嚕咕嚕叫）', [
      {
        label: '餵牠吃貓糧',
        run: () => qcat.feed().then(() => {
          quest.fed = true;
          speak('喵嗚～（Q喵吃得好開心，用頭蹭了蹭你）。快回去告訴校長吧！', [{ label: '好！' }]);
        }),
      },
      { label: '先不要吵牠' },
    ]);
  }

  // ── 黃薇老師：讀得報寫心得 ─────────────────────────────

  function draw(speak, except) {
    const list = month().articles.filter((a) => a.url && a !== except);
    const a = pickOne(list.length ? list : month().articles.filter((x) => x.url));
    speak(`抽到〈${a.title}〉${a.issue ? `（第 ${a.issue} 期）` : ''}。先讀文章，讀完再回來寫心得喔！`, [
      { label: '打開文章 ↗', keep: true, run: () => window.open(a.url, '_blank', 'noopener') },
      { label: '我讀完了，寫心得', run: () => write(speak, a) },
      ...(month().articles.length > 1 ? [{ label: '換一篇', run: () => draw(speak, a) }] : []),
    ]);
  }

  function write(speak, a, compose) {
    let send;
    const form = compose || createCompose({
      min: 30, max: 50, rows: 3,
      placeholder: '讀完這篇文章，你想到什麼？',
      onChange: (ok) => { if (send) send.disabled = !ok; },
    });
    const buttons = speak(`寫下你讀〈${a.title}〉的想法，30～50 字，老師看過後會貼在閱讀島。`, [
      {
        label: '送出',
        keep: true,
        disabled: !form.valid(),
        run: async () => {
          send.disabled = true;
          send.textContent = '送出中…';
          try {
            const status = await postSocial({ action: 'reflect', target: a.url, title: a.title, ...form.value() });
            speak(status === 'published'
              ? '謝謝你！你的心得已經貼在閱讀島的「讀得報文章」裡了。'
              : '收到了，謝謝你！老師看過之後就會貼出來。', [{ label: '好', run: () => eggs.unlock('reading-bookmark') }]);
          } catch (err) {
            speak(`${err.message}。`, [{ label: '再試一次', run: () => write(speak, a, form) }, { label: '先不寫' }]);
          }
        },
      },
      { label: '先不寫' },
    ], form.root);
    send = buttons[0];
    setTimeout(() => form.focus(), 50);
  }

  return { talk, meetCat };
}
