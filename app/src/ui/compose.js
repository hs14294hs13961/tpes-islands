// 寫字的小表單：選身分＋輸入框＋字數。留言（預覽視窗）與得報心得（對話框）共用。
import { ROLES } from '../data/staff.js';
import { charCount } from '../data/social.js';

export function createCompose({ min, max, placeholder, rows = 3, onChange }) {
  const root = document.createElement('div');
  root.className = 'compose';
  let role = '';

  const roles = document.createElement('div');
  roles.className = 'compose-roles';
  roles.setAttribute('role', 'radiogroup');
  roles.setAttribute('aria-label', '你的身分');
  const label = document.createElement('span');
  label.className = 'compose-label';
  label.textContent = '我是';
  roles.append(label);
  const chips = ROLES.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'compose-role';
    b.textContent = r;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.addEventListener('click', () => {
      role = r;
      chips.forEach((c) => c.setAttribute('aria-checked', String(c === b)));
      update();
    });
    roles.append(b);
    return b;
  });

  const box = document.createElement('textarea');
  box.className = 'compose-text';
  box.rows = rows;
  box.placeholder = placeholder;
  box.maxLength = max + 40; // 空白不算字數，留一點餘裕
  box.setAttribute('aria-label', placeholder);

  const count = document.createElement('p');
  count.className = 'compose-count';
  count.setAttribute('aria-live', 'polite');

  root.append(roles, box, count);

  const valid = () => !!role && charCount(box.value) >= min && charCount(box.value) <= max;
  function update() {
    const n = charCount(box.value);
    count.textContent = min > 1 ? `${n} 字（${min}～${max} 字）` : `${n}／${max} 字`;
    count.classList.toggle('bad', n > max);
    onChange?.(valid());
  }
  box.addEventListener('input', update);
  update();

  return {
    root,
    valid,
    value: () => ({ role, text: box.value.trim() }),
    reset() {
      box.value = '';
      update();
    },
    focus: () => box.focus(),
  };
}
