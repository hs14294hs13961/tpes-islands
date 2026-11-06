// 閱讀島內容表的唯讀介面：把試算表轉成閱讀島要的 JSON（和 app/src/data/reading.json 同格式）。
// 貼在「閱讀島內容表」試算表的 擴充功能 → Apps Script，部署成網頁應用程式。
// 這是獨立專案，和電子書櫃無關：這裡再怎麼改都碰不到上傳功能。只讀不寫。
// 老師填的內容可能缺欄、格式不一，一律整理過才輸出；填一半的主題月直接略過，不會弄壞網站。

const CACHE_KEY = 'reading-v1';
const CACHE_SECONDS = 300; // 老師改完表最慢 5 分鐘生效
const DEFAULT_COLOR = '#7d62b8';

function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'upload') {
    return HtmlService.createHtmlOutput(UPLOAD_PAGE)
      .setTitle('閱讀島資料上傳')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  const cache = CacheService.getScriptCache();
  let json = cache.get(CACHE_KEY);
  if (!json) {
    json = JSON.stringify(buildReading_(SpreadsheetApp.getActiveSpreadsheet()));
    try {
      cache.put(CACHE_KEY, json, CACHE_SECONDS);
    } catch (e) { /* 超過快取上限（100 KB）：不快取，每次重讀就好 */ }
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** 把一個分頁讀成物件陣列，以第 1 列的欄名為鍵；全空的列略過。分頁不存在就回空陣列。 */
function readTab_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const [head, ...rows] = sheet.getDataRange().getValues();
  const names = head.map((h) => String(h).trim());
  return rows
    .filter((row) => row.some((v) => v !== ''))
    .map((row) => Object.fromEntries(names.map((n, i) => [n, row[i]])));
}

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

/** 一律轉文字；日期格子（老師打 10/7 會被試算表自動轉成日期）用 format 還原。 */
function text_(v, tz, format) {
  if (isDate_(v)) return Utilities.formatDate(v, tz, format || 'yyyy-MM-dd');
  return String(v === undefined || v === null ? '' : v).trim();
}

function num_(v) {
  const n = Number(v);
  return v !== '' && Number.isFinite(n) ? n : 0;
}

/** 整理成 2026-10-07。民國年（115/10/7，或被試算表當成西元 115 年的日期）也接受；看不懂回空字串。 */
function isoDate_(v, tz) {
  const m = text_(v, tz).match(/^(\d{3,4})\D(\d{1,2})\D(\d{1,2})/);
  if (!m) return '';
  const year = Number(m[1]) < 1911 ? Number(m[1]) + 1911 : Number(m[1]);
  return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function url_(v, tz) {
  const u = text_(v, tz);
  return /^https:\/\//.test(u) ? u : '';
}

function grades_(v, tz) {
  const found = text_(v, tz).match(/[1-6]/g) || [];
  return [...new Set(found.map(Number))];
}

function buildReading_(ss) {
  const tz = ss.getSpreadsheetTimeZone();
  const keyOf = (r) => `${text_(r['學期'], tz)}-${num_(r['月份'])}`;

  // 其他分頁先依「學期-月份」分組
  const groupBy = (rows) => {
    const groups = {};
    rows.forEach((r) => { (groups[keyOf(r)] = groups[keyOf(r)] || []).push(r); });
    return groups;
  };
  const books = groupBy(readTab_(ss, '書單'));
  const questions = groupBy(readTab_(ss, '問題卡'));
  const articles = groupBy(readTab_(ss, '文章'));
  const events = groupBy(readTab_(ss, '活動'));
  const resources = readTab_(ss, '資源');
  const isSheet = (r) => text_(r['類別'], tz).includes('學習單');
  const extras = groupBy(resources.filter((r) => !isSheet(r)));

  const months = readTab_(ss, '主題月')
    .map((r) => {
      const key = keyOf(r);
      const links = {};
      [['trifold', '三折頁連結'], ['booklist', '書單連結'], ['report', '月報連結'], ['slides', '簡報連結']].forEach(([k, col]) => {
        const u = url_(r[col], tz);
        if (u) links[k] = u;
      });
      const color = text_(r['主色'], tz);
      return {
        id: `${text_(r['學期'], tz)}-${String(num_(r['月份'])).padStart(2, '0')}`,
        term: text_(r['學期'], tz),
        month: num_(r['月份']),
        sdg: num_(r['SDG']),
        theme: text_(r['主題'], tz),
        start: isoDate_(r['開始日'], tz),
        end: isoDate_(r['結束日'], tz),
        color: /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLOR,
        blurb: text_(r['一句話'], tz),
        links,
        extras: (extras[key] || [])
          .map((x) => ({ name: text_(x['名稱'], tz), url: url_(x['連結'], tz) }))
          .filter((x) => x.name && x.url),
        books: (books[key] || [])
          .map((b) => ({
            title: text_(b['書名'], tz),
            publisher: text_(b['出版社'], tz),
            required: text_(b['必讀選讀'], tz).includes('必讀'),
            level: text_(b['適用說明'], tz),
            grades: grades_(b['年級'], tz),
          }))
          .filter((b) => b.title),
        questions: (questions[key] || [])
          .map((q) => ({ grade: num_(q['年級']), no: num_(q['題號']), text: text_(q['題目'], tz) }))
          .filter((q) => q.grade && q.text),
        articles: (articles[key] || [])
          .map((a) => ({
            title: text_(a['標題'], tz),
            issue: num_(a['期數']),
            column: text_(a['專欄'], tz),
            stars: num_(a['星等']),
            url: url_(a['連結'], tz),
          }))
          .filter((a) => a.title),
        events: (events[key] || [])
          .map((e) => ({ date: text_(e['日期'], tz, 'M/d'), name: text_(e['活動'], tz), note: text_(e['說明'], tz) }))
          .filter((e) => e.name),
      };
    })
    .filter((m) => m.month && m.theme && m.start && m.end);

  return {
    source: 'sheet',
    months,
    worksheets: resources
      .filter(isSheet)
      .map((w) => ({ name: text_(w['名稱'], tz), level: text_(w['適用'], tz), url: url_(w['連結'], tz) }))
      .filter((w) => w.name),
  };
}

// ─── 上傳頁（網址加 ?page=upload）───────────────────────────────
// 檔案存到試算表所在資料夾底下的「學習單」或「115-1/11_SDG10」，開成知道連結可檢視，連結自動填回內容表。
// 網頁應用程式是公開的，所以每個動作都要驗證上傳密碼（指令碼屬性 UPLOAD_CODE，不寫在程式裡）。

const MAX_UPLOAD_MB = 35; // Apps Script 單次傳輸上限約 50 MB，base64 會膨脹三分之一
const MONTH_COLUMNS = { trifold: '三折頁連結', booklist: '書單連結', report: '月報連結', slides: '簡報連結' };

function checkCode_(code) {
  const saved = PropertiesService.getScriptProperties().getProperty('UPLOAD_CODE');
  if (!saved) throw new Error('還沒設定上傳密碼（專案設定 → 指令碼屬性 → UPLOAD_CODE）');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('upload-fails') || 0);
  if (fails >= 10) throw new Error('密碼錯誤太多次，請 10 分鐘後再試');
  if (String(code) !== saved) {
    cache.put('upload-fails', String(fails + 1), 600);
    throw new Error('上傳密碼不正確');
  }
}

/** 登入：驗證密碼，回傳可選的主題月。 */
function uploadInfo(code) {
  checkCode_(code);
  const months = buildReading_(SpreadsheetApp.getActiveSpreadsheet()).months
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .map((m) => ({ term: m.term, month: m.month, label: `${m.term}・${m.month} 月・SDG ${m.sdg}` }));
  return { months, maxMb: MAX_UPLOAD_MB };
}

function childFolder_(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function targetFolder_(ss, kind, month) {
  const parents = DriveApp.getFileById(ss.getId()).getParents();
  const root = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  if (kind === 'worksheet') return childFolder_(root, '學習單');
  const mm = String(month.month).padStart(2, '0');
  return childFolder_(childFolder_(root, month.term), `${mm}_SDG${month.sdg}`);
}

/** 新增一列。先設成純文字，免得 115-1 被試算表轉成日期。 */
function appendRow_(sheet, names, values) {
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, names.length).setNumberFormat('@')
    .setValues([names.map((n) => (values[n] === undefined ? '' : String(values[n])))]);
}

function writeLink_(ss, kind, month, name, url) {
  const tz = ss.getSpreadsheetTimeZone();
  const tab = MONTH_COLUMNS[kind] ? '主題月' : '資源';
  const sheet = ss.getSheetByName(tab);
  if (!sheet) throw new Error(`內容表找不到「${tab}」分頁`);
  const [head, ...rows] = sheet.getDataRange().getValues();
  const names = head.map((h) => String(h).trim());
  const col = (n) => names.indexOf(n);
  const sameMonth = (r) => text_(r[col('學期')], tz) === month.term && num_(r[col('月份')]) === month.month;

  let index = -1;
  let column = '連結';
  if (MONTH_COLUMNS[kind]) {
    column = MONTH_COLUMNS[kind];
    index = rows.findIndex(sameMonth);
  } else if (kind === 'worksheet') {
    // 用年段對應既有的學習單列（閱讀心得單（中年級）），對不到就新增
    const level = (name.match(/[一二中高]年級/) || [])[0];
    index = level ? rows.findIndex((r) => text_(r[col('類別')], tz).includes('學習單') && text_(r[col('名稱')], tz).includes(level)) : -1;
    if (index < 0) appendRow_(sheet, names, { 類別: '學習單', 名稱: name, 連結: url });
  } else {
    index = rows.findIndex((r) => text_(r[col('類別')], tz).includes('延伸') && sameMonth(r) && text_(r[col('名稱')], tz) === name);
    if (index < 0) appendRow_(sheet, names, { 類別: '延伸資源', 學期: month.term, 月份: month.month, 名稱: name, 連結: url });
  }
  if (index >= 0) {
    if (col(column) < 0) throw new Error(`「${tab}」分頁找不到「${column}」欄`);
    sheet.getRange(index + 2, col(column) + 1).setValue(url);
  }
}

/** 收一個檔案：f = { name, mimeType, base64, kind, term, month }。 */
function uploadFile(code, f) {
  checkCode_(code);
  const name = String(f.name || '').trim();
  if (!/\.(pdf|docx?|pptx?|jpe?g|png)$/i.test(name)) throw new Error('只收 PDF、Word、PowerPoint、JPG、PNG');
  if (f.kind !== 'worksheet' && f.kind !== 'extra' && !MONTH_COLUMNS[f.kind]) throw new Error('沒有這個種類');
  const bytes = Utilities.base64Decode(f.base64);
  if (bytes.length > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`超過 ${MAX_UPLOAD_MB} MB`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const month = buildReading_(ss).months.find((m) => m.term === f.term && m.month === Number(f.month));
  if (!month && f.kind !== 'worksheet') throw new Error('內容表的「主題月」沒有這個月');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const file = targetFolder_(ss, f.kind, month).createFile(Utilities.newBlob(bytes, f.mimeType, name));
    let warning = '';
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      warning = '學校帳號不允許自動開權限，請到資料夾手動開「知道連結的使用者可以檢視」';
    }
    writeLink_(ss, f.kind, month, name.replace(/\.[^.]+$/, ''), file.getUrl());
    CacheService.getScriptCache().remove(CACHE_KEY);
    return { url: file.getUrl(), warning };
  } finally {
    lock.releaseLock();
  }
}

const UPLOAD_PAGE = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 20px 16px 40px; background: #f7f1e6; color: #2b201c; font: 15px/1.6 "PingFang TC","Noto Sans TC",sans-serif; }
  main { max-width: 760px; margin: auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p { margin: 4px 0 14px; color: #6f645d; }
  input[type=password], select { font: inherit; padding: 8px 10px; border: 1px solid #d8cfc3; border-radius: 10px; background: #fff; }
  button { font: inherit; font-weight: 700; padding: 9px 18px; border: 0; border-radius: 10px; background: #7d62b8; color: #fff; cursor: pointer; }
  button:disabled { background: #c9c2d6; cursor: default; }
  #drop { display: block; padding: 34px 16px; margin-bottom: 14px; text-align: center; border: 2px dashed #b9a7dd; border-radius: 14px; background: #fff; cursor: pointer; }
  #drop.over { background: #efe9fa; }
  .file { display: grid; grid-template-columns: 1fr auto auto; gap: 6px 8px; align-items: center; padding: 10px 12px; margin-bottom: 8px; background: #fff; border-radius: 12px; }
  .file .name { word-break: break-all; font-weight: 600; }
  .file .msg { grid-column: 1 / -1; font-size: 13px; color: #6f645d; }
  .file .msg.warn { color: #c0392b; font-weight: 600; }
  .file .msg.ok { color: #2f7d3a; font-weight: 600; }
  .confirm { display: block; margin: 14px 0; padding: 10px 12px; background: #fdf1d6; border-radius: 10px; }
  #error { color: #c0392b; font-weight: 600; }
  @media (max-width: 560px) { .file { grid-template-columns: 1fr 1fr; } .file .name { grid-column: 1 / -1; } }
</style>
<main>
  <h1>閱讀島資料上傳</h1>
  <p>把檔案全部拖進來，確認月份與種類後上傳。檔案會存進雲端資料夾，連結自動填進內容表。</p>
  <form id="login">
    <input id="code" type="password" placeholder="上傳密碼" autocomplete="current-password" aria-label="上傳密碼">
    <button>進入</button>
  </form>
  <p id="error" role="alert"></p>
  <section id="work" hidden>
    <label id="drop">把檔案拖到這裡，或點一下選檔（可一次選很多個）
      <input id="pick" type="file" multiple hidden>
    </label>
    <div id="list"></div>
    <div id="actions" hidden>
      <label class="confirm"><input id="ok" type="checkbox"> 我確認這些檔案<b>沒有學生姓名、學生照片、問題卡答案</b>。上傳後知道連結的人都能看。</label>
      <button id="send" disabled>開始上傳</button>
      <p id="done" role="status"></p>
    </div>
  </section>
</main>
<script>
var KINDS = [['booklist','書單'],['trifold','三折頁'],['report','月報'],['slides','開閉幕簡報'],['worksheet','學習單'],['extra','延伸資源'],['skip','不上傳']];
var code = '', months = [], maxMb = 35, items = [];
var $ = function (id) { return document.getElementById(id); };

function call(fn) {
  var args = [].slice.call(arguments, 1);
  return new Promise(function (ok, fail) {
    var r = google.script.run.withSuccessHandler(ok).withFailureHandler(fail);
    r[fn].apply(r, args);
  });
}
function guess(n) {
  if (!/[.](pdf|docx?|pptx?|jpe?g|png)$/i.test(n)) return { kind: 'skip', warn: '這種檔案不能上傳' };
  if (/答案|編號|全校成果|提問方向|姓名|名單/.test(n)) return { kind: 'skip', warn: '可能有學生資料或答案，預設不上傳。確認沒問題再改種類。' };
  if (/得報/.test(n)) return { kind: 'skip', note: '得報文章放連結就好，不放檔案。' };
  if (/問題卡/.test(n)) return { kind: 'skip', note: '問題卡題目已在內容表，不用上傳。' };
  if (/心得單|學習單/.test(n)) return { kind: 'worksheet' };
  if (/抽獎|開幕|閉幕|簡報/.test(n)) return { kind: 'slides', note: '上傳前請確認簡報裡沒有學生正面照。' };
  if (/書目|書單/.test(n)) return { kind: 'booklist' };
  if (/三折頁|主題書展\\s*SDG/i.test(n)) return { kind: 'trifold' };
  if (/月報/.test(n)) return { kind: 'report', note: '上傳前請確認月報裡沒有學生正面照與全名。' };
  return { kind: 'extra' };
}
function guessMonth(n) {
  var m = n.match(/(\\d{1,2})\\s*月/);
  var hit = -1;
  if (m) months.forEach(function (x, i) { if (x.month === Number(m[1])) hit = i; });
  return hit >= 0 ? hit : months.length - 1;
}
function select(options, value) {
  var s = document.createElement('select');
  options.forEach(function (o) {
    var e = document.createElement('option');
    e.value = o[0]; e.textContent = o[1];
    s.append(e);
  });
  s.value = String(value);
  return s;
}
function refresh() {
  var any = items.some(function (i) { return i.kind.value !== 'skip' && !i.done; });
  $('actions').hidden = !items.length;
  $('send').disabled = !any || !$('ok').checked;
}
function add(files) {
  [].forEach.call(files, function (file) {
    var g = guess(file.name);
    var row = document.createElement('div');
    row.className = 'file';
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = file.name;
    var month = select(months.map(function (m, i) { return [i, m.label]; }), guessMonth(file.name));
    var kind = select(KINDS, g.kind);
    var msg = document.createElement('span');
    var big = file.size > maxMb * 1048576;
    if (big) kind.value = 'skip';
    msg.className = 'msg' + (g.warn || big ? ' warn' : '');
    msg.textContent = big ? '超過 ' + maxMb + ' MB，傳不上去，請先壓縮。' : (g.warn || g.note || '');
    var syncMonth = function () { month.disabled = kind.value === 'worksheet' || kind.value === 'skip'; refresh(); };
    kind.addEventListener('change', syncMonth);
    row.append(name, month, kind, msg);
    $('list').append(row);
    items.push({ file: file, month: month, kind: kind, msg: msg, done: false });
    syncMonth();
  });
  refresh();
}
function base64(file) {
  return new Promise(function (ok, fail) {
    var r = new FileReader();
    r.onload = function () { ok(String(r.result).split(',')[1]); };
    r.onerror = fail;
    r.readAsDataURL(file);
  });
}
$('login').addEventListener('submit', function (e) {
  e.preventDefault();
  $('error').textContent = '';
  code = $('code').value;
  call('uploadInfo', code).then(function (info) {
    months = info.months; maxMb = info.maxMb;
    $('login').hidden = true;
    $('work').hidden = false;
  }).catch(function (err) { $('error').textContent = err.message; });
});
$('pick').addEventListener('change', function () { add(this.files); this.value = ''; });
var drop = $('drop');
['dragover', 'dragenter'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop', function (e) { add(e.dataTransfer.files); });
$('ok').addEventListener('change', refresh);
$('send').addEventListener('click', async function () {
  var todo = items.filter(function (i) { return i.kind.value !== 'skip' && !i.done; });
  $('send').disabled = true;
  var fails = 0;
  for (var n = 0; n < todo.length; n++) {
    var it = todo[n], m = months[Number(it.month.value)] || {};
    it.msg.className = 'msg';
    it.msg.textContent = '上傳中…';
    try {
      var r = await call('uploadFile', code, { name: it.file.name, mimeType: it.file.type || 'application/octet-stream', base64: await base64(it.file), kind: it.kind.value, term: m.term, month: m.month });
      it.done = true;
      it.kind.disabled = it.month.disabled = true;
      it.msg.className = 'msg ' + (r.warning ? 'warn' : 'ok');
      it.msg.textContent = r.warning || '完成，連結已填入內容表';
    } catch (err) {
      fails++;
      it.msg.className = 'msg warn';
      it.msg.textContent = '失敗：' + err.message;
    }
  }
  $('done').textContent = fails ? fails + ' 個失敗，可以再按一次重傳。' : '全部完成！閱讀島約 10 分鐘內會更新。';
  refresh();
});
</script>`;
