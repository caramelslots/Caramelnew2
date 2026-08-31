# Cat Mafia — план: тир / shot polish

Статус: **реализовано**.

---

## Реализовано

| # | Задача | Что сделано |
|---|--------|-------------|
| 1 | Пуля меньше | `SHOT_BULLET_FLY_DISPLAY` → `400×300` |
| 2 | Trail быстрее | `TARGET_SHOT_PATH_FADE_MS` → `120` |
| 3 | Тир до transition | pick на base → board exit → `freeSpinTrigger` cloud + intro |
| 4 | Плавная дуга | SVG cubic `C` один раз; RAF только двигает пулю |
| 5 | Idle off | `EnableLivingIdle` гейтит `targetPickOpen` (bounce уже был) |

---

## Порядок Stage C (актуальный)

1. `uiHide`
2. Target board → pick → shot → reveal → board slide up
3. `transition` → freegame
4. FreeSpinIntro → counter → `uiShow`

---

## Ключевые файлы

- `src/game/shotBulletAssets.ts` — size, fade, `svgPath` / `cubicSvgPath`
- `src/components/TargetShotBulletOverlay.svelte` — path once, not RAF polyline
- `src/game/bookEventHandlerMap.ts` — Stage C order
- `src/components/TargetPickOverlay.svelte` — no intro inside pick
- `src/components/EnableLivingIdle.svelte` — tir gate

---

## Тест-план

- [ ] Entry pick: тир до steam; после — intro
- [ ] Path гладкий на desktop / popout-s / throttled FPS
- [ ] Пуля меньше; trail гаснет быстрее
- [ ] Extra Spins: несколько выстрелов, текстура пули
- [ ] Idle bounce / living idle молчат при `targetPickOpen`
