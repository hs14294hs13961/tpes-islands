// 背景音樂：太平國民小學校歌〈薪火相傳〉（李永剛 曲、邱金球 詞）的音樂盒版。
// 學校留下來的錄音很悶又破音（3000 Hz 以上幾乎沒有聲音），修不回來，所以不放錄音檔：
// 旋律照學校網站「校歌校徽」頁的樂譜一個音一個音打進來，速度和前奏照錄音（每分鐘 92 拍、先奏最後兩小節），
// 聲音用瀏覽器的 Web Audio 即時合成，不必下載任何音檔。
// 編曲：音樂盒主旋律＋豎琴般的分散和弦＋輕輕的低音；第二遍高八度加一層亮音。
// 瀏覽器規定要使用者先點過畫面才能出聲，所以第一次點擊時才開始播。

const BPM = 92;
const BEAT = 60 / BPM;
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const hz = (name, shift = 0) => {
  const [, letter, sharp, octave] = /^([A-G])(#?)(\d)$/.exec(name);
  const midi = 12 * (Number(octave) + 1) + STEP[letter] + (sharp ? 1 : 0) + shift;
  return 440 * 2 ** ((midi - 69) / 12);
};

// 「切磋又琢磨」的「琢」：學校網站的樂譜印的是 F（fa），錄音裡兩遍唱的都是升 F。這裡照大家實際唱的；要照樂譜就改成 'F4'。
const ZHUO = 'F#4';

// 主旋律（C 大調、4/4 拍）。每個音：[音名或 null（休止）, 幾拍]，一行一小節
const BARS = [
  [['G4', 0.5], ['G4', 0.5], ['E4', 0.75], ['F4', 0.25], ['G4', 1], ['E4', 1]],          // 太陽和煦煦
  [['A4', 0.75], ['A4', 0.25], ['C5', 0.5], ['A4', 0.5], ['G4', 2]],                     // 青山翠綠綠
  [['E4', 0.5], ['E4', 0.5], ['G4', 0.75], ['E4', 0.25], ['F4', 1], ['D4', 1]],          // 茂林修竹中
  [['G4', 0.75], ['A4', 0.25], ['E4', 0.5], ['D4', 0.5], ['C4', 2]],                     // 學堂立期間
  [['C5', 1.5], ['C5', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], [null, 0.5]],        // 師生融一體
  [['G4', 1.5], ['D4', 0.5], ['E4', 0.5], [ZHUO, 0.5], ['G4', 0.5], [null, 0.5]],        // 切磋又琢磨
  [['A4', 0.5], ['G4', 1], ['A4', 0.25], ['C5', 0.25], ['E5', 1], ['D5', 1]],            // 勤學更敬業
  [['G4', 0.75], ['A4', 0.25], ['G4', 0.5], ['B4', 0.5], ['C5', 2]],                     // 日日求進步
];

// 伴奏的和弦：[根音, 三音, 五音（或七音）, 幾拍]，一行一小節
const C = ['C3', 'E3', 'G3'], F = ['F3', 'A3', 'C4'], G = ['G2', 'B2', 'D3'], G7 = ['G2', 'B2', 'F3'], D7 = ['D3', 'F#3', 'C4'];
const CHORDS = [
  [[C, 4]],
  [[F, 2], [C, 2]],
  [[C, 2], [G7, 2]],
  [[C, 1], [G, 1], [C, 2]],
  [[F, 4]],
  [[G, 2], [D7, 1], [G, 1]],
  [[F, 2], [C, 1], [G, 1]],
  [[G7, 2], [C, 2]],
];

// 一輪：前奏（最後兩小節）→ 第一遍 → 第二遍（加亮音）→ 休息兩小節，再從頭
const ORDER = [
  { bar: 6, soft: true }, { bar: 7, soft: true },
  ...BARS.map((_, bar) => ({ bar })),
  ...BARS.map((_, bar) => ({ bar, bright: true })),
  { rest: true }, { rest: true },
];

/** 把整輪攤平成一串「第幾拍、哪種聲音、頻率、多長」，播的時候照表排程。 */
function buildEvents() {
  const events = [];
  ORDER.forEach((part, i) => {
    const start = i * 4;
    if (part.rest) return;
    let t = start;
    for (const [name, beats] of BARS[part.bar]) {
      if (name) {
        events.push({ t, kind: 'box', f: hz(name, 12), beats, gain: part.soft ? 0.11 : 0.15 });
        if (part.bright && beats >= 0.5) events.push({ t, kind: 'bell', f: hz(name, 24), beats, gain: 0.035 });
      }
      t += beats;
    }
    t = start;
    for (const [chord, beats] of CHORDS[part.bar]) {
      events.push({ t, kind: 'bass', f: hz(chord[0], -12), beats, gain: 0.1 });
      const steps = [hz(chord[0]), hz(chord[2]), hz(chord[1], 12), hz(chord[2])];
      for (let k = 0; k < beats * 2; k++) events.push({ t: t + k / 2, kind: 'harp', f: steps[k % 4], beats: 1, gain: part.soft ? 0.04 : 0.05 });
      t += beats;
    }
  });
  events.sort((a, b) => a.t - b.t);
  return { events, length: ORDER.length * 4 };
}

const PREF = 'tpes-islands-music';

export function createMusic() {
  const { events, length } = buildEvents();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let out = null;
  let timer = 0;
  let index = 0;
  let loopAt = 0;
  let playing = false;
  let held = false; // 看作品、切到別的分頁時先停
  let paused = false;
  let wanted = true;
  try { wanted = localStorage.getItem(PREF) !== '0'; } catch { /* 存不了就照預設 */ }

  function setup() {
    ctx = new AudioCtx();
    out = ctx.createGain();
    out.gain.value = 0;
    const squash = ctx.createDynamicsCompressor(); // 好幾個音疊在一起也不會破音
    squash.threshold.value = -18;
    squash.ratio.value = 4;
    // 一點點回音，聽起來像在房間裡而不是耳機裡的電子音
    const echo = ctx.createDelay(1);
    echo.delayTime.value = BEAT * 0.75;
    const back = ctx.createGain();
    back.gain.value = 0.22;
    const dull = ctx.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 2200;
    out.connect(squash);
    out.connect(echo);
    echo.connect(dull);
    dull.connect(back);
    back.connect(echo);
    back.connect(squash);
    squash.connect(ctx.destination);
  }

  // 一個音：幾個正弦波疊出音色，音量很快衝上去再慢慢消失（敲擊樂器的樣子）
  function voice(at, f, gain, ring, partials) {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, at + ring);
    env.connect(out);
    for (const [ratio, level, type] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(env);
      osc.start(at);
      osc.stop(at + ring + 0.05);
    }
  }

  function play(e, at) {
    const len = e.beats * BEAT;
    if (e.kind === 'box') voice(at, e.f, e.gain, Math.max(1.1, len * 1.6), [[1, 1], [2, 0.38], [3.01, 0.1], [5.4, 0.05]]);
    else if (e.kind === 'bell') voice(at, e.f, e.gain, 0.9, [[1, 1], [2.76, 0.25]]);
    else if (e.kind === 'harp') voice(at, e.f, e.gain, 1.3, [[1, 1, 'triangle'], [2, 0.2]]);
    else if (e.kind === 'bass') voice(at, e.f, e.gain, Math.max(0.9, len * 0.95), [[1, 1], [2, 0.3]]);
  }

  // 每 0.1 秒看一次：把接下來 0.5 秒內該響的音先排進去（計時器不準，交給音效時鐘才不會掉拍）
  function tick() {
    if (!playing || held) return;
    const horizon = ctx.currentTime + 0.5;
    for (;;) {
      const e = events[index];
      const at = loopAt + e.t * BEAT;
      if (at > horizon) break;
      if (at >= ctx.currentTime - 0.05) play(e, Math.max(at, ctx.currentTime));
      index += 1;
      if (index >= events.length) {
        index = 0;
        loopAt += length * BEAT;
      }
    }
  }

  function start() {
    if (playing || !AudioCtx) return;
    if (!ctx) setup();
    playing = true;
    index = 0;
    loopAt = ctx.currentTime + 0.25;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(0.85, ctx.currentTime, 0.4);
    if (!held) ctx.resume();
    clearInterval(timer);
    timer = setInterval(tick, 100);
    tick();
  }

  function stop() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
  }

  // 暫時停住（時間凍結，回來從同一拍接下去）
  function hold(on) {
    if (held === on) return;
    held = on;
    if (!ctx) return;
    if (on) ctx.suspend();
    else if (playing) ctx.resume();
  }

  // 第一次點畫面才能出聲
  const kick = () => {
    removeEventListener('pointerdown', kick, true);
    removeEventListener('keydown', kick, true);
    if (wanted) start();
  };
  addEventListener('pointerdown', kick, true);
  addEventListener('keydown', kick, true);
  document.addEventListener('visibilitychange', () => hold(document.hidden || paused));

  return {
    get on() { return wanted; },
    /** 開關音樂，並記住這台裝置的選擇。 */
    toggle() {
      wanted = !wanted;
      try { localStorage.setItem(PREF, wanted ? '1' : '0'); } catch { /* 記不住就算了 */ }
      if (wanted) start();
      else stop();
      return wanted;
    },
    /** 看作品（可能有影片）時先安靜。 */
    pause(on) {
      paused = on;
      hold(on || document.hidden);
    },
    /** 找到彩蛋的小鈴聲：音樂開著才響。 */
    chime() {
      if (!wanted || !playing || held) return;
      ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => voice(ctx.currentTime + 0.02 + i * 0.09, hz(n), 0.09, 0.9, [[1, 1], [2.76, 0.2]]));
    },
  };
}
