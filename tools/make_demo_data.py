#!/usr/bin/env python3
"""把電子書櫃匯出的 xlsx 轉成群島的示範資料（app/src/data/demo.json）。

用途：電子書櫃的唯讀介面接上之前（P1），群島先用這份資料長出格子與數字；
接上之後，抓不到即時資料時也會退回這份。

只輸出「上架」成果的公開欄位：學年度、班級、科目、標題、上傳日期。
不輸出編輯碼、檔案 ID、瀏覽數以外的任何內部欄位。

用法（只用 Python 內建模組）：
    python3 tools/make_demo_data.py "../太平國小學生學習成果電子書櫃（資料庫，截至115.11.01）.xlsx"
"""
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "src" / "data" / "demo.json"
GRADE = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6}
RECENT_COUNT = 12


def read_sheet(xlsx, sheet_index=1):
    """讀 xlsx 第 N 張工作表，回傳 [{欄位字母: 值}]。"""
    with zipfile.ZipFile(xlsx) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            t = z.read("xl/sharedStrings.xml").decode("utf8")
            for si in re.findall(r"<si>(.*?)</si>", t, re.S):
                shared.append("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S)))
        t = z.read(f"xl/worksheets/sheet{sheet_index}.xml").decode("utf8")
    rows = []
    for r in re.findall(r"<row[^>]*>(.*?)</row>", t, re.S):
        row = {}
        for col, attrs, inner in re.findall(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', r, re.S):
            v = re.search(r"<v>(.*?)</v>", inner or "")
            v = v.group(1) if v else ""
            if 't="s"' in attrs and v:
                v = shared[int(v)]
            row[col] = unescape(v)
        rows.append(row)
    return rows


def unescape(s):
    return s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")


def excel_date(serial):
    return date(1899, 12, 30) + timedelta(days=int(float(serial)))


def main():
    if len(sys.argv) < 2:
        sys.exit("請提供 xlsx 路徑")
    rows = read_sheet(sys.argv[1])
    header, body = rows[0], rows[1:]
    col = {name: letter for letter, name in header.items()}

    records = []
    for r in body:
        if r.get(col["狀態"]) != "上架":
            continue
        records.append({
            "year": int(float(r[col["學年度"]])),
            "cls": r.get(col["班級"], ""),
            "subject": r.get(col["科目"], ""),
            "title": r.get(col["標題"], ""),
            "date": excel_date(r[col["上傳時間"]]),
        })

    current_year = max(x["year"] for x in records)
    as_of = max(x["date"] for x in records)
    cohorts = defaultdict(Counter)  # 入學學年度 → 科目件數
    hub = Counter()
    for x in records:
        m = re.match(r"([一二三四五六])年", x["cls"])
        if m:  # 依「學年度 − 年級 + 1」換算入學學年度，島跟著屆走
            cohorts[str(x["year"] - GRADE[m.group(1)] + 1)][x["subject"]] += 1
        else:  # 跨年級、跨年級－全校…
            hub[x["subject"]] += 1

    recent = sorted(records, key=lambda x: x["date"], reverse=True)[:RECENT_COUNT]
    data = {
        "source": "demo",
        "asOf": as_of.isoformat(),
        "currentYear": current_year,
        "totals": {
            "records": len(records),
            "thisYear": sum(1 for x in records if x["year"] == current_year),
            "week": sum(1 for x in records if x["date"] > as_of - timedelta(days=7)),
        },
        "cohorts": {k: {"total": sum(v.values()), "subjects": dict(v.most_common())} for k, v in sorted(cohorts.items())},
        "hub": {"total": sum(hub.values()), "subjects": dict(hub.most_common())},
        "recent": [{**x, "date": x["date"].isoformat()} for x in recent],
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")
    print(f"已輸出 {OUT}：{len(records)} 筆上架成果，資料截至 {as_of}")


if __name__ == "__main__":
    main()
