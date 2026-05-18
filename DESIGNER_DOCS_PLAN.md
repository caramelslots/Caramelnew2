# План: документация для дизайнера (Cash Stacks / `daloniil_test`)

> **Статус:** черновик плана (шаг 0).  
> **Цель:** подготовить пакет для дизайнера — размеры, элементы, компоненты, анимации, примеры ассетов.  
> **Игра:** Cash Stacks (`0_0_daloniil_test`), фронт `third_party/web-sdk/apps/daloniil_test`.

---

## 1. Что получится на выходе

После выполнения плана в корне репозитория появится:

```
designer-handoff/                    # новая папка в корне Caramelnew2
├── README.md                        # как пользоваться пакетом
├── GAME_DESIGN_SPEC.md              # главный документ для дизайнера
├── examples/                        # копии репрезентативных ассетов (не весь static/)
│   ├── symbols/                     # spine + atlas + static sprites по символам
│   ├── ui/                          # рамка, прогресс, FS, шрифты (выборочно)
│   ├── fx/                          # win, anticipation, transition, explosion
│   └── audio/                       # sounds.json + 2–3 примера sfx (опционально)
└── references/                      # скриншоты из Storybook (опционально, этап 3)
```

`GAME_DESIGN_SPEC.md` должен ответить на вопросы дизайнера:

- Сколько символов на борде, сетка, отступы, размер ячейки в px.
- Полный список символов: H1–H4, L1–L4, W (Wild), B (Bonus), M (Mystery) — что уже нарисовано, что placeholder.
- Визуальная тема текущих стоковых ассетов (Mining Mayhem): сердце, лопата, шахтёр, динамит и т.д.
- Какие Spine-анимации есть и когда проигрываются (win / land / spin / intro / idle).
- UI-компоненты: борд, paylines, Progress Ladder, Buy Bonus, overlays.
- Что нужно нарисовать в Wild-West теме вместо плейсхолдеров.

---

## 2. Важные расхождения в документации (сверить в начале)

Перед сбором спецификации зафиксировать **актуальные** значения из кода (не из устаревших README):

| Источник | Что пишет | Актуально по коду (приоритет) |
|----------|-----------|-------------------------------|
| `apps/daloniil_test/README.md` | 5×6, 50 paylines | **Устарело** |
| `apps/daloniil_test/UNIMPLEMENTED.md` | 5×5, 30 paylines | Согласовано с `config.ts` |
| `src/game/config.ts` | 5×5, 30 paylines | ✅ Источник для UI |
| `math-sdk/.../game_config.py` | 5×5, **20** paylines (комментарий M1) | ⚠️ Проверить расхождение с фронтом (30 vs 20) |

**Действие в этапе 1:** одной строкой в `GAME_DESIGN_SPEC.md` указать финальную сетку и число линий после сверки `config.ts` ↔ `game_config.py`.

---

## 3. Маршрут по папкам (что смотреть и что выписать)

### 3.1. Корень репозитория

| Путь | Зачем |
|------|--------|
| `DESIGNER_DOCS_PLAN.md` | Этот план |
| `README.md` | Контекст монорепо (минимальный) |

---

### 3.2. Фронтенд — игра `daloniil_test`

#### A. Спецификация слота и символы

| Путь | Что извлечь |
|------|-------------|
| `third_party/web-sdk/apps/daloniil_test/src/game/constants.ts` | `SYMBOL_SIZE` (100px), `BOARD_DIMENSIONS`, `SYMBOL_INFO_MAP` (типы: sprite/spine/placeholder, `animationName`, `sizeRatios`), spin-параметры, z-index, offsets борда/рамки |
| `third_party/web-sdk/apps/daloniil_test/src/game/config.ts` | `numReels`, `numRows`, paylines, paytable, bet-modes |
| `third_party/web-sdk/apps/daloniil_test/src/game/types.ts` | Поля символа: `wild`, `scatter`, `multiplier` |
| `third_party/web-sdk/apps/daloniil_test/src/game/utils.ts` | Логика состояний символа, mystery reveal sync animation |
| `third_party/web-sdk/apps/daloniil_test/src/game/winLevelMap.ts` | Уровни выигрыша → анимации big win (intro/idle/outro) |
| `third_party/web-sdk/apps/daloniil_test/src/game/stateLayout.ts` | Breakpoints: desktop / tablet / landscape / portrait, ratio фона |
| `third_party/web-sdk/apps/daloniil_test/src/game/sound.ts` | Список SFX и привязки (wild explode, scatter stops) |

#### B. Реестр ассетов и пути к файлам

| Путь | Что извлечь |
|------|-------------|
| `third_party/web-sdk/apps/daloniil_test/src/game/assets.ts` | Полный список `assetKey` → spine/sprites/font/audio |
| `third_party/web-sdk/apps/daloniil_test/static/assets/` | Файлы для копирования в `designer-handoff/examples/` (см. §4) |

**Подпапки `static/assets/`:**

| Подпапка | Содержимое для дизайнера |
|----------|--------------------------|
| `spines/symbols/` | H1–H4, L1–L4 — общий `symbols.atlas` + `symbols.webp`; анимации `h1`…`l4` |
| `spines/symbols3/` | Wild `W.json` (`wild_dynamite`, `wild_dynamite_land`), `explosion.json` |
| `spines/symbols2/` | `M.json`, `S.json` (scatter) — для mystery/bonus spine после замены placeholder |
| `sprites/symbolsStatic/` | Статичные кадры spin/land: `h1.webp`…`l4.webp`, `w.png`, `explodedW.png` (200×200 source) |
| `spines/anticipation/` | Anticipation на барабане |
| `spines/bigwin/` | Big / Mega / Epic / Max win |
| `spines/fsIntro/` | Free Spins intro / counter / outro numbers |
| `spines/transition/` | Переход base ↔ feature |
| `spines/foregroundAnimation/` | Фон base (`idle`, `dust`), лопата `bg_shovel_add`, фонари |
| `spines/foregroundFeatureAnimation/` | Фон FS (bonus lanterns) |
| `spines/reelhouse/` | Подсветка sticky mystery reel (`reelhouse_glow_*`) |
| `spines/reelhouse/`, `sprites/reelsFrame/`, `sprites/payFrame/` | Рамка борда |
| `sprites/progressBar/`, `sprites/freeSpins/` | UI FS / ladder (если есть спрайты) |
| `sprites/coin/`, `sprites/winSmall/` | Монеты, мелкий win-текст |
| `fonts/` | gold / silver / purple / goldBlur — для win counter |
| `audio/sounds.json` | Карта звуков |

**Маппинг «код → картинка» (визуальные элементы в atlas):**

Из `symbols.atlas` и slot-имён в spine JSON:

| Код | Текущий визуал (сток Mining Mayhem) | Ключевые attachment-ы |
|-----|-------------------------------------|------------------------|
| L1 | Сердце | `heart`, `heart_glow`, `heart_shine` |
| L2 | (см. `l2.json` slots) | `t2_*` в atlas |
| L3 | (см. `l3.json`) | `t3_*`, hammer |
| L4 | Лопата | `t4_shovel`, `t4_shovel_shine` |
| H1 | Шахтёр (лицо, шлем, усы) | `beard`, `helmet`, `face`, `moustache` |
| H2–H4 | Высокие символы (разные tier) | `diamond`, `clover`, `t5_pick` и др. |
| W | Динамит | `wild_dynamite` в `symbols3.atlas` |
| B | **Placeholder** (оранжевый rect) | Нет финального ассета |
| M | **Placeholder** (фиолетовый «?») | Spine `M.json` есть, UI пока placeholder |

**Действие:** для каждого `h*.json` / `l*.json` выписать список анимаций из блока `"animations": { ... }` и длительность (из spine).

#### C. Компоненты и поведение анимаций

| Путь | Что описать для дизайнера |
|------|---------------------------|
| `src/components/Symbol.svelte` | Цепочка: placeholder → sprite → spine; win frame; event `wildExplode` |
| `src/components/SymbolSpine.svelte`, `SymbolSpineMain.svelte` | SpineTrack, `payframe` loop на win |
| `src/components/SymbolSprite.svelte` | Статика при spin/land |
| `src/components/SymbolPlaceholder.svelte` | Временный вид B / M |
| `src/components/Board.svelte`, `BoardBase.svelte`, `BoardContainer.svelte`, `BoardFrame.svelte` | Сетка, маска, рамка, glow FS |
| `src/components/PaylineOverlay.svelte` | Как рисуются линии выигрыша |
| `src/components/Anticipation.svelte` | `anticipation_intro` → `loop` → `out` |
| `src/components/Win.svelte`, `WinAnimation.svelte`, `WinCoins.svelte` | Big win + монеты |
| `src/components/FreeSpinIntro.svelte`, `FreeSpinOutro.svelte`, `FreeSpinAnimation.svelte`, `FreeSpinCounter.svelte` | FS flow |
| `src/components/Background.svelte` | `idle` + `dust` на foreground spine |
| `src/components/TransitionAnimation.svelte` | Полноэкранный transition |
| `src/components/ProgressLadder.svelte` | HTML-meter: 4 B = tier, +3 FS, mystery reel |
| `src/components/MysteryReelUnlockOverlay.svelte` | Overlay sticky reel |
| `src/components/BuyBonusOverlay.svelte`, `BuyBonusConfirmOverlay.svelte` | Buy Normal / Super |
| `src/components/FeaturesAutoSpinOverlay.svelte`, `CashStacksFeatureToggles.svelte` | Bonus Boost, Special Spins |
| `src/components/UiCashStacksLayout.svelte` | Desktop layout, позиции UI |
| `src/components/LoadingScreen.svelte` | `title_screen` на loader spine |

#### D. События игры (тайминг анимаций)

| Путь | Что извлечь |
|------|-------------|
| `src/game/bookEventHandlerMap.ts` | Какие book-events запускают какие визуалы |
| `src/game/typesBookEvent.ts` | Типы: `bonusCollect`, `ladderTierUp`, `mysteryReelActivate`, `mysteryReveal` |
| `src/stories/data/base_events.ts`, `bonus_events.ts` | Примеры одиночных событий для Storybook |
| `src/stories/ModeBaseBookEvent.stories.svelte` | Сценарии демо для скриншотов |

#### E. Тексты / i18n

| Путь | Что извлечь |
|------|-------------|
| `src/i18n/messagesMap/ru.ts`, `en.ts` | Названия фич, Buy Bonus, ladder, mystery reel |
| `src/i18n/i18nDerived.ts` | UI-строки для меню |

#### F. Документация и статус

| Путь | Зачем |
|------|--------|
| `apps/daloniil_test/README.md` | Обзор (с пометкой устаревших 5×6 / 50 lines) |
| `apps/daloniil_test/UNIMPLEMENTED.md` | Что ещё placeholder / не mobile |

---

### 3.3. Math-sdk (логика символов и механики)

| Путь | Что извлечь |
|------|-------------|
| `third_party/math-sdk/games/0_0_daloniil_test/game_config.py` | Paytable, paylines, символы W/B/M, FS rules |
| `third_party/math-sdk/games/0_0_daloniil_test/game_events.py` | Какие события эмитятся в books |
| `third_party/math-sdk/games/0_0_daloniil_test/gamestate.py`, `game_override.py` | Mystery reels, ladder, super bonus |
| `third_party/math-sdk/games/0_0_daloniil_test/DEMO_ISSUES.md` | Известные баги демо (для дизайнера — «что может выглядеть странно») |
| `third_party/math-sdk/games/0_0_daloniil_test/library/configs/event_config_*.json` | Схема book-events по режимам |
| `third_party/math-sdk/games/0_0_daloniil_test/readme.txt` | Краткая math-спека (если есть) |

---

### 3.4. Shared SDK (опционально, если нужны общие UI-паттерны)

| Путь | Зачем |
|------|--------|
| `third_party/web-sdk/packages/components-ui-html/` | Стандартные модалки autoplay (если сравниваем с кастомным overlay) |
| `third_party/web-sdk/packages/components-pixi/` | Базовые Board/Reel примитивы |
| `third_party/web-sdk/packages/pixi-svelte/` | SpineProvider API |

*Включать в handoff только если дизайнеру нужен контекст «стандарт Stake SDK vs кастом Cash Stacks».*

---

## 4. Какие файлы копировать в `designer-handoff/examples/`

Минимальный набор (репрезентативные, не дублировать весь `static/`):

### Символы
- `static/assets/spines/symbols/symbols.atlas` + `symbols.webp`
- `static/assets/spines/symbols/{h1,h2,h3,h4,l1,l2,l3,l4}.json` — все 8
- `static/assets/spines/symbols3/symbols3.atlas` + `W.json` + `explosion.json`
- `static/assets/sprites/symbolsStatic/symbolsStatic.json` + `.webp` / `.png` из атласа

### FX / сцена
- `spines/anticipation/*`
- `spines/bigwin/*` (один уровень + таблица остальных в spec)
- `spines/fsIntro/*` (screen + numbers)
- `spines/transition/*`
- `spines/foregroundAnimation/mm_bg.*` (фон + лопата)
- `spines/reelhouse/reelhouse_glow.*`

### UI sprites
- `sprites/reelsFrame/`, `sprites/payFrame/`, `sprites/progressBar/`, `sprites/freeSpins/`

### Placeholder (чтобы дизайнер видел gap)
- Скрин или экспорт из `SymbolPlaceholder.svelte` / Storybook `ComponentsSymbol.stories.svelte`

---

## 5. Этапы выполнения

| # | Этап | Результат |
|---|------|-----------|
| **0** | Утвердить этот план | `DESIGNER_DOCS_PLAN.md` ✅ |
| **1** | Сверить сетку / paylines / символы в config.ts ↔ game_config.py | Таблица «истина» в начале `GAME_DESIGN_SPEC.md` |
| **2** | Пройти §3.2.A–B: размеры, SYMBOL_INFO_MAP, assets.ts, atlas-маппинг | Разделы «Сетка», «Символы», «Размеры» |
| **3** | Пройти §3.2.C–D: компоненты + book-events | Раздел «Анимации и сценарии» |
| **4** | Пройти §3.3: math-механики (FS, ladder, mystery) | Раздел «Геймплей для визуала» |
| **5** | Создать `designer-handoff/` + скопировать §4 | Папка `examples/` |
| **6** | Написать `GAME_DESIGN_SPEC.md` | Главный документ |
| **7** | Storybook: скриншоты ключевых stories → `references/` | Визуальные референсы (опционально) |
| **8** | Ревью: список «нарисовать Wild West» vs «оставить/адаптировать сток» | Чеклист для арт-дирекшена |

---

## 6. Структура будущего `GAME_DESIGN_SPEC.md` (оглавление)

1. **Обзор игры** — Cash Stacks, тема, статус ассетов  
2. **Сетка и координаты** — 5×5, padding, SYMBOL_SIZE, board/frame offsets  
3. **Символы (таблица)** — код, роль, pay, визуал сейчас, файлы, анимации, sizeRatios  
4. **Спецсимволы** — W / B / M (поведение + что заменить)  
5. **Анимации по состояниям** — static / spin / land / win / postWinStatic / explosion  
6. **Сценарные анимации** — anticipation, big win, FS intro/outro, transition, background  
7. **UI-компоненты** — ladder, buy bonus, overlays, шрифты  
8. **Звук** — ключевые SFX (кратко)  
9. **Что нарисовать (Wild West)** — приоритеты P0/P1  
10. **Приложения** — paylines схема, ссылки на examples/, Storybook URL  

---

## 7. Инструменты для автоматизации (этап 2+)

- Скрипт извлечения имён анимаций из Spine JSON 4.x (`"animations": { "key": ... }`).
- Таблица размеров из `symbolsStatic.json` (`sourceSize`, `trimmed`).
- Список attachment-ов из `*.atlas` по символу.

---

## 8. Критерии готовности

- [ ] Папка `designer-handoff/examples/` содержит все символы + W + explosion + 1 пример UI/FX  
- [ ] `GAME_DESIGN_SPEC.md` описывает **все 11** типов символов (H1–4, L1–4, W, B, M)  
- [ ] Для каждого spine-символа указаны имена анимаций и когда они играют в коде  
- [ ] Явно отмечены placeholder (B, M, лого, buy bonus icons)  
- [ ] Размеры ячейки и борда в px с указанием `sizeRatios` / scale spine (=2 в assets.ts)  
- [ ] Дизайнер может открыть examples без клонирования всего web-sdk  

---

## 9. Следующий шаг

После утверждения плана → **этап 1–6**: создать `designer-handoff/` и заполнить `GAME_DESIGN_SPEC.md` по маршруту §3.
