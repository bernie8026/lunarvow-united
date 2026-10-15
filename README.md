# Bernie Leung 個人作品集

由月下整合版複製網站改建的八頁個人作品集，用於 CIS222 / CIS282 個人網站功課。
採用深藍底、藍紫漸變、網格及檔案庫視覺風格，內容改為自我介紹與求職作品集。

## 網站頁面

`index.html`、`about.html`、`experience.html`、`education.html`、`skills.html`、
`projects.html`、`contact.html`、`sitemap.html`。

支援香港繁體中文、英文、簡體中文；手機導覽、深淺主題、作品搜尋與分類、
技能分類、項目詳情、可展開的學習記錄，以及聯絡訊息草稿。
保留原站入站動畫：旋轉光環、粒子、至少 10 秒、Skip 與揭幕；加入捲動入場、
轉頁、按鈕及圖片動效，頁尾可重播。進度來自實際素材載入，尊重減少動態設定。
聯絡表格只整理、複製或下載訊息，不會直接發送。網站不需後端或外部依賴。

## 原始檔與發佈

- `public/`：可直接開啟的完整個人作品集原始檔
- `docs/`：GitHub Pages 發佈版本；包含舊版網址的導向頁面
- `source/lunarvow/`：原月下網站的來源快照，供保留歷史；不會複製進新發佈網站
- `scripts/prepare-site.cjs`：由 `public/` 產生 `docs/`

更新 `public/` 後執行：

```sh
node scripts/prepare-site.cjs
```

GitHub Pages 保持 **main /docs**。可提交 ZIP 只需包含完整 `public/` 內容，
放在同一個根資料夾；解壓後開啟 `index.html` 即可。

## 內容與圖片

個人內容以已提供的學生、兼職、網站、攝影及 STEM 項目背景整理；
未列未確認的工作日期、成績或證書。提交及求職前可再更新個人資料。
自製向量示意圖不當作真人肖像、已完成產品或實拍攝影作品。
月下項目所用遊戲插畫版權屬原權利持有人，原素材來源記錄保留於
`public/assets/LUNAR-ART-CREDITS.md`。
