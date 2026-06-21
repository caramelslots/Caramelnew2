# Неиспользуемые ассеты — `daloniil_test`

> **Статус:** неиспользуемые ассеты удалены (2026-06-22). Осталось ~141 файлов в `static/assets/`.  
> Дата первоначального аудита: 2026-06-22  
> Скрипт для повторной проверки: `node scripts/auditUnusedAssets.mjs`

## Методология

Анализ выполнен по исходникам в `src/` и манифестам:

| Источник | Назначение |
|---|---|
| `src/game/assets.ts` | Pixi-ассеты (спрайты, spine, шрифты, аудио) — загружаются через `createApp({ assets })` |
| `src/game/uiHtmlAssetManifest.ts` | HTML-оверлеи HUD / settings / autoplay / buy bonus |
| `src/game/loaderCardAssets.ts` | Карточки лоадера |
| `src/components/BootstrapLoader.svelte` | `static/logo-loader/` + фон дня |

**Критерии «не используется»:**

1. **Файл на диске не referenced** — путь не встречается ни в коде, ни в `assets.ts`, ни в atlas/json/fnt-зависимостях.
2. **Зарегистрирован в `assets.ts`, но не рендерится** — файл **загружается при старте**, но ни один компонент не обращается к ключу (`key="..."`, `assets.*`, `fontFamily` и т.д.).

---

## Сводка

| Категория | Кол-во | ~Размер |
|---|---:|---:|
| Всего файлов в `static/assets/` | 248 | — |
| Полностью неиспользуемые папки (legacy) | 11 папок | **~19 MB** |
| Зарегистрированы в `assets.ts`, но не рендерятся | 13 ключей | ~3 MB (грузятся зря) |
| Отдельные лишние файлы в используемых папках | ~10 файлов | ~5 MB |
| Дубликат `assets/` (не в prod) | ~350 файлов | зеркало `static/assets` |

---

## 1. Полностью неиспользуемые папки (можно удалить)

Эти каталоги **не упоминаются** в `assets.ts` и **не referenced** в коде.

### Spine-анимации (legacy / от других игр)

| Папка | Файлов | ~Размер | Причина |
|---|---:|---:|---|
| `static/assets/spines/symbols/` | 12 | 2.1 MB | Старые символы; заменены на `symbolsNew/` |
| `static/assets/spines/symbols2/` | 5 | 3.8 MB | Legacy M/S символы |
| `static/assets/spines/symbolsBounce/` | 12 | 656 KB | Промежуточный экспорт bounce-анимаций |
| `static/assets/spines/bonusButton/` | 8 | 988 KB | Кнопка buy bonus — сейчас HTML-спрайты в `sprites/ui/buy_bonus/` |
| `static/assets/spines/loader/` | 4 | 2.7 MB | Не используется; bootstrap-лоадер берёт `static/logo-loader/` |
| `static/assets/spines/foregroundAnimation/` | 4 | 2.8 MB | Фоновая анимация не подключена |
| `static/assets/spines/foregroundFeatureAnimation/` | 4 | 2.3 MB | Feature-фон не подключён |
| `static/assets/spines/winMeterExplosion/` | 3 | 632 KB | UI explosion не используется |

### Шрифты

| Папка | Файлов | ~Размер | Причина |
|---|---:|---:|---|
| `static/assets/fonts/goldFont/` | 4 | 596 KB | Legacy `mm_gold` — заменён на `prostoiFont` / `krutoiFont` / `babloFont` |

### UI-спрайты (SDK-шаблон)

| Папка | Файлов | ~Размер | Причина |
|---|---:|---:|---|
| `static/assets/sprites/uiSlotsAssetsBespoke/` | 8 | 152 KB | Старые turbo/autospin active-состояния SDK; HUD переведён на `sprites/ui/` |

---

## 2. Зарегистрированы в `assets.ts`, но не рендерятся

> ⚠️ Эти ассеты **загружаются при старте** (через `stateApp`), но **ни один Svelte-компонент** к ним не обращается. Их можно убрать из `assets.ts` и удалить файлы.

| Ключ в `assets.ts` | Путь | Замена / комментарий |
|---|---|---|
| `pressToContinueText` | `sprites/pressToContinueText/` | Текст «Press anywhere» — `FONT_PROSTOI_WHITE` в `PressToContinue.svelte` |
| `reelsFrame` | `sprites/reelsFrame/reels_frame.json` | Рамка барабанов не отображается |
| `payFrame` | `sprites/payFrame/payFrame.png` | Pay frame не используется |
| `symbolsStatic` | `sprites/symbolsStatic/symbolsStatic.json` | Кот в progress bar — отдельный `cat_static.png`, не atlas |
| `goldBlur` | `fonts/goldBlur/miningfont_gold_blur.xml` | Legacy шрифт, нет `fontFamily` в коде |
| `silverFont` | `fonts/silverFont/mm_silver.xml` | Legacy шрифт |
| `purpleFont` | `fonts/purpleFont/mm_purple.xml` | Legacy шрифт |
| `fsIntro` | `spines/fsIntro/fs_screen.json` | FS intro — PNG `fsCong/` + `FreeSpinIntro.svelte` |
| `fsIntroNumber` | `spines/fsIntro/fs_screen_number.json` | — |
| `fsOutroNumber` | `spines/fsIntro/fs_total_number.json` | — |
| `tumble_multiplier` | `spines/tumbleWin/tumble_multiplier.json` | Tumble-механика не подключена (только звуки `tumble_win_*`) |
| `tumble_win` | `spines/tumbleWin/tumble_win.json` | — |
| `clusterWin` | `spines/clusterWin/clusterpay.json` | Cluster pay не используется в Cash Stacks |

**Суммарный размер папок с «мёртвой» регистрацией:** ~3 MB (`fsIntro` 872 KB + `tumbleWin` 1.3 MB + `clusterWin` 36 KB + `pressToContinueText` 168 KB + `reelsFrame` + `payFrame` + `symbolsStatic` + legacy fonts).

---

## 3. Отдельные неиспользуемые файлы (внутри рабочих папок)

| Файл | Причина |
|---|---|
| `spines/symbols3/W.json` | Используется только `explosion.json`; Wild — `symbolsNew/Special_2` |
| `spines/symbolsNew/symbols_full.json` | Combined skeleton до split-скрипта; per-symbol JSON используются |
| `sprites/background/d1.jpg`, `n1.jpg` | JPG-варианты; в игре `day.png` / `night.png` |
| `sprites/bonusBar/cat_atlas.png` | Не referenced; используется `cat_static.png` |
| `sprites/bonusBar/paw.png` | Не referenced |
| `sprites/ui/autoplay/bg_auto.png` | Заменён на `bg_auto_panel.png` в `uiHtmlAssetManifest.ts` |
| `sprites/ui/settings/slider_head.png` | Используется `slider_knob.png` |
| `sprites/ui/settings/sound_icon.png` | Не referenced в манифесте |

---

## 4. Используемые шрифты (для справки)

| Ключ `assets.ts` | `fontFamily` в коде | Где |
|---|---|---|
| `babloFont` | `Noto Sans SemiCondensed SemiBold` (`FONT_BABLO`) | Суммы выигрышей, HUD WIN |
| `prostoiFont` | `Reggae One Regular` (`FONT_PROSTOI`) | Символы, FS counter, multiplier |
| `prostoiWhiteFont` | `Reggae One White` (`FONT_PROSTOI_WHITE`) | Press to continue |
| `krutoiFont` | `Shojumaru` (`FONT_KRUTOI`) | Big/Super/Epic win баннер |

**Не используются в UI:** `goldBlur`, `silverFont`, `purpleFont`, `goldFont/` (папка).

---

## 5. Используемые spine / spritesheet (для справки)

| Ключ | Компонент |
|---|---|
| `H1`–`L4`, `W`, `WWin`, `B`, `BWin`, `M` | `SymbolSpineMain.svelte`, `ReelSymbol` |
| `explosion` | Tumble / mystery reveal |
| `anticipation` | `Anticipation.svelte`, `Symbol.svelte` |
| `bigwin` | `WinAnimation.svelte` |
| `globalMultiplier` | `GlobalMultiplier.svelte` |
| `fsPopup` | `FreeSpinAnimation.svelte` |
| `transition` | `TransitionAnimation.svelte` |
| `reelhouse` | `BoardFrame.svelte` |
| `progressBar` | `LoadingScreen.svelte` (frames `progressBar*.png`) |
| `winSmall`, `freeSpins` | `FreeSpinOutro.svelte` (frames `winsmall_*`, `freespins_*`) |
| `coins` | `WinCoins.svelte` |
| `sound` | `EnableSound.svelte` |

---

## 6. HTML UI-ассеты (`uiHtmlAssetManifest.ts`)

Все пути из `HUD_ASSETS`, `SETTINGS_ASSETS`, `AUTOSPIN_ASSETS`, `BUY_BONUS_ASSETS`, `FEATURE_TOGGLE_ASSETS` **используются** в HTML-оверлеях.

**Не используются из `sprites/ui/`:**

- `autoplay/bg_auto.png` (см. §3)
- `settings/slider_head.png`, `settings/sound_icon.png` (см. §3)

Pixi-кнопки (`betPlus`, `spin1`, `menuButton` и т.д.) в `assets.ts` **используются** компонентами `CashStacks*Button.svelte` параллельно с HTML `<img>` — это не дубликат-мусор, а двойной рендер-путь.

---

## 7. Файлы вне `static/assets/`

| Файл | Статус |
|---|---|
| `static/favicon.svg` | ✅ `app.html` |
| `static/stake-engine-loader.gif` | ✅ `+layout.svelte` |
| `static/logo-loader/*` | ✅ `BootstrapLoader.svelte` |
| `static/loader.gif` | ❌ **не используется** |

---

## 8. Папка `assets/` в корне приложения

`third_party/web-sdk/apps/daloniil_test/assets/` — **зеркальная копия** части `static/assets/` (dev/build handoff). В prod отдаётся только `static/`. Можно удалить или добавить в `.gitignore`, если не нужна локально.

---

## 9. Рекомендации

### Безопасно удалить (~19 MB, без изменения кода)

```
static/assets/spines/symbols/
static/assets/spines/symbols2/
static/assets/spines/symbolsBounce/
static/assets/spines/bonusButton/
static/assets/spines/loader/
static/assets/spines/foregroundAnimation/
static/assets/spines/foregroundFeatureAnimation/
static/assets/spines/winMeterExplosion/
static/assets/fonts/goldFont/
static/assets/sprites/uiSlotsAssetsBespoke/
static/loader.gif
```

### Удалить после правки `assets.ts` (~3 MB + меньше preload)

Убрать ключи из `src/game/assets.ts` (§2), затем удалить соответствующие файлы:

```
static/assets/sprites/pressToContinueText/
static/assets/sprites/reelsFrame/
static/assets/sprites/payFrame/
static/assets/sprites/symbolsStatic/
static/assets/fonts/goldBlur/   # оставить только если нужен для других проектов
static/assets/fonts/silverFont/
static/assets/fonts/purpleFont/
static/assets/spines/fsIntro/
static/assets/spines/tumbleWin/
static/assets/spines/clusterWin/
```

### Приоритет по impact

1. **Legacy spine-папки** — самый большой выигрыш по размеру, zero risk.
2. **Мёртвая регистрация в `assets.ts`** — ускорит загрузку игры.
3. **Единичные PNG** (§3) — косметическая чистка.

---

## 10. Полный список файлов без ссылок (авто-аудит)

Сгенерировано `scripts/auditUnusedAssets.mjs`:

```
fonts/goldFont/mm_gold.json
fonts/goldFont/mm_gold.png
fonts/goldFont/mm_gold.webp
fonts/goldFont/mm_gold.xml
spines/foregroundAnimation/mm_bg.atlas
spines/foregroundAnimation/mm_bg.json
spines/foregroundAnimation/mm_bg.png
spines/foregroundAnimation/mm_bg.webp
spines/foregroundFeatureAnimation/mm_bg_feature.atlas
spines/foregroundFeatureAnimation/mm_bg_feature.json
spines/foregroundFeatureAnimation/mm_bg_feature.png
spines/foregroundFeatureAnimation/mm_bg_feature.webp
spines/symbols/h5.json
spines/symbols2/symbols2.atlas
spines/symbols2/symbols2.png
spines/symbols2/symbols2.webp
spines/symbolsNew/symbols_full.json
spines/winMeterExplosion/ui_explosion.atlas
spines/winMeterExplosion/ui_explosion.json
spines/winMeterExplosion/ui_explosion.png
sprites/bonusBar/cat_atlas.png
sprites/ui/settings/slider_head.png
sprites/ui/settings/sound_icon.png
sprites/uiSlotsAssetsBespoke/autospin_active.png
sprites/uiSlotsAssetsBespoke/autospin_active.webp
sprites/uiSlotsAssetsBespoke/autospin_active_hover.png
sprites/uiSlotsAssetsBespoke/autospin_active_hover.webp
sprites/uiSlotsAssetsBespoke/turbo_active.png
sprites/uiSlotsAssetsBespoke/turbo_active.webp
sprites/uiSlotsAssetsBespoke/turbo_active_hover.png
sprites/uiSlotsAssetsBespoke/turbo_active_hover.webp
```

> Примечание: скрипт не помечает целые legacy-папки (`spines/symbols/`, `spines/bonusButton/` и т.д.), если basename файла случайно встречается в комментариях. §1–§3 содержит ручную верификацию по `assets.ts`.
