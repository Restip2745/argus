# 鏡頭控制系統 — Three.js 技術文件

> 對應 README 的「🕹 鏡頭控制系統」章節，說明各操作行為在 Three.js 中的具體實作方式。

---

## 使用的控制器

採用 Three.js 內建的 **`OrbitControls`**（`three/examples/jsm/controls/OrbitControls`）。

`OrbitControls` 預設行為與本專案需求的對應如下：

| 使用者操作 | OrbitControls 對應行為 | 是否需要調整 |
|---|---|---|
| 滾輪縮放 | `enableZoom: true`（預設） | 需設定 `minDistance` 動態限制 |
| 右鍵旋轉 | `mouseButtons.RIGHT = ROTATE` | 需對調左右鍵預設行為 |
| 左鍵平移 | `mouseButtons.LEFT = PAN` | 需對調左右鍵預設行為 |
| WASD 平移 | 無內建支援 | 需自行監聽 `keydown` 手動實作 |
| 點擊天體聚焦 | 無內建支援 | 需自行計算目標位置並以 tween 動畫移動 |

---

## 初始化設定

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const controls = new OrbitControls(camera, renderer.domElement);

// 對調左右鍵：右鍵旋轉、左鍵平移
controls.mouseButtons = {
  LEFT:   THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT:  THREE.MOUSE.ROTATE,
};

// 觸控對應（選用）
controls.touches = {
  ONE:  THREE.TOUCH.PAN,
  TWO:  THREE.TOUCH.DOLLY_ROTATE,
};

controls.enableDamping = true;      // 慣性阻尼，讓旋轉/平移有滑順感
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true; // 平移時維持在螢幕平面，不會歪掉
controls.enableZoom = true;
controls.zoomSpeed = 1.0;

// 全景模式預設無下限
controls.minDistance = 0;
controls.maxDistance = Infinity;
```

---

## Zoom 距離限制：動態 minDistance

當鏡頭聚焦特定天體時，`minDistance` 必須動態設為該天體的渲染半徑加上安全緩衝，防止鏡頭穿入天體內部。

```typescript
// 天體渲染半徑查找表（Three.js 場景單位）
const BODY_RADIUS: Record<string, number> = {
  sun:     109.0,
  mercury:   0.38,
  venus:     0.95,
  earth:     1.0,
  mars:      0.53,
  jupiter:  11.2,
  saturn:    9.45,
  uranus:    4.0,
  neptune:   3.88,
  moon:      0.27,
  // 彗星 / 星際天體給一個象徵性半徑
  '3i-atlas': 0.05,
};

const SAFE_BUFFER = 0.15; // 緩衝值，防止貼面飛行

function setFocusTarget(bodyName: string | null) {
  if (bodyName === null) {
    // 太陽系全景模式：無下限
    controls.minDistance = 0;
  } else {
    const radius = BODY_RADIUS[bodyName] ?? 1.0;
    controls.minDistance = radius + SAFE_BUFFER;
  }
}
```

切換聚焦目標時呼叫 `setFocusTarget()`，確保 `minDistance` 在鏡頭動畫開始前就更新。

---

## 點擊天體：平滑聚焦動畫

點擊天體後，鏡頭需要平滑移動至該天體附近的適當距離，而不是瞬間跳切。使用 **`@tweenjs/tween.js`** 實作緩動動畫。

```typescript
import * as TWEEN from '@tweenjs/tween.js';

function focusOnBody(
  targetPosition: THREE.Vector3,
  bodyName: string,
  viewDistance: number   // 拉近後鏡頭與天體的距離，通常為半徑的 3–5 倍
) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  // 目標鏡頭位置：天體正前方 viewDistance 處
  const endPos = targetPosition.clone().add(
    new THREE.Vector3(0, viewDistance * 0.3, viewDistance)
  );
  const endTarget = targetPosition.clone();

  // 先更新距離限制
  setFocusTarget(bodyName);

  new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, 1200)                        // 動畫時長 1.2s
    .easing(TWEEN.Easing.Cubic.InOut)          // 緩入緩出
    .onUpdate(({ t }) => {
      camera.position.lerpVectors(startPos, endPos, t);
      controls.target.lerpVectors(startTarget, endTarget, t);
      controls.update();
    })
    .start();
}
```

在 `animate()` loop 中需要呼叫 `TWEEN.update()`：

```typescript
function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();           // 必須在 TWEEN.update() 之後
  renderer.render(scene, camera);
}
```

---

## WASD 鍵盤平移

`OrbitControls` 內建的鍵盤支援僅限上下左右方向鍵，且行為與 PAN 不一致。建議自行監聽 `keydown` 並操作 `controls.target`：

```typescript
const PAN_SPEED = 0.5;
const keysPressed = new Set<string>();

window.addEventListener('keydown', (e) => keysPressed.add(e.key.toLowerCase()));
window.addEventListener('keyup',   (e) => keysPressed.delete(e.key.toLowerCase()));

function handleWASD() {
  if (keysPressed.size === 0) return;

  // 取得鏡頭的右方向與上方向，讓平移跟著視角走
  const right = new THREE.Vector3();
  const up    = new THREE.Vector3();
  camera.getWorldDirection(right);  // 先取前方
  right.cross(camera.up).normalize();   // 前方 × 上方 = 右方
  up.copy(camera.up);

  const delta = new THREE.Vector3();
  if (keysPressed.has('a')) delta.addScaledVector(right, -PAN_SPEED);
  if (keysPressed.has('d')) delta.addScaledVector(right,  PAN_SPEED);
  if (keysPressed.has('w')) delta.addScaledVector(up,     PAN_SPEED);
  if (keysPressed.has('s')) delta.addScaledVector(up,    -PAN_SPEED);

  controls.target.add(delta);
  camera.position.add(delta);
  controls.update();
}

// 在 animate() loop 中呼叫
function animate() {
  requestAnimationFrame(animate);
  handleWASD();
  TWEEN.update();
  controls.update();
  renderer.render(scene, camera);
}
```

---

## 距離感知互動層級的切換時機

地球從「一般天體節點」切換至「政治圖層 + 事件標記」的距離閾值，建議在 `controls` 的 `change` 事件中偵測：

```typescript
const EARTH_DETAIL_THRESHOLD = 8.0; // Three.js 場景單位，依實際縮放比例調整

controls.addEventListener('change', () => {
  if (focusedBody !== 'earth') return;

  const dist = camera.position.distanceTo(controls.target);
  const isCloseEnough = dist < EARTH_DETAIL_THRESHOLD;

  // 切換圖層可見性
  geojsonLayer.visible    = isCloseEnough;
  eventMarkersLayer.visible = isCloseEnough;
});
```

---

## 返回上一視角

點選情報面板的「返回」按鈕時，需要還原鏡頭到聚焦前的位置：

```typescript
// 聚焦前先儲存當前狀態
let previousCameraState: {
  position: THREE.Vector3;
  target:   THREE.Vector3;
  bodyName: string | null;
} | null = null;

function saveCameraState() {
  previousCameraState = {
    position: camera.position.clone(),
    target:   controls.target.clone(),
    bodyName: currentFocusedBody,
  };
}

function restoreCameraState() {
  if (!previousCameraState) return;
  setFocusTarget(previousCameraState.bodyName);
  focusOnBody(
    previousCameraState.target,
    previousCameraState.bodyName ?? 'none',
    camera.position.distanceTo(previousCameraState.target)
  );
}
```