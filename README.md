# Bernie Leung 個人作品集

由月下整合版複製網站改建的八頁個人作品集，用於 CIS222 / CIS282 個人網站功課。
採用深藍底、藍紫漸變、星空軌道及檔案庫視覺風格，內容為自我介紹與求職作品集。

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

## 沉浸式作品展示

首頁加入全屏星空、旋轉軌道、滑鼠分層效果及四個章節標記。首頁與作品頁設有
大型作品展示，三個作品可透過縮圖、前後按鈕、方向鍵、Home / End 或手機橫掃切換。
展示區沿用原有作品內容與圖片，沒有自動輪播；作品頁仍可搜尋、篩選及閱讀詳情。
頁尾可暫停背景動畫；系統的減少動態設定亦會生效。八個 HTML 頁面、三語及離線開啟方式維持。

版面參考：
- [原神角色頁](https://genshin.hoyoverse.com/zh-tw/character/mondstadt?char=8)：大型圖像、資料與縮圖切換。
- [星穹鐵道首頁](https://hsr.hoyoverse.com/zh-tw/home)：星空氛圍、序號與分層動態。
- [崩壞 3 首頁](https://honkaiimpact3.hoyoverse.com/global/en-us/home)：章節導覽、軌道與介面線條。

這次更新只參考展示方式，使用本作品集已有的圖片與資料。

## 驗證

以靜態伺服器服務 `public/`，在有 Playwright 及 Chrome 的環境執行
`node scripts/verify-portfolio.cjs`。預設位址為 `http://127.0.0.1:8765/`，
可用 `PORTFOLIO_BASE_URL` 覆寫。檢查八頁、三語、四種闊度、深淺主題、
資源與連結、搜尋、對話框、聯絡草稿、入場動畫及手機選單。
