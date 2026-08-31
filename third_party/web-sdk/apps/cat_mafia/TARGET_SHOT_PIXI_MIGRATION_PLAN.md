# Cat Mafia — план: тир FX → Pixi (mobile crash)

Статус: **в работе** (п.1–5, 7–10 код готов; регрессия phone Stage E — ручной тест).

---

## Проблема

На телефоне при Stage E (`targetShootRound` в конце bonus normal / bonus super) на **выстреле + попадании** вкладка вылетает и перезагружается.

Не похоже на JS-ошибку логики hit — типичный **mobile WebGL / GPU kill**:

- в пике hit открываются **два лишних HTML `SpinePlayer`** (каждый свой WebGL context) поверх основного Pixi;
- flip тянет atlas **4096×2048** и full-board viewport с CSS-crop ~486% seat (без DPR-cap);
- bullet — ещё один context + canvas ~400×300 × DPR;
- SVG trail с `filter: blur(2.5px)` — отдельный риск на Safari.

`SpinButtonHtmlSpine` в bonus/duel **не виноват**: при `isLockedBonusHud()` кнопка размонтируется. Главные жруны Stage E — flip + bullet + Pixi + blur.

Главный ROI миграции: **survivability** (не убивать вкладку), не «+FPS в базе».

---

## Цель

Убрать HTML WebGL у тир-FX; рисовать в **том же Pixi context**, что игра (как уже сделано для маскота / paw-coins).

| Сейчас | После |
|--------|--------|
| `TargetFlipSpine` = HTML SpinePlayer | Pixi Spine (`SpineProvider` / spine-pixi-v8) |
| `TargetShotBulletOverlay` = HTML SpinePlayer + SVG blur | Pixi Spine + Graphics trail **без** SVG blur |
| +2 WebGL context на тир | +0 context |
| Дубль GPU-текстур atlas | Один upload / share с Pixi |

---

## Порядок работ

| # | Задача | Зачем | Статус |
|---|--------|--------|--------|
| 1 | **Z-order:** FX поверх HTML seats на время тира | `pixi-stage.above-html-ui` при `targetShotFlight` / `targetShotFlip` | **done** |
| 2 | **`TargetShotBulletOverlay` → Pixi** | `TargetShotBulletPixiLayer` + `stateGame.targetShotFlight` | **done** |
| 3 | **`TargetFlipSpine` → Pixi** | `TargetFlipPixiLayer` + seat viewport + `stateGame.targetShotFlip` | **done** |
| 4 | Seat viewport + phone DPR discipline | Flip seat-sized; `targetBoardFlip` в phone atlas downscale ≤2048 | **done** |
| 5 | Удалить / сузить HTML spine path | Production pick/shoot без HTML flip/bullet; DEV `TargetBoardOverlay` ещё на HTML | **done*** |
| 6 | Регрессия entry + Stage E | Один код-путь для pick и shoot | todo (ручной тест) |
| 7 | **Кот: один скин в памяти** (gray base / white FS) | Phone: unload unused atlas; preload under steam via `EnableMascotCatSkinMemory` | **done** |
| 8 | **Dog mascot: mount только в duel** | В `Game.svelte` `<MascotPixi variant="duelDog" />` всегда в дереве → atlas 2048×2048 зря. Монтировать только при `stateDuel.active` (и не в portrait, как сейчас по layout) | **done** |
| 9 | **`coinHtmlSpine`: убрать / dispose idle** | Prewarm bronze/silver/gold HTML SpinePlayer’ы, `preserveDrawingBuffer: true`, при 0 targets только `paused` без dispose → лишние WebGL context. Удалить HTML hub (paw уже в Pixi) или dispose runtimes когда idle | **done** |
| 10 | **Phone: runtime downscale крупных atlas (вариант B)** | После load на phone уменьшить GPU-текстуры: `board` 4096×2048 → ≤2048, H1/cartridge 2048² → ≤1024/2048, при необходимости background/mascot. **Цель — −VRAM / ниже фон перед hit, не +FPS спина.** Полный файл всё равно качается/декодится; downscale на CPU. Долгосрочно лучше отдельные mobile-atlas (вариант A) — вне этого пункта | **done** |

\* HTML `TargetFlipSpine` / `TargetShotBulletOverlay` оставлены для DEV QA board; production entry + Stage E — только Pixi.

Опционально раньше полного переноса (быстрые полумеры): seat viewport + DPR-cap у HTML flip/bullet, убрать SVG blur — снижают риск, но **не** убирают лишние context.

---

## Ожидаемый выигрыш

| Метрика | Ожидание |
|---------|----------|
| Reload на hit (phone) | Главный выигрыш — −2 WebGL context в пике |
| Пик GPU-памяти Stage E | Заметно (−~30–40 MB порядка, если atlas не дублируется) |
| Пик до/во время FS (п.7–9) | −1 лишний cat atlas; вне duel − dog 2048²; − HTML coin Spine context’ы |
| Пик VRAM (п.10) | Board ~−75% по этой текстуре (4K→2K); H1/cartridge заметно. Косвенно выше шанс пережить hit |
| FPS спина от п.10 | Слабо — B не про +FPS, про память |
| FPS во время выстрела | Умеренно при 1:1; сильнее с seat-viewport и без blur |
| Базовый FPS вне тира | Почти без изменений |

---

## Ключевые файлы

**Production Pixi path:**

- `src/components/TargetShotBulletPixiLayer.svelte` + `TargetShotBulletSpineSlots.svelte`
- `src/components/TargetFlipPixiLayer.svelte` + `TargetFlipSpineSlots.svelte`
- `src/components/TargetShootOverlay.svelte` / `TargetPickOverlay.svelte` → `stateGame.targetShotFlight` / `targetShotFlip`
- `src/components/TargetShootBoard.svelte` / `TargetPickBoard.svelte` — HTML hit + static face
- `src/components/Game.svelte` — layers z 90/91; `above-html-ui` на flight/flip
- `src/game/targetBoardAssets.ts` — `TargetShotFlipFx`, `getTargetFlipPixiTransform`
- `src/game/shotBulletAssets.ts` — `TargetShotFlight`, `getShotBulletPixiTransform`
- `src/game/assets.ts` — `shotBullet`, `targetBoardFlip`

**Legacy / DEV (ещё HTML):**

- `src/components/TargetFlipSpine.svelte`
- `src/components/TargetShotBulletOverlay.svelte`
- `src/components/TargetBoardOverlay.svelte`

**Ориентиры уже в Pixi:**

- `src/components/MascotPixi.svelte` + `MascotSpineController.svelte` — п.7 `mascotCatSpineKey`; п.8 `variant="duelDog"`
- `src/game/mascotCatSkinMemory.ts` + `EnableMascotCatSkinMemory.svelte` — п.7 phone unload/reload
- `src/components/TargetPickPixiLayer.svelte` — cabinet/holders
- `src/game/coinHtmlSpine.ts` + `CoinPawSprite.svelte` / `PawCoinOverlay.svelte` — п.9 HTML hub
- `src/game/phoneSpineAtlasDownscale.ts` — п.10 (+ `targetBoardFlip`)

**Стек:** `@esotericsoftware/spine-pixi-v8`, `pixi-svelte` `SpineProvider`.

---

## Тест-план

- [ ] Phone portrait: полный bonus normal → Stage E → несколько hit без reload
- [ ] Phone: bonus super (sticky) → Stage E → hit без reload
- [ ] Entry `freeSpinTargetPick`: shot + flip + trail как сейчас
- [ ] Stage E: multi-shot queue, blank reward (`—`), extra FS intro
- [ ] Desktop / tablet / popout-s: дуга, muzzle, stacking поверх seats
- [ ] Trail без SVG blur, читаемый; нет прыжка fly → impact
- [ ] После тира нет утечки HTML SpinePlayer / лишних canvas в DOM (production path)
- [ ] Duel / base: регрессии нет (тир FX не торчит)
- [ ] п.7: base → только gray; FS/duel → white; переход без пропавшего маскота / мерцания
- [ ] п.8: вне duel нет dog spine в сцене/ассетах; duel desktop/tablet — dog на месте; portrait duel без регрессии
- [ ] п.9: после paw-fly нет живых HTML coin SpinePlayer в DOM; base paw / hat-catch без регрессии; FS не создаёт coin HTML runtimes
- [ ] п.10 phone: board/H1/`targetBoardFlip` в GPU ≤ целевого max; desktop без downscale; визуал board/символов приемлемый (без сильного мыла)
- [x] п.1–5 код: Pixi bullet + flip + z-order; boards без HTML Spine
- [x] п.7: phone — один cat atlas; preload под steam; desktop оба в памяти
- [x] п.8: dog только при `stateDuel.active`
- [x] п.9: нет prewarm HTML coin Spine; dispose on idle
- [x] п.10: `EnablePhoneSpineAtlasDownscale` + `phoneSpineAtlasDownscale.ts`
- [x] interim: убран SVG `filter: blur` у shot trail (Safari)

---

## Вне скоупа

- Перенос всего HTML board (кнопки seats) в Pixi — желательно позже, не блокер если z-order решён
- Оптимизация spin-button (в FS/duel уже unmount)
- Редизайн анимаций v3/v4 / explosion
- Отдельные mobile-atlas packs (вариант A) и ASTC/Basis — следующий трек после п.10
- Lazy bigwin / отложенный preload — отдельный бэклог
- DEV `TargetBoardOverlay` → Pixi (опционально)
