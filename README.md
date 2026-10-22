# 🧾 本地 OCR 發票保固 Web (Local Invoice Warranty WebApp)

> **100% 純前端免安裝、資料不離身、純瀏覽器本地離線執行的統一發票 OCR 辨識與保固判定工具。**

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Pure WebApp](https://img.shields.io/badge/Pure-HTML%2FCSS%2FJS-orange)](https://developer.mozilla.org/)
[![Privacy: 100% Local](https://img.shields.io/badge/Privacy-100%25%20Local-green)](README.md)

---

## 🌟 專案亮點

1. **零環境安裝 (Zero Setup)**：
   - 毋需安裝 Python、Node.js 或任何後端資料庫。
   - 同學下載後**雙擊 `index.html`**，用 Chrome、Edge 甚至手機瀏覽器即可秒開運行！
2. **100% 隱私安全 (Strictly Offline & Private)**：
   - 發票照片與消費個資 **完全留在本地電腦記憶體**，絕不上傳到任何第三方伺服器。
3. **智慧格式轉換**：
   - 自動將台灣電子發票常見的**民國年轉為西元年**（如：`113年10月15日` ➔ `2024-10-15`）。
   - 支援雙月期別備援判定（如：`113年09-10月`）。
4. **直觀視覺紅綠燈**：
   - 🟢 **保固有效**：清楚顯示剩餘天數與到期日。
   - 🔴 **已過保固**：清楚標記已逾期天數。
5. **批次處理與 CSV 匯出**：
   - 一次拖入多張發票連續辨識，一鍵匯出 Excel 相容的 `.csv` 報表。

---

## 🚀 快速開始

### 方式 A：直接在 GitHub Pages 線上體驗
*(放上 GitHub 後開啟 Settings -> Pages 即可獲取專屬網址，手機與電腦即開即用！)*

### 方式 B：本地下載使用
1. 點擊本專案右上角綠色按鈕 `Code` ➔ `Download ZIP`。
2. 解壓縮後，直接以瀏覽器雙擊打開 **`index.html`**（或先跑 `test_runner.html` 驗收測試）。
3. 拖入發票照片，即刻獲得保固判定！

---

## 🧭 架構設計與 Lego 積木切分

本專案奉行 **「AI 時代架構師心法」**，不寫又臭又長的意大利麵代碼，切分為單一職責（Single Responsibility）的積木模組：

```
本地OCR發票保固Web/
├── index.html                  # 🎨 拖曳上傳與卡片式主介面
├── test_runner.html            # 🧪 單元測試與即時邏輯試算器
├── js/
│   ├── warranty_logic.js       # 🧠 [積木 1] 保固決策大腦（到期日/剩餘天數計算）
│   ├── date_extractor.js       # 🔍 [積木 2] 發票號碼與民國年正規提取器
│   ├── image_preprocessor.js   # 🖼️ [積木 3] Canvas 影像前處理（灰階/高對比二值化）
│   └── ocr_engine.js           # ⚡ [積木 4] Tesseract.js WASM 封裝
├── 純前端_Web_App開發計劃.md     # 📐 專案架構規劃規格書
└── 開發進度追蹤表.md             # 📊 開發里程碑 WBS 清單
```

---

## 🧪 核心邏輯單元測試

專案內建完全獨立的驗收測試工具：
- 雙擊打開 **`test_runner.html`**
- 即時驗證民國年轉換、發票期別備援、閏年跨月計算等 5 項測試案例，確保算法 100% 準確。

---

## 🤝 適合教學與實習場景

- **學生/會計/採購作業**：解決日常報帳、發票整理與產品保固歸檔痛點。
- **Web 前端學習範例**：展示如何純靠 HTML5 File API、Canvas API 與 WebAssembly (WASM) 打造實用工具。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權，歡迎自由修改、學習與擴充。

