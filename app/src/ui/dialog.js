// RPG 式對話框：表情頭像、逐字出現、選項按鈕。沒有遮罩，不擋畫面操作。
// 之後教職員對話、彩蛋也共用它：傳 name 與 faceUrl 就能換人說話。
const $ = (id) => document.getElementById(id);
const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CHAR_MS = 26;

export function createDialog({ onOpen, onClose }) {
  const box = $('q-dialog');
  const typed = $('q-text');
  const live = $('q-live');
  const opts = $('q-options');
  let timer = null;
  let full = '';
  let closer = null;

  function finishTyping() {
    clearInterval(timer);
    timer = null;
    typed.textContent = full;
  }

  function hide() {
    finishTyping();
    if (box.hidden) return;
    box.hidden = true;
    onClose?.();
  }

  /** 說一句話。options：[{ label, run }]，按了就關框再執行 run（run 可以接著說下一句）。 */
  function say({ face, text, options = [], name = '太平Q雞', faceUrl, onDismiss }) {
    finishTyping();
    full = text;
    closer = onDismiss || null;
    $('q-name').textContent = name;
    $('q-face').src = faceUrl || `./public/qchick/${face || 'happy'}.png`;
    live.textContent = text;
    const list = options.length ? options : [{ label: '好' }];
    opts.replaceChildren(...list.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === 0 ? 'q-opt primary' : 'q-opt';
      b.textContent = o.label;
      b.addEventListener('click', () => {
        closer = null;
        hide();
        o.run?.();
      });
      return b;
    }));
    if (box.hidden) {
      box.hidden = false;
      onOpen?.();
    }
    if (instant) {
      typed.textContent = text;
      return;
    }
    let n = 0;
    typed.textContent = '';
    const chars = [...text]; // 用字元切，表情符號才不會被切開
    timer = setInterval(() => {
      typed.textContent = chars.slice(0, ++n).join('');
      if (n >= chars.length) finishTyping();
    }, CHAR_MS);
  }

  function dismiss() {
    const run = closer;
    closer = null;
    hide();
    run?.();
  }

  $('q-close').addEventListener('click', dismiss);
  $('q-line').addEventListener('click', () => { if (timer) finishTyping(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden && $('viewer').hidden) dismiss(); });

  return { say, close: dismiss, isOpen: () => !box.hidden };
}
