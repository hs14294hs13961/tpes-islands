#!/usr/bin/env python3
"""把內建的閱讀島資料（app/src/data/reading.json）轉成「閱讀島內容表.xlsx」。

只在第一次建表時用：上傳到雲端硬碟、存成 Google 試算表之後，內容就以試算表為準，
老師改表格即可，不用再跑這支程式。讀取試算表的介面在 tools/reading_sheet.gs。

用法（只用 Python 內建模組）：
    python3 tools/make_reading_table.py 輸出路徑.xlsx
"""
import json
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

SOURCE = Path(__file__).resolve().parent.parent / 'app/src/data/reading.json'

# 儲存格樣式：0 一般、1 標題列、2 純文字（免得試算表把 115-1、10/7 自動變成日期）、3 粗體、4 自動換行
PLAIN, HEADER, TEXT, BOLD, WRAP = range(5)

LEGEND = [
    (BOLD, '閱讀島內容表：改這張表，閱讀島就會更新（約 5～10 分鐘）'),
    (PLAIN, ''),
    (BOLD, '可以改的地方'),
    (WRAP, '「主題月」「書單」「問題卡」「文章」「活動」「資源」六個分頁的第 2 列以下都可以改。已經填好的資料就是範例，照著加新列即可。'),
    (WRAP, '第 1 列是欄位名稱，網站靠它找資料，請不要改字；欄位順序可以調換。'),
    (PLAIN, ''),
    (BOLD, '填寫規則'),
    (WRAP, '學期＋月份是對應的依據：書單、問題卡等分頁的學期與月份，要和「主題月」那一列相同才會出現在該月。'),
    (WRAP, '展期（開始日、結束日）沒填完整的主題月不會顯示，所以可以先填一半再慢慢補。'),
    (WRAP, '書單的「必讀選讀」填必讀或選讀；「年級」填數字，多個年級用頓號，例如 3、4；留空代表全校都看得到。'),
    (WRAP, '主色填色碼，例如 #DD1367；留空會用預設的紫色。'),
    (WRAP, '連結一律貼 https:// 開頭的完整網址。雲端硬碟的檔案要開「知道連結的使用者可以檢視」，否則學生打不開。'),
    (WRAP, '資源的「類別」填延伸資源（會出現在該月的書展館）或學習單（不分月份，出現在學習單小屋）。'),
    (PLAIN, ''),
    (BOLD, '不要放的東西'),
    (WRAP, '學生姓名、學生照片、問題卡答案。學生成果請走電子書櫃（科目選「太平歲閱」），閱讀成果廊會自動抓。'),
]


def tabs(data):
    """回傳 [(分頁名, [(欄名, 欄寬, 樣式)], [列...])]"""
    months = data['months']
    each = lambda key: [(m, x) for m in months for x in m[key]]
    return [
        ('主題月', [('學期', 8, TEXT), ('月份', 6, PLAIN), ('SDG', 6, PLAIN), ('主題', 16, PLAIN), ('開始日', 12, TEXT),
                 ('結束日', 12, TEXT), ('主色', 10, TEXT), ('一句話', 60, PLAIN), ('三折頁連結', 24, PLAIN),
                 ('書單連結', 24, PLAIN), ('月報連結', 24, PLAIN), ('簡報連結', 24, PLAIN)],
         [[m['term'], m['month'], m['sdg'], m['theme'], m['start'], m['end'], m['color'], m['blurb'],
           m['links'].get('trifold', ''), m['links'].get('booklist', ''), m['links'].get('report', ''),
           m['links'].get('slides', '')] for m in months]),
        ('書單', [('學期', 8, TEXT), ('月份', 6, PLAIN), ('書名', 44, PLAIN), ('出版社', 14, PLAIN),
                ('必讀選讀', 9, PLAIN), ('適用說明', 12, PLAIN), ('年級', 10, TEXT)],
         [[m['term'], m['month'], b['title'], b['publisher'], '必讀' if b['required'] else '選讀', b['level'],
           '、'.join(map(str, b['grades']))] for m, b in each('books')]),
        ('問題卡', [('學期', 8, TEXT), ('月份', 6, PLAIN), ('年級', 6, PLAIN), ('題號', 6, PLAIN), ('題目', 80, PLAIN)],
         [[m['term'], m['month'], q['grade'], q['no'], q['text']] for m, q in each('questions')]),
        ('文章', [('學期', 8, TEXT), ('月份', 6, PLAIN), ('標題', 44, PLAIN), ('期數', 6, PLAIN), ('專欄', 26, PLAIN),
                ('星等', 6, PLAIN), ('連結', 52, PLAIN)],
         [[m['term'], m['month'], a['title'], a['issue'], a['column'], a['stars'], a['url']] for m, a in each('articles')]),
        ('活動', [('學期', 8, TEXT), ('月份', 6, PLAIN), ('日期', 8, TEXT), ('活動', 22, PLAIN), ('說明', 60, PLAIN)],
         [[m['term'], m['month'], e['date'], e['name'], e['note']] for m, e in each('events')]),
        ('資源', [('類別', 10, PLAIN), ('學期', 8, TEXT), ('月份', 6, PLAIN), ('名稱', 28, PLAIN), ('適用', 12, PLAIN),
                ('連結', 52, PLAIN)],
         [['延伸資源', m['term'], m['month'], x['name'], '', x['url']] for m, x in each('extras')]
         + [['學習單', '', '', w['name'], w['level'], w['url']] for w in data['worksheets']]),
    ]


def col_name(i):
    name = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        name = chr(65 + r) + name
    return name


def cell(ref, value, style):
    if value == '' or value is None:
        return f'<c r="{ref}" s="{style}"/>' if style else ''
    if isinstance(value, (int, float)):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>'


def sheet_xml(columns, rows):
    cols = ''.join(f'<col min="{i + 1}" max="{i + 1}" width="{w}" style="{s}" customWidth="1"/>'
                   for i, (_, w, s) in enumerate(columns))
    head = ''.join(cell(f'{col_name(i)}1', n, HEADER) for i, (n, _, _) in enumerate(columns))
    body = ''
    for r, row in enumerate(rows, start=2):
        cells = ''.join(cell(f'{col_name(i)}{r}', v, columns[i][2]) for i, v in enumerate(row))
        body += f'<row r="{r}">{cells}</row>'
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
            '</sheetView></sheetViews>'
            f'<cols>{cols}</cols><sheetData><row r="1">{head}</row>{body}</sheetData></worksheet>')


def legend_xml():
    rows = ''.join(f'<row r="{r}">{cell(f"A{r}", text, style)}</row>' for r, (style, text) in enumerate(LEGEND, start=1))
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<cols><col min="1" max="1" width="90" customWidth="1"/></cols><sheetData>{rows}</sheetData></worksheet>')


STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
          '<fonts count="3"><font><sz val="11"/><name val="Arial"/></font>'
          '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>'
          '<font><b/><sz val="11"/><name val="Arial"/></font></fonts>'
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
          '<fill><patternFill patternType="solid"><fgColor rgb="FF7D62B8"/></patternFill></fill></fills>'
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
          '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>'
          '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>'
          '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">'
          '<alignment wrapText="1" vertical="top"/></xf></cellXfs>'
          '</styleSheet>')


def build(data, out):
    sheets = [('說明', legend_xml())] + [(n, sheet_xml(c, r)) for n, c, r in tabs(data)]
    ns = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    pkg = 'http://schemas.openxmlformats.org/package/2006'
    overrides = ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
                        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                        for i in range(1, len(sheets) + 1))
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   f'<Types xmlns="{pkg}/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                   f'{overrides}</Types>')
        z.writestr('_rels/.rels',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   f'<Relationships xmlns="{pkg}/relationships">'
                   f'<Relationship Id="rId1" Type="{ns}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        entries = ''.join(f'<sheet name="{n}" sheetId="{i}" r:id="rId{i}"/>' for i, (n, _) in enumerate(sheets, start=1))
        z.writestr('xl/workbook.xml',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   f'xmlns:r="{ns}"><sheets>{entries}</sheets></workbook>')
        rels = ''.join(f'<Relationship Id="rId{i}" Type="{ns}/worksheet" Target="worksheets/sheet{i}.xml"/>'
                       for i in range(1, len(sheets) + 1))
        z.writestr('xl/_rels/workbook.xml.rels',
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   f'<Relationships xmlns="{pkg}/relationships">{rels}'
                   f'<Relationship Id="rId{len(sheets) + 1}" Type="{ns}/styles" Target="styles.xml"/></Relationships>')
        z.writestr('xl/styles.xml', STYLES)
        for i, (_, xml) in enumerate(sheets, start=1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', xml)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(json.loads(SOURCE.read_text(encoding='utf8')), sys.argv[1])
    print('已產生', sys.argv[1])
