# Cash Stacks (`daloniil_test`) — что ещё не реализовано

> Сводка по состоянию проекта на основе кода фронтенда (`apps/daloniil_test`), math (`math-sdk/games/0_0_daloniil_test`) и актуальной спецификации.
>
> **Актуальная спецификация слота:** **5 reels × 5 rows**, **30 paylines** (rows 0..4). UI, client `config.ts` и math `game_config.py` на это выровнены.
>
> Устаревшие документы (`README.md`, `PLAN_CASH_STACKS.md` v3) всё ещё упоминают 5×6 / 50 линий — это **не целевое состояние**, а долг по синхронизации текстов.

---

## Краткая сводка

| Область                                                         | Статус                                     |
| --------------------------------------------------------------- | ------------------------------------------ |
| Сетка 5×5, 30 paylines (UI + config + math)                     | ✅ Согласовано                             |
| Базовый UI, борд, paylines, FS intro/outro, win-анимации        | ✅ Работает                                |
| Cash Stacks book-events (bonusCollect, ladderTierUp, mystery\*) | ✅ Эмитятся math + обрабатываются UI       |
| Buy Bonus → RGS bet-mode                                        | ✅ Реализовано (`BuyBonusConfirmOverlay`)  |
| Bonus Boost / Special Spins → RGS                               | ✅ Реализовано (sync в `FeaturesAutoSpinOverlay.toggleFeature`) |
| Mystery Reel — реальная подмена символов                        | ✅ Реализовано (math + клиент)             |
| Стартовые Mystery reels при натуральном FS-триггере             | ✅ Реализовано (`init_natural_fs_mystery_reels`) |
| Super Bonus: согласование ×3 mystery reels                      | ✅ UI/math выровнено на ×3                 |
| Дублирующий `ModalBuyBonus` в `CashStacksModals`                | ✅ Удалён                                  |
| Wild West ассеты                                                | ❌ Плейсхолдеры                            |
| RTP tuning всех 5 bet-modes                                     | ❌ Optimizer не прогнан                    |
| Mobile UI parity                                                | ❌ Только desktop кастомный                |

---

## 1. Механики — незавершённые / расхождения

### 1.1. Стартовые Mystery Reels при натуральном триггере FS

**По дизайну Cash Stacks:**

| Bonus на борде | Старт FS | Mystery reels на старте |
| -------------- | -------- | ----------------------- |
| 3× B           | 10 FS    | 0                       |
| 4× B           | 10 FS    | 1                       |
| 5× B           | 10 FS    | 2                       |

**Фактически:** при обычном триггере FS из base game стартовые mystery reels **не назначаются**. Mystery reels появляются только через:

- Progress Ladder (каждые 4 B во FS);
- Super Bonus buy (`init_super_bonus_mystery_reels`).

**Файлы:** `gamestate.py`, `game_override.py`.

---

### 1.2. Super Bonus — количество стартовых Mystery Reels

| Источник                                  | Значение                    |
| ----------------------------------------- | --------------------------- |
| UI / i18n / `BuyBonusOverlay`             | **×4** Sticky Mystery Reels |
| Math `super_bonus_starting_mystery_reels` | **3**                       |
| README (устар.)                           | ×4 (Tier 4 effect)          |

**Файлы:** `game_config.py` L145, `ru.ts` L10, `BuyBonusOverlay.svelte` L5.

**Что нужно:** согласовать и выровнять UI, math и тексты.

---

## 2. Фронтенд — незавершённые фичи

### 2.1. Bonus Boost / Special Spins → RGS

**Задумано:** при включённом тумблере в Autoplay спин уходит в RGS с bet-mode `bonus_boost` (×2) или `special_spins` (×30) вместо `base`.

**Фактически:**

- Тумблеры работают и пишут в `stateGame.activeFeature` (`FeaturesAutoSpinOverlay.svelte`).
- `activeFeature` **никогда не устанавливает** `stateBet.activeBetModeKey` перед `bet` / `autoBet`.
- Все спины идут как `BASE`, независимо от выбранной функции.

**Файлы:** `FeaturesAutoSpinOverlay.svelte`, `CashStacksStartAutoplayButton.svelte`, `stateGame.svelte.ts`.

**Что нужно:**

```ts
// Перед bet/autoBet:
if (stateGame.activeFeature === 'bonus_boost') stateBet.activeBetModeKey = 'bonus_boost';
else if (stateGame.activeFeature === 'special_spins') stateBet.activeBetModeKey = 'special_spins';
else stateBet.activeBetModeKey = 'BASE';
```

---

### 2.2. Mystery Reveal — подмена символов на клиенте

**Задумано:** sticky reel показывает один и тот же реальный символ (spine) на всех **5** видимых ячейках колонки; при `mysteryReveal` — анимация раскрытия M → H1/L2/…

**Фактически:**

- `mysteryReveal` handler только вызывает `animateSymbols` на позициях, **игнорирует `revealedSymbol`**.
- Ячейки остаются с placeholder `M` (фиолетовый rect + «?»).
- `MysteryReelOverlay` рисует рамку + «?», а не раскрытый символ.

**Файлы:** `bookEventHandlerMap.ts`, `MysteryReelOverlay.svelte`, `constants.ts`.

---

### 2.3. Progress Ladder — неполная реализация

**Работает:**

- Обновление `bonusCollected` / `ladderTier` из book-events.
- CSS progress bar + pulse на tier-up.
- Видимость во FS.

**Не реализовано:**

| Пункт                                                   | Статус                             |
| ------------------------------------------------------- | ---------------------------------- |
| Stock `progressBar` spritesheet как основа              | ❌ CSS bar                         |
| Bonus-dot индикаторы (`AssetPlaceholder` B)             | ❌                                 |
| Анимация transition / winMeterExplosion на tier-up      | ❌                                 |
| `ladderShow` / `ladderHide` emitter handlers            | ❌ Пустые stubs                    |
| `ladderTierUp` → обновление FS counter из `rewardSpins` | ❌ Ждёт отдельный `updateFreeSpin` |
| i18n для `TIER`, `+3 SPINS @`                           | ❌ Hardcoded English               |

**Файлы:** `ProgressLadder.svelte`, `bookEventHandlerMap.ts`.

---

### 2.4. Autoplay — интеграция в SDK ModalAutoSpin

**Изначальный план:** блок «Функции» inline внутри стандартного `ModalAutoSpin`.

**Фактически:** полностью кастомный `FeaturesAutoSpinOverlay`, SDK `ModalAutoSpin` заменён (`CashStacksModals.svelte`).

**Отличия:**

- Нет кнопок confirm/cancel внизу панели — старт через центральную Spin-кнопку.
- Loss-limit / single-win-limit из SDK modal не экспонированы в кастомном overlay (значения выставляются в `startAutoplay`).

**Файлы:** `FeaturesAutoSpinOverlay.svelte`, `CashStacksModals.svelte`.

---

### 2.5. Buy Bonus — дублирование UI

**Фактически:** одновременно монтируются:

- SDK `ModalBuyBonus` (`CashStacksModals.svelte`);
- Кастомный `BuyBonusOverlay` (`Game.svelte`).

Оба открываются на `modal.name === 'buyBonus'`. Кастомный overlay перекрывает SDK (zIndex 60), но SDK modal остаётся в DOM.

**Что нужно:** убрать `ModalBuyBonus` из `CashStacksModals` или скрыть SDK-версию.

**Примечание:** dispatch bet-mode **работает** через `BuyBonusConfirmOverlay` (README §149 про «просто закрывает popup» — устарел).

---

### 2.6. Buy Bonus — недостающие элементы UI

| Элемент                                                                   | Статус                                      |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| Бейджи волатильности (ЭКСТРЕМАЛЬНАЯ / ОЧЕНЬ ВЫСОКАЯ)                      | ❌                                          |
| `betModeMeta` иконки из RGS auth                                          | ❌ Пустые строки-заглушки                   |
| Отдельные компоненты `BonusCardDaloniilTest`, `ModalBuyBonusDaloniilTest` | ❌ Упрощённая структура в `BuyBonusOverlay` |

**Файлы:** `BuyBonusOverlay.svelte`, `stateGame.svelte.ts`.

---

### 2.7. UI Layout — только desktop кастомный

**Фактически:**

- **Desktop** — полностью кастомный `UiCashStacksLayout`.
- **Portrait / landscape / tablet** — стандартные SDK layouts без кастомных компонентов.

**Проблемы mobile:**

- `ButtonAutoSpin` в snippet'ах, но **не импортирован**.
- SDK binary `ButtonTurbo` вместо 3-level `CashStacksTurboButton`.
- `CashStacksMenuOverlay`, `FeaturesAutoSpinOverlay` не интегрированы.

**Файлы:** `UiCashStacksLayout.svelte`.

---

### 2.8. Game Speed / Turbo — 3 уровня

- UI показывает 3 уровня.
- Уровни 2 и 3 **идентичны** — оба ставят `stateBet.isTurbo = true`.
- Отдельный `timeScale` gradient не реализован.

**Файлы:** `stateGame.svelte.ts`, `CashStacksTurboButton.svelte`.

---

### 2.9. i18n — неполный перевод

| Место                          | Проблема                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| `CashStacksMenuOverlay.svelte` | `ИНФОРМАЦИЯ`, `ВКЛ`, `ВЫКЛ` — без i18n                             |
| `ProgressLadder.svelte`        | `TIER`, `+3 SPINS @` — без i18n                                    |
| `i18nDerived.ts`               | `bonusBoostDesc`, `specialSpinsDesc`, `rtpLabel` — не используются |
| `BuyBonusConfirmOverlay`       | `BUY_CANCEL` = «ОТМЕНА», кнопка — «‹ НАЗАД»                        |

---

### 2.10. Запланированные компоненты — не созданы

| Планировался (старый PLAN)         | Фактически                       |
| ---------------------------------- | -------------------------------- |
| `SymbolBonus.svelte`               | `SymbolPlaceholder`              |
| `SymbolMystery.svelte`             | `SymbolPlaceholder`              |
| `BonusCardDaloniilTest.svelte`     | `BuyBonusOverlay.svelte`         |
| `ModalAutoSpinDaloniilTest.svelte` | `FeaturesAutoSpinOverlay.svelte` |
| `stateFreeSpins.svelte.ts`         | `stateGame.svelte.ts`            |

---

### 2.11. Storybook fixtures — упрощённый набор

- `base_events.ts` / `bonus_events.ts` — ручные single-event фикстуры.
- `*_books.ts` — auto-gen из math-sdk.
- Не все edge-case сценарии (trigger x3/x4/x5, wincap, bonus_boost spin) вынесены в отдельные stories.

---

### 2.12. Stub handlers

| Handler                                    | Проблема                   |
| ------------------------------------------ | -------------------------- |
| `finalWin`                                 | Пустой                     |
| `ladderShow` / `ladderHide`                | No-op                      |
| `ladderTierUp` mystery hint                | Только комментарий         |
| `createBonusSnapshot` → `updateGlobalMult` | Артефакт донора `lines`    |
| `paddingReels` в `config.ts`               | Помечены «mock for Этап 1» |

---

### 2.13. DevCheats — минимальный набор

**Есть:** `Shift+E` → ×100 animation speed.

**Нет:** читы для FS, bonus modes, ladder tier, mystery reveal.

**Файл:** `DevCheats.svelte`.

---

## 3. Math — незавершённые части

### 3.1. Mystery Reel symbol substitution

- `emit_mystery_reveal()` только эмитит book-event, **не меняет board**.
- `apply_mystery_reels()` **не реализован**.
- Line evaluation идёт по реальной доске из reelstrip.

**Файлы:** `game_override.py`, `gamestate.py`, `readme.txt`.

---

### 3.2. `enforce_bonus_per_reel` на генерации доски

Ограничение «макс. 1 B на reel» применяется при **сборе**, но не при draw.

**Файлы:** `game_override.py`, `gamestate.py`.

---

### 3.3. RTP tuning

- `run_optimization: False` в `run.py`.
- Reelstrips — mock-ratios, optimizer не прогнан.
- Non-base modes далеки от целевого RTP 96.01%.

**Файлы:** `run.py`, `game_optimization.py`, `readme.txt`.

---

### 3.4. Scatter-retrigger дублирование

В `game_config.py` остаётся SDK scatter-retrigger для FS, хотя доп. спины идут через Progress Ladder.

**Файл:** `game_config.py`.

---

## 4. Ассеты — плейсхолдеры вместо Wild West

| Ассет                  | Текущая реализация                  |
| ---------------------- | ----------------------------------- |
| Символ `B` (Bonus)     | Оранжевый rect + «B»                |
| Символ `M` (Mystery)   | Фиолетовый rect + «?»               |
| Buy Bonus иконки       | `AssetPlaceholder`                  |
| Лого CASH STACKS       | Pixi gold text                      |
| Sticky Mystery overlay | Фиолетовая рамка + ?                |
| Тема Wild West         | Money Mining stock spines для L/H/W |

---

## 5. RGS / Production gaps

| Пункт                                      | Статус               |
| ------------------------------------------ | -------------------- |
| SDK actor/RGS path                         | ✅                   |
| `ResumeBet` восстанавливает bet-mode       | ✅                   |
| `betModeMeta` до RGS auth                  | ❌ Пустые asset keys |
| `bonus_boost` / `special_spins` в запросах | ❌                   |
| Сетка client ↔ math (5×5, 30 линий)       | ✅                   |
| Дублирующий `ModalBuyBonus`                | ⚠️                   |

---

---

## 7. Приоритеты

### P0 — блокеры для корректной игры

1. Подключить `activeFeature` → `activeBetModeKey` для Bonus Boost / Special Spins.
2. Реализовать mystery symbol substitution (math board + client visual).
3. Натуральный FS trigger → стартовые mystery reels (0/1/2 по количеству B).
4. Согласовать Super Bonus: 3 или 4 mystery reels (UI ↔ math).

### P1 — production polish

5. Прогнать RTP optimizer для всех 5 bet-modes.
6. Убрать дублирующий SDK `ModalBuyBonus`.
7. Mobile layout parity + fix `ButtonAutoSpin` import.
8. Завершить Progress Ladder (spritesheet, анимации, i18n).
9. `enforce_bonus_per_reel` на draw.

### P2 — контент и UX

11. Wild West ассеты вместо плейсхолдеров.
12. Полный i18n.
13. 3-level turbo timeScale gradient.
14. Расширенные DevCheats.
15. Расширить Storybook fixtures.

---

## Ссылки

- Актуальный код: `src/game/constants.ts`, `src/game/config.ts`, `math-sdk/.../game_config.py`
- README (устар. по сетке): [`README.md`](./README.md)
- Старый план (5×6): [`PLAN_CASH_STACKS.md`](../../../../PLAN_CASH_STACKS.md)
- Math readme: [`third_party/math-sdk/games/0_0_daloniil_test/readme.txt`](../../../math-sdk/games/0_0_daloniil_test/readme.txt)
