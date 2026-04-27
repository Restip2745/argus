# 天體導覽列表 — 技術文件

> 對應 README 的「🧭 天體導覽列表」章節，說明浮動天體選單的篩選邏輯、資料結構與 UI 規格。

---

## 概覽

天體導覽列表（Celestial Navigation List）為一個常駐於場景側邊的浮動面板，依據**當前鏡頭聚焦位置**與**縮放距離**動態篩選並列出「當前視野內合理可見的天體」，提供使用者一個確定性的導航捷徑，解決在 3D 場景中遠距離精確點選天體困難的問題。

點擊列表中的天體項目等同於直接在場景中點擊該天體，觸發 `focusOnBody()` 平滑聚焦動畫。

---

## 設計原則

| 原則 | 說明 |
|---|---|
| 與距離感知層級共用閾值 | 篩選邏輯複用「距離感知互動層級」的距離閾值系統，不另建一套標準 |
| 鏡頭狀態驅動 | 列表內容完全由 `controls.target`（聚焦點）與 `camera.position`（鏡頭位置）決定，無需額外輸入 |
| 最小干擾 | 面板不遮擋主要場景內容，支援收合，IMMERSIVE 模式下隨其他面板一同隱藏 |
| 即時回饋 | 鏡頭移動時列表即時更新，當前聚焦天體以 highlight 標示 |

---

## 視野分級與篩選邏輯

### 分級定義

系統依鏡頭到聚焦點的距離（`camera.position.distanceTo(controls.target)`）劃分為三個視野層級。每個層級對應不同的可見天體集合：

```typescript
// client/src/config/navLevels.ts

interface NavLevel {
  id:          'solar' | 'orbital' | 'surface';
  label:       string;           // 顯示用標籤
  minDistance:  number;          // 該層級啟用的最小鏡頭距離
  candidates:  (focusedBody: string | null) => CelestialBody[];
}

const NAV_LEVELS: NavLevel[] = [
  {
    id: 'solar',
    label: 'SOLAR SYSTEM',
    minDistance: 80.0,            // 太陽系全景閾值
    candidates: () => [
      sun, mercury, venus, earth, mars,
      jupiter, saturn, uranus, neptune,
      // 矮行星、動態彗星依設定決定是否納入
      ...activeComets,
    ],
  },
  {
    id: 'orbital',
    label: 'ORBITAL',
    minDistance: 8.0,             // 行星軌道層閾值
    candidates: (body) => {
      if (!body) return [];
      return [
        getCelestialBody(body),
        ...getSatellites(body),   // 該行星的衛星群
      ];
    },
  },
  {
    id: 'surface',
    label: 'SURFACE',
    minDistance: 0,               // 地表層級
    candidates: (body) => {
      if (!body) return [];
      return [getCelestialBody(body)];
    },
  },
];
```

### 層級判定流程

```typescript
// client/src/hooks/useCelestialNav.ts

function determineNavLevel(
  cameraDistance: number,
  focusedBody:   string | null
): NavLevel {
  // 由遠到近匹配，取第一個符合的層級
  for (const level of NAV_LEVELS) {
    if (cameraDistance >= level.minDistance) {
      return level;
    }
  }
  return NAV_LEVELS[NAV_LEVELS.length - 1]; // fallback: surface
}
```

### 閾值與距離感知互動層級的對應

| 視野層級 | 鏡頭距離 | 對應距離感知層級 | 列表顯示內容 |
|---|---|---|---|
| `solar` | >= 80.0 | 太陽系全景 | 太陽 + 八大行星 + 矮行星 + 活躍彗星 |
| `orbital` | 8.0 ~ 79.9 | 行星軌道層 | 聚焦行星 + 該行星的衛星群 |
| `surface` | < 8.0 | 地表層級 | 僅顯示聚焦天體本身 |

> **NOTE**　`minDistance` 值需與 `CAMERA_CONTROLS.md` 中的 `EARTH_DETAIL_THRESHOLD`（8.0）及場景實際縮放比例校準。若其他天體有不同的細節切換閾值，應在 `NavLevel.minDistance` 中對應調整。

---

## 近鄰感知篩選（選用進階邏輯）

在 `solar` 層級中，當聚焦點明顯偏向某一側太陽系時，可進一步依聚焦點與各天體的距離排序，優先顯示較近的天體，並將遠方天體收合至「更多」區塊：

```typescript
const PROXIMITY_THRESHOLD = 200.0; // 場景單位，超過此距離的天體歸入「更多」

function sortByProximity(
  candidates: CelestialBody[],
  focusPoint: THREE.Vector3
): { primary: CelestialBody[]; overflow: CelestialBody[] } {
  const sorted = candidates
    .map(body => ({
      body,
      dist: body.worldPosition.distanceTo(focusPoint),
    }))
    .sort((a, b) => a.dist - b.dist);

  const primary  = sorted.filter(c => c.dist < PROXIMITY_THRESHOLD).map(c => c.body);
  const overflow = sorted.filter(c => c.dist >= PROXIMITY_THRESHOLD).map(c => c.body);

  return { primary, overflow };
}
```

此邏輯為選用功能。若場景尺度不大或天體數量有限，可略過近鄰篩選，直接顯示完整候選列表。

---

## 資料結構

### 天體描述型別

```typescript
// client/src/types/celestial.ts

interface CelestialBody {
  id:            string;           // 內部識別鍵，如 'earth', 'moon', 'io'
  name:          string;           // 顯示名稱（依語系切換，如 "Earth" / "地球"）
  type:          'star' | 'planet' | 'dwarf' | 'moon' | 'comet';
  parentId:      string | null;    // 母天體 id，如 moon.parentId = 'earth'
  radius:        number;           // 渲染半徑（與 CAMERA_CONTROLS.md 的 BODY_RADIUS 一致）
  color:         string;           // 標識色 hex，用於列表圓點
  worldPosition: THREE.Vector3;    // 當前世界座標（每幀由天文引擎更新）
  hasEvents:     boolean;          // 是否有未讀情報事件（顯示通知點）
  eventCount:    number;           // 關聯事件數量
}
```

### 導覽列表狀態

```typescript
// client/src/store/celestialNavStore.ts

interface CelestialNavState {
  visible:       boolean;                  // 列表是否展開
  currentLevel:  'solar' | 'orbital' | 'surface';
  candidates:    CelestialBody[];          // 當前篩選結果
  overflow:      CelestialBody[];          // 溢出區（近鄰篩選啟用時）
  focusedBodyId: string | null;            // 當前聚焦天體 id

  toggle:        () => void;
  updateList:    (camera: THREE.Camera, target: THREE.Vector3, focused: string | null) => void;
}
```

---

## 狀態更新時機

列表更新掛載於 `OrbitControls` 的 `change` 事件中，與距離感知互動層級的切換共用同一個監聽器：

```typescript
// client/src/hooks/useCelestialNav.ts

controls.addEventListener('change', () => {
  const dist = camera.position.distanceTo(controls.target);
  const level = determineNavLevel(dist, focusedBody);

  // 只在層級變化或聚焦天體變化時重新計算候選列表
  if (level.id !== prevLevel || focusedBody !== prevFocused) {
    const candidates = level.candidates(focusedBody);
    celestialNavStore.getState().updateList(camera, controls.target, focusedBody);
    prevLevel = level.id;
    prevFocused = focusedBody;
  }
});
```

> **NOTE**　避免在每次 `change` 事件都重建候選列表。`OrbitControls` 在拖曳旋轉時會高頻觸發 `change`，僅在層級或聚焦目標實際變化時才執行篩選計算。

---

## 天體點擊行為

列表中的天體點擊直接呼叫 `CAMERA_CONTROLS.md` 中定義的 `focusOnBody()`，行為與場景內點擊天體完全一致：

```typescript
function handleNavItemClick(body: CelestialBody) {
  const viewDistance = body.radius * 4; // 拉近至半徑 4 倍距離
  focusOnBody(body.worldPosition, body.id, viewDistance);
}
```

---

## UI 規格

### 面板位置與尺寸

| 屬性 | 值 | 說明 |
|---|---|---|
| 位置 | 畫面右側，垂直置中 | 避開左側情報面板區域 |
| 寬度 | `180px` | 固定寬度，不隨內容變化 |
| 最大高度 | `60vh` | 超出時內部捲動 |
| Z-Index | `50` | 與全域 UI 同層（工具列、圖層開關） |
| 收合狀態 | 縮為單一 icon（`🧭`），hover 顯示 tooltip | 與面板收合系統一致 |

### 列表項目結構

每個天體項目由以下元素組成：

```
┌─────────────────────────┐
│  ● Earth            (3) │
│  ○ 標識色圓點  名稱  事件數 │
└─────────────────────────┘
```

| 元素 | 規格 | 說明 |
|---|---|---|
| 標識色圓點 | `8px` 圓形，填色為天體 `color` | 聚焦中的天體圓點帶 glow 效果 |
| 天體名稱 | `11px` JetBrains Mono，`--text-primary` | 聚焦中的天體以 `--cyan` 顯示 |
| 事件數量徽章 | `9px`，`--amber` 色 | 僅在 `eventCount > 0` 時顯示 |
| Hover 效果 | 背景 `rgba(0,180,255,0.06)`，左側出現 `1px` cyan 線 | 與情報面板 hover 風格一致 |

### 層級標題

列表頂部顯示當前視野層級標籤：

```
┌─────────────────────────┐
│ ▸ SOLAR SYSTEM          │  ← 層級標題，9px 全大寫
│─────────────────────────│
│  ● Sun                  │
│  ● Mercury              │
│  ● Venus                │
│  ● Earth            (7) │  ← 有 7 個情報事件
│  ● Mars             (2) │
│  ● Jupiter              │
│  ...                    │
└─────────────────────────┘
```

### 溢出區（Overflow）

若啟用近鄰篩選且有溢出天體，以摺疊區塊顯示：

```
│  ...                    │
│  ● Neptune              │
│─────────────────────────│
│ ▸ MORE (3)              │  ← 點擊展開
│   ● Pluto               │
│   ● Ceres               │
│   ● 3I/ATLAS            │
└─────────────────────────┘
```

### 視覺規範對應

所有樣式遵循 README 的視覺規範：

| 屬性 | Token | 值 |
|---|---|---|
| 面板底色 | `--surface` | `rgba(4,9,22,0.92)` |
| 邊框 | `--border` | `rgba(0,180,255,0.12)` |
| 左側發光邊緣 | `--glow-edge` | 漸層 transparent → cyan → purple → transparent |
| 聚焦天體文字色 | `--cyan` | `#00d4ff` |
| 事件徽章色 | `--amber` | `#ff9c2a` |
| 層級標籤 | `--text-muted`，`9px`，`letter-spacing: 0.15em`，全大寫 | 與分區標籤規格一致 |

---

## IMMERSIVE 模式與收合行為

| 情境 | 行為 |
|---|---|
| 一般模式 | 列表常駐顯示，可個別收合為 icon |
| IMMERSIVE 模式 | 隨所有面板一同隱藏，可從 Float Dock 快速喚出 |
| Popout 視窗 | 不支援獨立 Popout（列表功能依賴即時鏡頭狀態，Popout 無意義） |

---

## 場景導覽層級整合

天體導覽列表在場景導覽層級圖中的位置：

```
太陽系全景
  └─ 天體導覽列表：顯示太陽 + 八大行星 + 活躍彗星
  └─ 天體點選（場景 or 列表）→ 天體情報面板
       └─ 天體導覽列表：切換為聚焦行星 + 衛星群
       └─ 地球：開啟政治圖層
            └─ 天體導覽列表：僅顯示地球
            └─ 國家區域點選 → 鏡頭聚焦 → 地區情報面板
```

---

## 效能注意事項

| 議題 | 對策 |
|---|---|
| `change` 事件高頻觸發 | 僅在層級或聚焦目標變化時重新計算候選列表，避免每幀重建 |
| `worldPosition` 每幀更新 | 天體位置由天文引擎在 `animate()` 中統一更新，導覽列表僅讀取不計算 |
| 事件數量查詢 | `eventCount` 由 Zustand store 維護，WebSocket 推送新事件時同步更新，不需每幀查詢 |

---

## 快速查閱

### 層級判定速查

| 鏡頭距離 | 層級 | 列表內容 |
|---|---|---|
| >= 80.0 | `solar` | 太陽 + 全部行星 + 矮行星 + 活躍彗星 |
| 8.0 ~ 79.9 | `orbital` | 聚焦行星 + 該行星衛星群 |
| < 8.0 | `surface` | 僅聚焦天體 |

### 元件與檔案索引

| 功能 | 檔案路徑 |
|---|---|
| 視野層級設定 | `client/src/config/navLevels.ts` |
| 篩選邏輯 Hook | `client/src/hooks/useCelestialNav.ts` |
| 狀態管理 | `client/src/store/celestialNavStore.ts` |
| UI 元件 | `client/src/components/ui/CelestialNavList.tsx` |
| 天體型別定義 | `client/src/types/celestial.ts` |
