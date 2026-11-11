// 3D 校園小遊戲：直接在群島頁面上用全螢幕框打開（不開新分頁），
// 玩完按「回到群島」或右上角 ✕，3D 校園會通知這裡收起來，回到剛剛的畫面。
// 兩個網站在同一個網域，存檔共用，拿到的彩蛋收起來時就會跳出卡片。
export function createGameOverlay({ mapUrl, onOpen, onClose }) {
  const origin = new URL(mapUrl, location.href).origin;
  let box = null;

  function close() {
    if (!box) return;
    clearTimeout(rescue);
    box.remove();
    box = null;
    document.body.classList.remove('game-open');
    onClose?.();
  }

  let ready = false;
  let rescue = 0;
  addEventListener('message', (e) => {
    if (e.origin !== origin || e.data?.type !== 'tpes-game') return;
    if (e.data.action === 'ready') ready = true;
    if (e.data.action === 'close') close();
  });

  function open(game) {
    if (box) return;
    box = document.createElement('div');
    box.className = 'game-overlay';
    const frame = document.createElement('iframe');
    frame.src = `${mapUrl}?game=${encodeURIComponent(game)}&from=islands&embed=1`;
    frame.title = '3D 校園小遊戲';
    frame.allow = 'fullscreen';
    frame.addEventListener('load', () => frame.focus()); // 鍵盤操作直接進遊戲
    box.append(frame);
    document.body.append(box);
    document.body.classList.add('game-open');
    // 遊戲那邊 12 秒都沒回報「準備好了」（網路斷了、載入失敗）：遊戲裡的 ✕ 也出不來，這裡補一顆退路
    ready = false;
    clearTimeout(rescue);
    rescue = setTimeout(() => {
      if (!box || ready) return;
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'q-opt primary game-rescue';
      back.textContent = '小遊戲沒有打開？回到群島';
      back.addEventListener('click', close);
      box.append(back);
    }, 12000);
    onOpen?.();
  }

  return { open, close, get isOpen() { return !!box; } };
}
