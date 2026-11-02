# 太平群島

新竹縣關西鎮太平國小的學生學習成果 3D 群島。每一屆一座島，點進去看孩子們的作品。

完整規劃見上一層資料夾的 `PRD_v1.0.md`。

網址：https://hs14294hs13961.github.io/tpes-islands/

## 目前進度：P0 骨架

- 9 座島：太平本島、一～六年甲班（跟著屆走）、太平校園島、外圈 114 學年畢業生小島
- 六角格、地標、木棧橋、海、晝夜（即時／清晨／白天／黃昏／夜晚）
- 49 位島民走動：學生穿太平T、老師與行政穿太平 POLO、叔公穿工作背心（暫代造型）
- 點島名或格子，鏡頭飛過去並顯示資訊卡；名牌、暫停、鳥瞰、全景
- 資料用示範資料（`app/src/data/demo.json`），P1 會接上電子書櫃

## 常改的地方

| 想改什麼 | 改哪個檔案 |
|---|---|
| 導師名字、各屆人數、島的位置、本島和校園島的格子 | `app/src/data/islands.js` |
| 科目對應的地標 | `app/src/data/islands.js` 的 `SUBJECT_TYPE` |
| 地標長相 | `app/src/scene/landmarks.js` |
| 品牌色 | `app/styles.css` 開頭與 `islands.js` 的 `PALETTE` |

## 更新示範資料

從電子書櫃的 Sheet 下載 xlsx 後執行：

```bash
python3 tools/make_demo_data.py "../太平國小學生學習成果電子書櫃（資料庫，截至115.11.01）.xlsx"
```

只會輸出「上架」成果的學年度、班級、科目、標題、日期。

## 本機預覽

在 `app` 資料夾開任何靜態伺服器即可，例如：

```bash
cd app && python3 -m http.server 5180
```

再開 http://localhost:5180/

## 發布

推送到 `main` 後，`.github/workflows/pages.yml` 會自動把 `app/` 發布到 GitHub Pages。
第一次要到 GitHub 的 Settings → Pages，Source 選「GitHub Actions」。

## 授權

Three.js 0.169（MIT，見 `app/vendor/three/LICENSE`）。
