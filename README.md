# 月下誓約 — 整合檔案庫

Bernie’s Honkai Realm 嘅完整 GitHub 版本，包含新整合首頁同原站全部 9 個頁面、圖片、音樂、女武神與分支資料、三語介面及原有功能

## 檔案結構

- `docs/`：可直接由 GitHub Pages 發佈嘅完整網站
- `public/`：新整合首頁與共用導覽嘅來源檔案
- `source/lunarvow/`：原站完整 204 個原始檔案，保留素材來源、授權、測試與更新程式
- `scripts/prepare-site.cjs`：重新生成 `docs/`，加入返回總覽入口並更新預載清單

## 更新網站

需要 Node.js 20 或以上

```sh
node scripts/prepare-site.cjs
```

將更新後嘅 `docs/` 一併提交到 GitHub

## GitHub Pages

到 repository 嘅 **Settings → Pages**

1. Source 選 **Deploy from a branch**
2. Branch 選實際預設分支（通常係 `main`）
3. Folder 選 **/docs**，然後按 Save
4. 等 GitHub 顯示發佈成功，再使用 Pages 頁提供嘅正式網址

Pages 可用性及網站可見性以你嘅 GitHub 帳戶方案同 repository 設定為準

官方設定說明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 來源與日期

原站：https://github.com/bernie8026/lunarvow

原站來源 commit：`5fc97f5457e1651d67b20d3a4d67eb1b1ed26879`

原站內容複製日期：2026-10-13；原有官方消息核對日期：2026-10-05

本網站為非官方、非商業個人檔案庫；遊戲素材權利屬原權利持有人，各素材原有來源與授權紀錄均保留
