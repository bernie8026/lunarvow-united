# Bernie Leung 個人作品集

由月下整合版複製網站改建的八頁個人作品集，用於 CIS222 / CIS282 個人網站功課。
採用深藍底、藍紫漸變、星空軌道及檔案庫視覺風格，內容為自我介紹與求職作品集。

## 網站頁面

`index.html`、`about.html`、`experience.html`、`education.html`、`skills.html`、
`projects.html`、`contact.html`、`sitemap.html`。

支援香港繁體中文、英文、簡體中文；手機導覽、深淺主題、作品搜尋與分類、
技能分類、項目詳情、可展開的學習記錄，以及聯絡訊息草稿。
保留原站入站動畫：旋轉光環、粒子、至少 10 秒、Skip 與揭幕，頁尾可重播。
頁內動態按內容設計，包括首頁景深與流星、教育時間線、作品專屬轉場、器材互動及技能篩選。
頁尾可暫停動畫；閱讀及轉頁即時回應。
進度來自實際素材載入，尊重減少動態設定。
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
頁尾可暫停動畫；系統的減少動態設定亦會生效。八個 HTML 頁面、三語及離線開啟方式維持。

版面參考：
- [原神角色頁](https://genshin.hoyoverse.com/zh-tw/character/mondstadt?char=8)：大型圖像、資料與縮圖切換。
- [星穹鐵道首頁](https://hsr.hoyoverse.com/zh-tw/home)：星空氛圍、序號與分層動態。
- [崩壞 3 首頁](https://honkaiimpact3.hoyoverse.com/global/en-us/home)：章節導覽、軌道與介面線條。

這次更新只參考展示方式，使用本作品集已有的圖片與資料。

## 驗證

執行 `node scripts/serve-preview.cjs` 可在本機 `http://127.0.0.1:8766/` 預覽。
以靜態伺服器服務 `public/`，在有 Playwright 及 Chrome 的環境執行
`node scripts/verify-portfolio.cjs`。預設位址為 `http://127.0.0.1:8765/`，
可用 `PORTFOLIO_BASE_URL` 覆寫。檢查八頁、三語、四種闊度、深淺主題、
資源與連結、搜尋、對話框、聯絡草稿、入場動畫及手機選單。

## 院校與器材資料（2026-10-15）

教育頁加入聖方濟各大學官方校園圖片、歷程、地址交通及獨立標示的 HDAI-ICT 公開課程參考。
作品頁加入 Nikon D5300 相機、Godox V480N 閃光燈及 Ryze Tello EDU 四旋翼無人機參考圖與規格。
Tello EDU 只作 Aerovate 概念參考；相機圖中的鏡頭不代表使用者的鏡頭型號。
來源連結及圖片署名隨頁面顯示，詳細記錄在 `public/assets/education/asset-credits.md`
與 `public/assets/equipment/asset-credits.md`。新增內容支援三語及離線開啟。

## 多樣化排版

各頁按內容採用不同形式：教育頁的校園長圖及時間線、作品頁的圖像專題與器材規格、
工作經驗的連續記錄、技能的文字目錄，以及信箋式聯絡表格。取消通用段落滑入、模糊揭幕
及轉頁遮罩，保留少量與圖像內容有關的動態。`assets/editorial.css` 處理頁面各自的排版。

## 動畫互動

首頁加入疏落流星、軌道浮動及捲動景深；教育頁加入校園照片視差、時間線描繪、
學習節點及課程展開動畫。三個作品分別以揭幕、飛行落位及光圈對焦轉場。器材照片
支援滑鼠景深，閃光燈圖片旁有「試閃動畫」；技能篩選使用位置過渡，聯絡表單加入
底線筆觸及草稿展開。全站暫停、系統減少動態及隱藏分頁均會停止相應動畫。

## 網站改善報告套用（2026-10-17）

以《網站改善報告.md》為參考，將適用建議套用到現行八頁作品集。原報告審查的
舊月下新聞模組及 Python 抓取程式不在目前發佈版本內。

- 八頁加入獨立描述、Open Graph、Twitter 分享資料、canonical 及三語 hreflang。
  `assets/seo.js` 在瀏覽器切換語言時同步 metadata；不執行 JavaScript 的分享爬蟲
  會讀取 HTML 內預設的香港繁體中文資料。
- 原創 `assets/social-preview.png` 為 1200 × 630，使用絕對網址供分享服務讀取。
  可用安裝了 Pillow 的 Python 執行 `scripts/create-social-preview.py` 重新產生。
- `sitemap.xml` 列出八頁的三個語言網址，共 24 個 URL。`robots.txt` 包含 sitemap
  位置；GitHub Pages 專案子路徑中的 robots.txt 不控制整個 github.io 網域，
  如日後移到自訂網域，應將 robots.txt 放在該網域根目錄。
- 保留現有圖片說明及 favicon，補齊非同步解碼與作品展示圖片的實際尺寸。
  首屏圖片保持正常載入，其餘內容圖片使用懶載入。
- 入站預載清單依當頁產生，只包含當頁程式、樣式、非懶載入圖片及入站主圖。
  其他頁面、下方器材圖片和分享圖不會加入入站預載，10 秒動畫、跳過及失敗重試維持。
- 補齊目前頁面的導覽標記；缺譯時保留可讀文字，重選同一語言不重繪，
  搜尋文字快取，並為非 Element 事件目標及不完整篩選事件加入保護。

完成產生發佈檔案後，可額外執行：

```sh
node scripts/verify-preloader.cjs
node scripts/verify-report-improvements.cjs
node scripts/verify-site-layout.cjs
```

瀏覽器驗證沿用 `PORTFOLIO_BASE_URL`；後兩項需要 Playwright 及 Chrome。
