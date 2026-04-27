# Terra Invicta Style: Adaptive Real-time Global Understanding System

這是一個仿造策略遊戲 《Terra Invicta》（地球不屈）UI/UX 風格的現實資訊查詢應用 (ARGUS)。
以 **完整 3D 太陽系場景**為畫布，將 24 小時內的全球新聞、太空事件與社會經濟動態以情報標記的形式可視化呈現於對應天體上。搭配**協作畫布圖層**，讓使用者與 AI Agent 能共同在場景上標記、繪圖與推演。

> 🎮 視覺風格參考：《Terra Invicta》— 從地球政治版圖到太陽系戰略視角的多層次地圖介面。

---

## 🖼 視覺參考 (Visual Reference)

| 地球政治圖層 | 太陽系全景視角 |
|:---:|:---:|
| ![Earth Political Layer](docs/screenshots/earth-political.png) | ![Solar System View](docs/screenshots/solar-system.png) |

> *上方為《Terra Invicta》遊戲截圖，作為本專案 UI 風格目標參考。*

---

## 🚀 核心功能 (Core Features)

### 🌌 太陽系場景畫布
- 以完整 **3D 太陽系模型**作為主場景，各天體依軌道真實比例排列呈現。
- **即時天文同步**：所有天體的位置、公轉、自轉與日照狀態與現實時間完全對應，場景隨時鐘持續動態演進。
  - 🌍 **公轉**：依據各天體的真實軌道週期（克卜勒軌道根數）計算當前位置
  - 🔄 **自轉**：各天體以真實自轉週期旋轉（如地球 24h、木星 \~10h）
  - ☀️ **日照**：太陽光源方向隨天體位置即時更新，地球可見晝夜分界線（terminator）
- 涵蓋天體類型包含：
  - ☀️ **恆星**：太陽
  - 🪐 **行星**：水星、金星、地球、火星、木星、土星、天王星、海王星
  - 🌑 **矮行星**：冥王星、穀神星等
  - 🌕 **衛星**：月球、泰坦、木衛一～四等主要衛星
  - ☄️ **彗星／過境天體**：哈雷彗星、3I/ATLAS 等具新聞價值的動態天體
- 每個天體皆為**可點選互動節點**，展示與該天體相關的情報面板。
- 太空相關事件（如星際天體過境、探測任務動態、撞擊預警）將直接標記於對應軌道位置。

### 📡 即時情報標記
- 事件分析完成後，在對應地理或軌道座標上**即時跳出雷達標記點**。
- 標記依事件類型以不同圖示與顏色區分（詳見事件分類）。
- **24h 滾動數據**：後端自動抓取最新資訊，並透過 SQLite 僅保留最近 24 小時的資料。

### 🎯 情報聚焦鏡頭
- 點選任一事件標記或情報時，場景鏡頭會**平滑移動並自動聚焦**至事件發生的天體或地理位置。
- 支援從太陽系全景無縫縮放至地球表面特定座標，鏡頭路徑以緩動曲線（easing）運算。
- 聚焦完成後自動展開對應情報面板，閱讀完畢可一鍵返回上一視角。

### 🕹 鏡頭控制系統 (Camera Controls)

| 操作 | 行為 |
|---|---|
| 滾輪上／下 | Zoom In / Out（以當前聚焦天體為基準，最近距離不得小於該天體半徑，防止鏡頭穿入天體內部） |
| 右鍵按住拖曳 | 以當前聚焦點為軸心旋轉視角（環繞軌道式旋轉） |
| 左鍵按住拖曳 | 平移聚焦點（移動鏡頭看向的位置） |
| `W` `A` `S` `D` | 同左鍵拖曳，鍵盤版平移聚焦點 |
| 點擊天體 | 鏡頭平滑移動並聚焦該天體，自動縮放至可看見完整天體的距離 |

**Zoom 距離限制**：縮放以當前聚焦天體的表面為下限，`minDistance` 動態設為該天體的渲染半徑加上一個安全緩衝值，切換聚焦目標時即時更新。太陽系全景模式（無特定聚焦天體）下無下限限制。

**距離感知互動層級（Distance-aware Interaction）**

天體的可互動內容會依照鏡頭距離動態切換，避免在遠景下出現無法辨識的密集標記：

```
鏡頭距離：遠（太陽系全景）
  └─ 地球 = 普通天體節點，點擊後聚焦並拉近
       ↓
鏡頭距離：近（地球軌道層）
  └─ 地球開啟政治圖層，顯示 GeoJSON 邊界
  └─ 地理事件雷達標記點出現
  └─ 國家／地區區塊可點選 → 觸發地區情報面板
```

也就是說，**在遠景下點擊地球，鏡頭會先拉近到適當距離**，使用者才能進一步點選地區或事件標記。其他天體（火星、月球等）同理，近距離後才顯示該天體的情報標記。

> 詳細的 Three.js 實作方式（`OrbitControls` 設定、`minDistance` 動態更新、WASD 實作、tween 動畫）請參閱 [`docs/CAMERA_CONTROLS.md`](docs/CAMERA_CONTROLS.md)。

### 🧭 天體導覽列表 (Celestial Navigation List)

常駐於場景右側的浮動面板，依據**鏡頭聚焦位置與縮放距離**動態列出當前視野內合理可見的天體，提供確定性的導航捷徑——不需要在 3D 場景中精確瞄準遠方的細小天體。

**視野分級篩選**：列表內容隨鏡頭距離自動切換，與「距離感知互動層級」共用同一套閾值系統：

| 鏡頭距離 | 視野層級 | 列表顯示內容 |
|---|---|---|
| 遠（太陽系全景） | `solar` | 太陽 + 八大行星 + 矮行星 + 活躍彗星 |
| 中（行星軌道層） | `orbital` | 聚焦行星 + 該行星的衛星群 |
| 近（地表層級） | `surface` | 僅顯示聚焦天體本身 |

- 點擊列表中的天體等同於場景內點擊，觸發 `focusOnBody()` 平滑聚焦動畫。
- 當前聚焦天體以 `--cyan` highlight 標示，有情報事件的天體顯示 `--amber` 數量徽章。
- 面板可個別收合為 icon dock，IMMERSIVE 模式下隨其他面板一同隱藏。

> 完整的篩選邏輯、資料結構、UI 規格與效能注意事項請參閱 [`docs/CELESTIAL_NAV.md`](docs/CELESTIAL_NAV.md)。

### 🌍 地球政治圖層
- 可開關的 **國家／地區邊界圖層**，顯示全球政治實體分界（基於 GeoJSON）。
- 每個政治實體區域皆為**可點選互動區塊**，點擊後觸發聚焦鏡頭並展開地區情報面板。

### 🗂 地區情報面板 (Region Intel Panel)

點選地圖上任一國家或地區後觸發，流程為：**鏡頭聚焦拉近 → 區域 highlight → 面板展開**。

面板內容包含：
- **概況區**：國旗、全名、首都、人口、政體標籤（如 `DEMOCRACY`、`ACTIVE CONFLICT`）
- **統計格**：GDP、人均 GDP、政府體制、穩定度等關鍵指標視覺化呈現
- **經濟結構長條圖**：各產業比例以動態 bar chart 渲染
- **近期事件列表**：該地區過去 24h 內的情報條目，依類別顏色標示
- **Suggested Queries**：針對該地區自動生成最具情報價值的預設問題（如台灣自動帶入「半導體供應鏈」、烏克蘭帶入「前線戰況」）
- **Agent 對話輸入框**：使用者輸入問題後，Ollama Agent 以 HTML 方式在面板下方渲染回應（支援表格、圖表等富文字格式）
- **Context Tags**：輸入框上方自動標注當前 context（地區名、24h 事件、經濟數據等），Agent 送出 prompt 時自動帶入

### 📋 事件情報面板 (Event Intel Panel)

點選地圖或事件列表中的任一事件標記後觸發，流程與地區面板相同。

面板內容包含：
- **事件標題與類型標籤**：顯示分類（`ARMED_CONFLICT`、`SPACE` 等）及發光顏色指示
- **Meta 資訊列**：發生時間、地點座標、日期、強度等級
- **事件摘要**：Ollama 生成的中立摘要文字
- **關鍵數據格**：強度、持續時間、涉及方、已驗證來源數量
- **事件時間軸**：以時序條目呈現事件發展脈絡
- **來源清單**：列出各新聞來源出處、標題、可信度評級（HIGH RELIABILITY / PRIMARY SOURCE 等）
- **Suggested Queries**：針對該事件自動生成推薦問題（如核電廠風險、升級機率、30 天關聯事件）
- **Agent 對話輸入框**：與地區面板相同，支援 HTML 渲染回應，Context Tags 自動帶入事件類型、地點、來源數、時間軸

> 兩種面板共用相同的 Agent 對話互動邏輯：每次新的 query 結果疊加在前一次下方，保留對話脈絡；使用者可捲動對比概況資料與 Agent 分析。

### 🪟 面板獨立視窗 (Panel Popout)
- 所有情報面板均可透過右上角一鍵**另開為獨立瀏覽器視窗**（`window.open`），方便多螢幕使用者將面板拖移至其他螢幕持續監看。
- 獨立視窗與主場景透過 **BroadcastChannel API** 保持即時同步，新情報推送時各視窗同步更新。
- 支援 Popout 的面板類型：地區情報面板、事件情報面板、天體情報面板、事件推演畫布。

### 🗜 面板收合系統 (Collapsible UI)
- 所有側邊面板均可**個別收合為 icon dock**，hover 顯示 tooltip，方便單獨隱藏特定面板。
- **IMMERSIVE 模式**：一鍵收合全部面板與 topbar，場景全屏顯示，沉浸感最大化。
- 進入 IMMERSIVE 模式後，底部中央浮現 **float dock**，可快速喚出特定面板或退出模式。

### 🖊 協作畫布圖層 (Annotation Canvas)

為**事件推演／預測**功能預留的可視化協作空間，讓使用者與 AI Agent 能共同在太陽系場景上以圖形化方式推演情報走向。

**繪圖工具**（使用者與 AI 均可操作）：
- ✏️ **自由畫線**：滑鼠拖曳繪製任意路徑，適合圈選範圍或勾勒趨勢
- ➡️ **箭頭**：標示事件擴散方向、勢力推進路線或因果關係連線
- 🔤 **文字方塊**：在特定座標插入標註文字，用於說明推演假設或結論
- 🎨 **顏色選擇**：所有物件均可自訂顏色，便於區分不同推演情境或發言方

**物件管理**：點選個別物件後可刪除；畫布可整層清除或收合，不影響底層場景瀏覽。

**座標綁定**：畫布標記與太陽系場景座標系同步，縮放平移時標記隨場景一同移動，不會錯位。

### 🤖 在地情報處理
- 使用 **Ollama (Local LLM)** 進行新聞分類與 Agent 對話，所有 AI 推理在本機執行，不送出資料至外部。
- **非同步響應**：緩存優先加載，新情報處理完後透過 WebSocket 即時推送至場景。

### 🔥 熱度分數系統 (Heat Score)

資料保留不再以固定 24 小時為界，改採**動態熱度分數（Heat Score）**決定每篇文章的存活期限。

**分數計算因子：**

| 因子 | 說明 | 權重 |
|---|---|---|
| `intensity` | CRITICAL +1.0 / HIGH +0.6 / MODERATE +0.3 / LOW +0.0 | 基礎分 |
| `sources_count` | 每個來源 +0.1，上限 +0.5 | 交叉驗證加分 |
| `category` 權重 | `ARMED_CONFLICT`、`SPACE` +0.2；`POLITICAL`、`ECONOMIC` +0.1 | 持續性類別加分 |
| 後續關聯文章 | 每次被新文章的 actors / tags 觸碰 +0.15，最多加 3 次 | 事件續命機制 |

初始 Heat Score 由 Ollama Worker 分析完成時計算並寫入。後續每當有新文章與該事件的 `actors` 或 `tags` 產生交集，Retention Worker 自動更新 `heat_score` 與 `last_referenced`。

**分級保留期限：**

| Heat Score 範圍 | 保留時限 |
|---|---|
| `>= 1.5` | 7 天 |
| `1.0 ~ 1.49` | 3 天 |
| `0.5 ~ 0.99` | 48 小時 |
| `< 0.5` | 24 小時（原始邏輯） |

**清除條件（同時滿足才刪除）：**
1. `expires_at < CURRENT_TIMESTAMP`
2. `last_referenced` 超過 24 小時前（或為 NULL）
3. `heat_score < 0.3`（極低熱度直接清除，不受上述保護）

### 🌐 多語系支援
- 支援 **ENGLISH** 與 **繁體中文** 介面與術語切換。

---

## 🗂 事件分類 (Event Categories)

Ollama 分析後會為每則新聞打上以下分類標籤之一：

| 類別 | 標記顏色 | 說明 |
|---|---|---|
| 🔴 `ARMED_CONFLICT` | Red `#ff4d4d` | 武裝衝突、軍事行動、戰爭 |
| 🟠 `POLITICAL` | Amber `#ff9c2a` | 選舉、政變、外交聲明、制裁 |
| 🟡 `ECONOMIC` | Gold `#ffd700` | 市場波動、貿易政策、能源價格 |
| 🟢 `SOCIAL` | Muted `#c8cdd2` | 社會運動、重大示威、人道危機 |
| 🔵 `SCIENCE_TECH` | Purple `#9b6dff` | 科技突破、AI 發展、重大研究 |
| 🟣 `ENVIRONMENT` | Green `#39ff8a` | 氣候事件、自然災害、環境政策 |
| ⚪ `HEALTH` | Blue `#a0c4ff` | 疫情、重大公衛事件 |
| ⬛ `CRIME_SECURITY` | Dim `#6a8090` | 網路攻擊、恐怖主義、跨國犯罪 |
| 🌠 `SPACE` | Cyan `#00d4ff` | 太空任務、星際天體（如 3I/ATLAS）、撞擊預警、探測器動態 |

---

## 🗺 地圖與材質資料來源 (Assets & Geodata Sources)

### 行星材質貼圖

| 資產 | 來源 | 授權 | 說明 |
|---|---|---|---|
| 八大行星、月球、太陽貼圖 | [Solar System Scope Textures](https://www.solarsystemscope.com/textures/) | CC BY 4.0 | 含 diffuse、normal、specular map，直接相容 Three.js `TextureLoader` |
| 地球白天面 | Solar System Scope — Earth Day Map | CC BY 4.0 | 搭配夜晚面做晝夜 shader |
| 地球夜晚面（城市燈光） | [NASA Visible Earth — Earth at Night](https://visibleearth.nasa.gov/) | Public Domain | 配合日照同步，於晝夜分界線（terminator）切換 |
| 土星環材質 | [Planet Pixel Emporium](http://planetpixelemporium.com/) | Free for personal use | 環狀幾何體獨立貼圖 |

所有材質檔案存放於 `client/public/textures/`，按天體名稱分資料夾管理。

---

### 政治邊界 GeoJSON

主要來源採用 **[Natural Earth](https://www.naturalearthdata.com/)**，依以下原則使用：

**Natural Earth 的邊界立場**：採用 *de facto*（實際控制）原則，而非任何單一國家或聯合國的官方政治立場，符合本專案「以實際控制區為準」的需求。

**使用兩個精度層級**，依鏡頭距離動態切換：

| 檔案 | 比例尺 | 用途 |
|---|---|---|
| `ne_110m_admin_0_countries.geojson` | 1:110m（輕量） | 地球軌道遠景層，省效能 |
| `ne_50m_admin_0_countries.geojson` | 1:50m（中等） | 近距離政治圖層，邊界清晰 |

兩個檔案存放於 `client/public/geodata/`，前端依鏡頭距離閾值自動切換載入。

**已知需注意的爭議區域：**

- **台灣**：Natural Earth 將台灣標註為獨立 polygon，實際控制線大致正確；離島（金門、馬祖）精度較低，可視需求以 [政府資料開放平臺](https://data.gov.tw/) 的 MOI 官方行政區 GeoJSON 替換。
- **克里米亞**：不同版本處理方式不一，下載後需確認標示符合預期。
- **克什米爾**：印巴中三方控制區詮釋複雜，Natural Earth 有其自身立場。
- **南海島礁**：各礁實際控制方描繪較粗略。

**動態衝突前線（如烏克蘭）**：Natural Earth 為靜態資料集，無法反映持續變動的實際控制線。如需追蹤動態前線，可考慮疊加獨立圖層，資料來源參考 [Institute for the Study of War (ISW)](https://www.understandingwar.org/) 每日更新的控制區資料，與底層靜態邊界分開管理。

---



來源設定統一維護於 `server/src/config/feeds.ts`，格式如下：

```typescript
export const FEEDS = [
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldNews', lang: 'en' },
  { name: 'BBC World',     url: 'http://feeds.bbci.co.uk/news/world/rss.xml',  lang: 'en' },
  { name: 'AP Top News',   url: 'https://rsshub.app/apnews/topics/apf-topnews', lang: 'en' },
  { name: 'Al Jazeera',    url: 'https://www.aljazeera.com/xml/rss/all.xml',   lang: 'en' },
  { name: 'NHK World',     url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',    lang: 'en' },
  { name: 'DW News',       url: 'https://rss.dw.com/xml/rss-en-world',         lang: 'en' },
  // 太空 / 科技專項
  { name: 'NASA Breaking', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', lang: 'en' },
  { name: 'Space.com',     url: 'https://www.space.com/feeds/all',              lang: 'en' },
  { name: 'Ars Technica',  url: 'http://feeds.arstechnica.com/arstechnica/index', lang: 'en' },
  // 中文來源
  { name: '中央社',         url: 'https://www.cna.com.tw/rss/aall.aspx',        lang: 'zh-TW' },
  { name: 'RFI 中文',      url: 'https://www.rfi.fr/tw/rss',                   lang: 'zh-TW' },
];
```

**抓取策略**：
- 每次抓取以文章 URL 的 hash 值去重，已存在的文章不重複寫入。
- 每篇文章截取標題 + 內文前 800 字送入 Ollama 分類，超出部分捨棄。
- 抓取頻率由 `SCRAPE_INTERVAL_MINUTES` 環境變數控制，預設 60 分鐘。
- 若某個 Feed URL 連續 3 次抓取失敗，記錄 warning log 但不中斷其他來源。

---

## 🤖 Ollama Prompt 規格 (Prompt Specification)

系統中 Ollama 承擔兩種截然不同的任務，分別使用獨立的 prompt 設計。

---

### 情境一：新聞分類 Worker

**觸發時機**：後端 `ollama.ts` 偵測到 `is_analyzed = 0` 的新聞時自動執行。
**輸入**：原始新聞標題 + 內文摘要。
**輸出**：嚴格的 JSON 結構，供前端在場景上定位並渲染情報標記。

#### System Prompt

```
You are an intelligence analysis system. Your task is to classify a news article and extract structured geopolitical or astronomical data from it.

You MUST respond with a single valid JSON object only. No explanation, no markdown, no extra text — only raw JSON.

Follow this schema exactly:
{
  "category": string,         // One of: ARMED_CONFLICT | POLITICAL | ECONOMIC | SOCIAL | SCIENCE_TECH | ENVIRONMENT | HEALTH | CRIME_SECURITY | SPACE
  "title_zh": string,         // Article title translated or summarised in Traditional Chinese, max 40 characters
  "summary_zh": string,       // Neutral summary in Traditional Chinese, max 120 characters
  "intensity": string,        // One of: LOW | MODERATE | HIGH | CRITICAL
  "location": {
    "type": string,           // "geo" for Earth surface events | "orbital" for space events
    "label": string,          // Human-readable location name, e.g. "Ukraine" or "Inner Solar System"
    "lat": number | null,     // Latitude (-90 to 90), null if type is "orbital"
    "lng": number | null,     // Longitude (-180 to 180), null if type is "orbital"
    "body": string | null     // Celestial body name if type is "orbital", e.g. "3I/ATLAS", "Mars", null if type is "geo"
  },
  "actors": string[],         // Key parties involved, e.g. ["Ukraine", "Russia"] or ["NASA", "ESA"]
  "sources_count": number,    // Number of corroborating sources mentioned in the article (estimate 1 if unknown)
  "tags": string[]            // 2–4 short keyword tags in English, e.g. ["military", "frontline", "artillery"]
}
```

#### User Prompt 範本

```
Classify the following news article:

Title: {article_title}

Content: {article_content_truncated_to_800_chars}

Respond with JSON only.
```

#### 輸出範例（ARMED_CONFLICT）

```json
{
  "category": "ARMED_CONFLICT",
  "title_zh": "俄軍砲擊扎波羅熱前線，烏軍展開反砲兵作戰",
  "summary_zh": "烏克蘭軍方確認扎波羅熱前線遭受持續砲擊，反砲兵部隊已展開回擊，附近民用電網設施受損。",
  "intensity": "HIGH",
  "location": {
    "type": "geo",
    "label": "Zaporizhzhia, Ukraine",
    "lat": 47.8388,
    "lng": 35.1396,
    "body": null
  },
  "actors": ["Ukraine", "Russia"],
  "sources_count": 3,
  "tags": ["artillery", "frontline", "infrastructure", "counterattack"]
}
```

#### 輸出範例（SPACE）

```json
{
  "category": "SPACE",
  "title_zh": "3I/ATLAS 確認近日點距地 0.38 AU，無撞擊風險",
  "summary_zh": "星際天體 3I/ATLAS 完成近日點過境，NASA 確認軌跡為雙曲線，無撞擊地球風險，最近距離 0.38 AU。",
  "intensity": "LOW",
  "location": {
    "type": "orbital",
    "label": "Inner Solar System",
    "lat": null,
    "lng": null,
    "body": "3I/ATLAS"
  },
  "actors": ["NASA", "ESA", "IAU"],
  "sources_count": 3,
  "tags": ["interstellar", "perihelion", "trajectory", "no-impact"]
}
```

#### 錯誤處理原則

- 若模型輸出非合法 JSON，後端應捨棄並重試一次（最多 2 次）。
- 若 `lat` / `lng` 無法從文章推斷，預設為事件所在國家首都座標。
- `category` 若模型不確定，優先選 `POLITICAL`，不得留空或輸出 `UNKNOWN`。

---

### 情境二：Agent 對話

**觸發時機**：使用者在地區情報面板或事件情報面板的輸入框送出問題。
**輸入**：使用者問題 + 自動帶入的 context（地區 / 事件資料、近期事件列表）。
**輸出**：HTML 字串，直接渲染於面板的 Agent 分析區。

#### System Prompt

```
You are an intelligence analyst embedded in a real-time global surveillance system.
The user is viewing a geopolitical or astronomical event panel and asking follow-up questions.

Answer in the same language as the user's question (Traditional Chinese or English).
Format your response as valid HTML only — no markdown, no code fences.
Use <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <b>, <ul>, <li> tags only.
Keep responses concise and analytical. Avoid speculation beyond what the context supports.
Do not include <html>, <head>, <body>, or <style> tags.
```

#### User Prompt 範本（地區面板）

```
[CONTEXT]
Region: {region_name}
Government: {government_type}
GDP: {gdp}
Recent events (24h):
{events_list}

Economic data:
{economic_summary}

[USER QUESTION]
{user_input}
```

#### User Prompt 範本（事件面板）

```
[CONTEXT]
Event type: {category}
Title: {event_title}
Location: {location_label}
Time: {event_time}
Intensity: {intensity}
Actors: {actors}
Timeline:
{timeline_entries}
Verified sources: {sources_count}

[USER QUESTION]
{user_input}
```

#### 輸出範例（事件面板 Agent 回應）

```html
<p>Based on current intelligence for <b>Zaporizhzhia</b>, escalation probability assessment:</p>
<table>
  <thead>
    <tr><th>Scenario</th><th>Probability</th><th>Timeline</th></tr>
  </thead>
  <tbody>
    <tr><td>Status quo maintained</td><td>52%</td><td>72h</td></tr>
    <tr><td>Tactical escalation</td><td>31%</td><td>24–48h</td></tr>
    <tr><td>Strategic escalation</td><td>12%</td><td>1–2 weeks</td></tr>
    <tr><td>De-escalation</td><td>5%</td><td>&gt;72h</td></tr>
  </tbody>
</table>
<p>Confidence: <b>74%</b> · Sources cross-referenced: 3 articles</p>
```

#### Agent 對話注意事項

- Context 由前端組裝後送出，使用者看不到 context 內容，只看到自己的問題與 Agent 回應。
- 每次對話為**獨立請求**，不保留跨 query 的對話記憶（stateless）；若需要脈絡，前端可將上一次的 Q&A 附入下一次的 context。
- HTML 渲染前應做基本 sanitize，僅允許白名單標籤，防止 XSS。

---



- **Frontend**: React, Three.js (React Three Fiber), Tailwind CSS, Zustand, i18next.
- **Astronomy**: [Astronomy Engine](https://github.com/cosinekitty/astronomy) 或 VSOP87 星曆表，用於計算各天體即時位置。
- **Backend**: Node.js (TypeScript), Express, Socket.io.
- **Database**: SQLite (better-sqlite3).
- **AI Engine**: Ollama（本機執行，推薦模型：`llama3.2` 或 `phi3`）。
- **Data sources**: RSS Feed（Reuters、BBC、AP、Al Jazeera 等，來源清單見下方）。

---

## 📂 專案目錄結構 (Project Structure)

這套結構採用了 Monorepo 或分離式架構的思維，將數據抓取、AI 處理與前端渲染清晰拆分。

```
global-info-hub/
├── client/                        # React + Three.js 前端 (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── scene/             # SolarSystem, Globe, OrbitLines, EventMarkers
│   │   │   ├── panels/            # RegionPanel, EventPanel, CelestialPanel
│   │   │   ├── canvas/            # AnnotationCanvas, DrawingTools
│   │   │   ├── ui/                # Sidebar, IconDock, FloatDock, LanguageSwitcher, CelestialNavList
│   │   │   └── popout/            # PopoutManager, BroadcastSync
│   │   ├── hooks/                 # useOllamaSocket, useGlobeData, useCameraFocus, useCelestialNav
│   │   ├── store/                 # Zustand（事件、語系、面板、UI 模式狀態）
│   │   ├── i18n/                  # locales (en.json, zh-TW.json)
│   │   └── types/                 # 前端資料型別定義
│   └── public/                    # 地球貼圖、GeoJSON 檔案、星體材質
├── server/                        # Node.js (TypeScript) 後端
│   ├── src/
│   │   ├── services/
│   │   │   ├── scraper.ts         # RSS Feed 定時抓取與解析（node-cron + rss-parser）
│   │   │   ├── ollama.ts          # 串接 Ollama SDK（分類 + Agent 對話）
│   │   │   └── socket.ts          # WebSocket 即時推送
│   │   ├── config/
│   │   │   └── feeds.ts           # RSS 來源清單設定（URL、名稱、語系、地區標記）
│   │   ├── db/
│   │   │   ├── sqlite.ts          # better-sqlite3 配置
│   │   │   └── schema.sql         # 24h 滾動數據表結構
│   │   ├── workers/
│   │   │   └── cleaner.ts         # 24h 數據定時清理任務 (node-cron)
│   │   ├── index.ts               # Express + Socket.io 入口
│   │   └── types.ts               # 後端資料型別定義
│   ├── intelligence.db            # 本地 SQLite 資料庫（自動生成）
│   └── tsconfig.json
├── docs/
│   └── screenshots/               # 截圖與參考圖片
├── .env                           # 存放環境設定
├── .env.example                   # 環境設定範本
└── package.json
```

---

## 📡 數據流向 (Data Flow)

1. **RSS Scraper**：依設定的抓取頻率（預設 1 小時，可調整）拉取各 RSS Feed，解析文章標題、內文摘要、發布時間與來源，寫入 SQLite `is_analyzed = 0`。重複文章以 URL hash 去重，不重複寫入。
2. **Ollama Worker**：偵測未分析數據，呼叫本地 LLM 生成 JSON 標籤（事件分類 + 地理／軌道座標 + 摘要）。分析完成後依 `intensity`、`sources_count`、`category` 計算初始 `heat_score`，並據此設定 `expires_at`。
3. **Socket Stream**：分析完成後即時推送至前端，在場景對應位置標註動態雷達點。
4. **Agent Chat**：使用者在情報面板輸入問題，前端帶入 context 呼叫 Ollama，回應以 HTML 渲染至面板。
5. **Retention Worker**：每 15 分鐘執行。先掃描新文章，更新與其 `actors` / `tags` 有交集的舊文章的 `heat_score` 與 `last_referenced`；再依條件清除同時滿足「`expires_at` 已到期」且「`last_referenced` 超過 24h 或為 NULL」的文章；`heat_score < 0.3` 的文章無論時間一律清除。

---

## 🗄 資料庫結構 (SQLite Schema)

存放於 `server/src/db/schema.sql`，服務啟動時自動建立。

```sql
CREATE TABLE IF NOT EXISTS articles (
  id             TEXT PRIMARY KEY,      -- URL 的 SHA-256 hash（去重鍵）
  source         TEXT NOT NULL,         -- Feed 來源名稱，如 "Reuters World"
  title          TEXT NOT NULL,         -- 原始標題
  content        TEXT,                  -- 內文前 800 字
  url            TEXT NOT NULL,         -- 原始文章 URL
  published_at   DATETIME,              -- 文章發布時間（RSS <pubDate>）
  fetched_at     DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 本機抓取時間

  -- Ollama 分析狀態
  is_analyzed    INTEGER DEFAULT 0,     -- 0: 待分析 / 1: 已完成 / -1: 分析失敗

  -- Ollama 輸出欄位（分析前為 NULL）
  category       TEXT,                  -- 事件分類，如 "ARMED_CONFLICT"
  title_zh       TEXT,                  -- 繁中標題（max 40 字）
  summary_zh     TEXT,                  -- 繁中摘要（max 120 字）
  intensity      TEXT,                  -- LOW | MODERATE | HIGH | CRITICAL
  location_type  TEXT,                  -- "geo" | "orbital"
  location_label TEXT,                  -- 可讀地點名稱
  lat            REAL,                  -- 緯度（orbital 事件為 NULL）
  lng            REAL,                  -- 經度（orbital 事件為 NULL）
  body           TEXT,                  -- 天體名稱（geo 事件為 NULL）
  actors         TEXT,                  -- JSON array，如 '["Ukraine","Russia"]'
  tags           TEXT,                  -- JSON array，如 '["artillery","frontline"]'
  sources_count  INTEGER,               -- 文章中提及的來源數量

  -- 熱度分數系統（Heat Score）
  heat_score     REAL DEFAULT 0.0,      -- 動態熱度分數，決定保留時限
  expires_at     DATETIME,              -- 依 heat_score 計算的到期時間，由 Worker 寫入
  last_referenced DATETIME              -- 最後一次被新文章關聯的時間（actors/tags 交集）
);

-- Retention Worker 用：快速找出到期且低熱度的舊資料
CREATE INDEX IF NOT EXISTS idx_expires_at    ON articles(expires_at);

-- Ollama Worker 用：快速找出待分析文章
CREATE INDEX IF NOT EXISTS idx_is_analyzed   ON articles(is_analyzed);

-- 前端查詢用：依分類過濾已分析的近期事件
CREATE INDEX IF NOT EXISTS idx_category_time ON articles(category, published_at)
  WHERE is_analyzed = 1;

-- Heat Score 更新用：快速找出與特定 actors/tags 相關的已分析文章
CREATE INDEX IF NOT EXISTS idx_heat_score    ON articles(heat_score, last_referenced)
  WHERE is_analyzed = 1;
```

**欄位設計說明：**
- `id` 用 URL hash 而非自增 ID，確保同一篇文章無論從哪個 Feed 抓到都不會重複寫入。
- `is_analyzed = -1` 保留給連續兩次 Ollama 輸出非合法 JSON 的文章，避免反覆重試浪費資源。
- `actors` 與 `tags` 以 JSON 字串序列化存入 SQLite，讀取時在應用層 `JSON.parse()`，不額外建關聯表。
- `body` 欄位對應 `SPACE` 類別的天體名稱（如 `"3I/ATLAS"`），`geo` 類事件此欄為 `NULL`。
- `heat_score` 由 Ollama Worker 分析完成時初始化，Retention Worker 每次執行時依關聯文章更新。
- `expires_at` 根據 `heat_score` 分級計算：`>= 1.5` → 7 天；`1.0~1.49` → 3 天；`0.5~0.99` → 48h；`< 0.5` → 24h。
- `last_referenced` 每當有新文章與此文章的 `actors` 或 `tags` 產生交集時更新，可延長實際存活時間。

---



### 點選地區
```
點選地圖區域
  → 鏡頭平滑聚焦拉近（easing 動畫）
  → 區域 highlight（GeoJSON border 發光）
  → 地區情報面板展開（國旗 / 概況 / 統計 / 近期事件）
  → 使用者輸入問題 or 點選 Suggested Query
  → Ollama Agent 回應以 HTML 渲染於面板下方
  → 可 Popout 至獨立視窗 / 一鍵返回上一視角
```

### 點選事件標記
```
點選雷達標記點 or 事件列表條目
  → 鏡頭平滑聚焦至事件座標
  → 事件情報面板展開（類型 / 摘要 / 時間軸 / 來源）
  → 使用者輸入問題 or 點選 Suggested Query
  → Ollama Agent 回應以 HTML 渲染於面板下方
  → 可 Popout 至獨立視窗 / 一鍵返回上一視角
```

### 進入推演模式
```
開啟 Annotation Canvas 圖層
  → 選擇工具（畫線 / 箭頭 / 文字方塊）
  → 在場景上繪製標記
  → 可切換 IMMERSIVE 模式隱藏所有面板（float dock 保留快速喚回）
  → Popout 畫布至獨立視窗進行多螢幕推演
```

---

## ⚙️ 快速開始 (Development)

1. **啟動 Ollama**：確保本地 `ollama serve` 已開啟並 pull 指定模型（如 `ollama pull llama3.2`）。
2. **後端設定**：
   - `cd server`
   - `npm install`（Windows 若 better-sqlite3 編譯失敗，需安裝 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 含「使用 C++ 的桌面開發」）
   - 複製 `.env.example` 為 `.env`，並填入以下欄位：
     ```env
     SCRAPE_INTERVAL_MINUTES=60   # RSS 抓取頻率，預設 60 分鐘
     ```
   - RSS 來源清單統一在 `server/src/config/feeds.ts` 中管理，無需 API Key。
   - `npm run dev`
3. **前端啟動**：
   - `cd client`
   - `npm install`
   - `npm run dev`
4. 根目錄執行 `npm run dev` 可同時啟動前後端（需先於根目錄 `npm install`）。

---

## 🎨 視覺規範 (Visual Guidelines)

視覺風格定位：**科幻精緻風**，以《Mass Effect》戰情室為參考基調——深藍紫底色、全息發光邊緣、柔和環境光暈、多層次景深，兼具軍事情報感與科幻精緻感。

### 色彩系統

| Token | Hex | 用途 |
|---|---|---|
| `--void` | `#04060f` | 3D 場景底色 |
| `--bg` | `#04090a` | 應用背景 |
| `--surface` | `rgba(4,9,22,0.92)` | 面板底色（半透明玻璃層） |
| `--border` | `rgba(0,180,255,0.12)` | 面板邊框、分隔線 |
| `--glow-edge` | 漸層 `transparent → rgba(0,210,255,0.5) → rgba(120,60,255,0.35) → transparent` | 面板頂部／底部發光邊緣 |
| `--cyan` | `#00d4ff` | 主強調色：active 狀態、標題、SPACE 類別、系統語言 |
| `--purple` | `#9b6dff` | 副強調色：AI／宇宙感元素、SCIENCE_TECH 類別 |
| `--amber` | `#ff9c2a` | 警示色：數值、警告、POLITICAL／ECONOMIC 類別 |
| `--red` | `#ff4d4d` | 危險色：ARMED_CONFLICT 類別 |
| `--green` | `#39ff8a` | 正常色：系統 online、ENVIRONMENT 類別 |
| `--text-primary` | `#a8c4d8` | 主文字 |
| `--text-muted` | `#4a6070` | 次要文字、時間戳、標籤 key |
| `--text-disabled` | `#2a4060` | 禁用、placeholder |

> 所有顏色以 CSS Custom Properties 定義，禁止直接寫死 hex 值。

### 字體與字級

| 用途 | 字型 | 大小 | 字重 | 其他 |
|---|---|---|---|---|
| 系統標題 / LOGO | JetBrains Mono | `11px` | 600 | `letter-spacing: 0.18em`、全大寫 |
| 面板標題 / 區域名 | JetBrains Mono | `13px` | 600 | `letter-spacing: 0.06em` |
| 分區標籤 | JetBrains Mono | `9px` | 500 | `letter-spacing: 0.15em`、全大寫 |
| 正文 / 摘要 | JetBrains Mono | `11px` | 400 | `line-height: 1.6` |
| 數值 / 指標 | JetBrains Mono | `13px` | 500 | 依類別套用對應色 |
| 元資料 / 時間 | JetBrains Mono | `9–10px` | 400 | `color: var(--text-muted)` |
| 中文內文 | Source Han Sans TC | 同上各級 | 對應調整 | 回退字體 |

### 光效規範

| 效果 | 規格 | 使用場景 |
|---|---|---|
| 環境光暈 | `radial-gradient` 多層，透明度 10–18% | 場景背景底層 |
| 面板發光邊框 | 左側 1px 漸層線（transparent → cyan → purple → transparent） | 所有側邊面板 |
| 頂部光線 | 底部 1px `linear-gradient`（cyan + purple） | 面板 header 底線 |
| 元素 Glow | `text-shadow / box-shadow` 8–12px，透明度 35–60% | active dot、標題、數值 |
| 背景格線 | 1px，透明度 2%，`28px × 28px` | 場景畫布疊加層 |

### 圖層堆疊（Z-Index）

```
z-index: 0    → 太陽系 3D 場景（Three.js canvas）
z-index: 10   → 政治邊界圖層（GeoJSON overlay）
z-index: 20   → 情報標記點（雷達脈衝 markers）
z-index: 30   → 情報面板（地區、事件、天體）
z-index: 40   → 協作畫布圖層（Annotation Canvas）
z-index: 50   → 全域 UI（工具列、圖層開關、語系切換）
z-index: 60   → Float Dock（IMMERSIVE 模式）
z-index: 9999 → Tooltip / Popout 觸發提示
```

### 場景導覽層級

```
太陽系全景
  └─ 天體導覽列表：顯示太陽 + 八大行星 + 活躍彗星
  └─ 天體點選（場景 or 導覽列表）→ 天體情報面板
       └─ 天體導覽列表：切換為聚焦行星 + 衛星群
       └─ 地球：開啟政治圖層
            └─ 天體導覽列表：僅顯示地球
            └─ 國家區域點選 → 鏡頭聚焦 → 地區情報面板
                 └─ Agent 對話 / Popout
  └─ 事件標記點選 → 鏡頭聚焦 → 事件情報面板
       └─ Agent 對話 / Popout
  └─ IMMERSIVE 模式 → 場景全屏 → Float Dock
       └─ Annotation Canvas（推演模式）
```

---

## 🗺 Roadmap

---

### ✅ 已完成功能總覽

> 以下功能均已實作完成，可正常運作。

**場景與鏡頭**
- 太陽系 3D 場景（30+ 天體、真實軌道根數、材質貼圖）
- 鏡頭控制系統（滾輪縮放、右鍵旋轉、WASD 平移、點擊聚焦、tween easing）
- 即時天文同步（公轉 / 自轉 / GAST 日照 / 晝夜分界線 terminator）
- 距離感知互動層級（太陽系全景 → 行星軌道層 → 地表層）
- 天體導覽列表（動態篩選、可展開衛星群 / 小行星 / 彗星群組）
- 地球 LOD 高解析材質（近距自動切換 8K / 2K，磁滯防抖）
- 不規則幾何網格（小行星 / 彗星 Icosahedron 位移網格）

**資料管線**
- SQLite Schema + 四個索引 + WAL 模式
- RSS Scraper（URL hash 去重、定時抓取）
- Ollama Worker（JSON 分類 + heat\_score 初始化 + expires\_at 分級）
- 熱度分數系統（Retention Worker 15 分鐘掃描更新 / 三條件清除）
- WebSocket 即時推送（Socket.io `new_event`）

**情報視覺化**
- 政治 GeoJSON 圖層（110m / 50m 精度，依距離動態切換）
- 事件雷達標記點（category 圖示 + 顏色 + 脈衝動畫）
- 即時航班 / 衛星追蹤圖層（ADS-B OpenSky + TLE Celestrak）
- 情報聚焦鏡頭（tween 縮放、返回上一視角）

**情報面板與 Agent**
- 地區情報面板（國旗 / 概況 / 統計格 / 近期事件 / Wikipedia 摘要）
- 事件情報面板（類型 / 摘要 / 時間軸 / 來源清單 / 強度指標）
- Agent 對話（Ollama 串流 + HTML 白名單渲染 + SSE）
- Agent Vision（AnnotationCanvas 截圖 → 多模態 Ollama 分析）
- Suggested Queries 自動生成

**UI 系統**
- Lite Mode（Icon Stack 收合側邊欄）
- Immersive Mode（場景全屏 + Float Dock 保留快速存取）
- CategoryFilterBar（分類 toggle 過濾 EventStack）
- Config Modal（Ollama model / 抓取頻率 / UI Scale 滑桿）
- 面板 Popout（獨立視窗 + BroadcastChannel 即時同步）
- 拖曳邊界夾持（面板不可超出視窗）
- 協作畫布（自由畫線 + Socket.io 多端同步）
- i18n 基礎架構（i18next，EN / 繁中）

---

### Phase A — 資料層補完

> 追蹤圖層與資料品質，補齊當前已有架構但尚未串通的功能。

- [ ] **AIS 船舶追蹤**：`showShipsLayer` 狀態已存在、`TrackingLayer` 結構已備，需接入公開 AIS REST API（如 [aisstream.io](https://aisstream.io)）並在 `FloatDock` 啟用按鈕
- [ ] **Heat Score UI 可視化**：後端已計算 `heat_score`，前端 EventStack / EventPanel 尚未顯示；加入熱度條或數值徽章，讓使用者直覺感受事件存活狀態
- [ ] **事件來源可信度細化**：`sources_count` 已存入 DB，面板來源清單尚無 `HIGH RELIABILITY / PRIMARY SOURCE` 等評級標籤，需在 Ollama Prompt 輸出中補充 `reliability` 欄位並在 UI 顯示

---

### Phase B — 使用者體驗

> 強化現有功能的互動細節與操作效率。

- [ ] **時間軸過濾滑桿**：目前只能以分類過濾事件，加入時間範圍選取（如「過去 6h / 12h / 24h」），在 CategoryFilterBar 旁或 Float Dock 中提供快捷切換
- [ ] **事件密度聚合（Clustering）**：地球上多事件密集時標記點重疊，依縮放層級自動合併為數量徽章 cluster，靠近後展開
- [ ] **高強度事件通知**：新抵達 `CRITICAL` 或 `HIGH` 等級事件時在畫面角落顯示 toast 提示（不中斷場景操作）
- [ ] **地區比較面板**：`compareMode` 與 `comparedCountries` 狀態已在 Store 中就位，需實作雙欄並排的比較 UI，顯示兩國 GDP / 政體 / 近期事件差異
- [ ] **i18n 完整覆蓋**：目前 `en.json` / `zh-TW.json` 僅約 20 個 key，UI 大量字串尚未抽取；統一抽取所有硬編碼文字，完成面板 / 工具列 / Agent 提示語的雙語切換

---

### Phase C — 進階分析

> 在現有 Agent 能力上疊加更深層的情報推演功能。

- [ ] **動態衝突前線圖層**：針對烏克蘭等持續衝突地區，疊加 ISW 每日更新的控制區 GeoJSON，與靜態政治邊界分開管理
- [ ] **事件關聯圖（Relationship Graph）**：以 `actors` / `tags` 交集為邊，在事件面板中渲染節點連線圖，視覺化事件之間的擴散與關聯路徑
- [ ] **定期情報摘要**：設定間隔（如每 6h）讓 Ollama 自動彙整當前高熱度事件，產出 HTML 情勢摘要，推送至 Float Dock 通知欄
- [ ] **事件匯出 / 分享**：選取一或多筆事件後，匯出為 Markdown / JSON 報告，或複製包含場景截圖的分享連結
