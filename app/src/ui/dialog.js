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

  /**
   * 說一句話。options：[{ label, run, keep, disabled }]，按了就關框再執行 run（run 可以接著說下一句）；
   * keep：按了不關框（送出表單時用）。extra：放在台詞下面的元素（例如寫心得的表單）。
   * 回傳這次的按鈕，方便表單依內容啟用「送出」。
   */
  function say({ face, text, options = [], name = '太平Q雞', faceUrl, onDismiss, extra }) {
    finishTyping();
    full = text;
    closer = onDismiss || null;
    $('q-name').textContent = name;
    $('q-face').src = faceUrl || `./public/qchick/${face || 'happy'}.png`;
    live.textContent = text;
    const list = options.length ? options : [{ label: '好' }];
    const buttons = list.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === 0 ? 'q-opt primary' : 'q-opt';
      b.textContent = o.label;
      b.disabled = !!o.disabled;
      b.addEventListener('click', () => {
        if (o.keep) { o.run?.(); return; }
        closer = null;
        hide();
        o.run?.();
      });
      return b;
    });
    opts.replaceChildren(...buttons);
    $('q-extra').replaceChildren(...(extra ? [extra] : []));
    box.classList.toggle('wide', !!extra);
    if (box.hidden) {
      box.hidden = false;
      onOpen?.();
    }
    if (instant) {
      typed.textContent = text;
      return buttons;
    }
    let n = 0;
    typed.textContent = '';
    const chars = [...text]; // 用字元切，表情符號才不會被切開
    timer = setInterval(() => {
      typed.textContent = chars.slice(0, ++n).join('');
      if (n >= chars.length) finishTyping();
    }, CHAR_MS);
    return buttons;
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
