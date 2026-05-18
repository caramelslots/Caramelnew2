# Cash Stacks (`daloniil_test`)

Stake Engine slot app — Wild-West тематика, 5×6 grid, 50 paylines.

> **Статус**: Этап 1 (UI) + Этап 2 (math) завершены; Storybook фикстуры подключены к реальным `books_*.json` из math-sdk.

---

## Запуск

```bash
# из корня web-sdk
pnpm install
pnpm --filter daloniil_test dev          # → http://localhost:3007
pnpm --filter daloniil_test storybook    # → http://localhost:6007
```

---

## Спецификация

| Параметр       | Значение                                              |
| -------------- | ----------------------------------------------------- |
| Provider       | `sample_provider`                                     |
| Game ID        | `0_0_daloniil_test`                                   |
| Grid           | 5 reels × 6 rows                                      |
| Paylines       | 50                                                    |
| RTP            | 96.01%                                                |
| Max Win        | ×50 000                                               |
| Bet modes      | `base`, `bonus_boost` (×2), `special_spins` (×30), `bonus_normal` (buy ×100), `bonus_super` (buy ×200) |
| Symbols (Hi)   | H1 (×100/×10/×2), H2 (×50/×5/×1.2), H3 (×30/×3/×0.8), H4 (×20/×2/×0.5) |
| Symbols (Low)  | L1–L4 (×1/×0.2/×0.1)                                  |
| Wild           | W (×150 for 5)                                        |
| Bonus          | B (триггер FS, collectible в FS)                      |
| Mystery        | M (sticky reel в FS, раскрывается в один символ)      |

### Free Spins / Progress Ladder

- 3+ `B` в base → 10 FS (8/12 FS если в Bonus Boost)
- В FS: каждые **4** собранных `B` = новый **tier**, +3 FS, +1 Sticky Mystery Reel
- Super Bonus = старт с **×4 Sticky Mystery Reels** (Tier 4 effect)

---

## Архитектура (Этап 1)

```
src/
├── components/
│   ├── Game.svelte                       — точка входа
│   ├── Board.svelte                      — 5×6 reels (адаптировано из lines)
│   ├── PaylineOverlay.svelte             — рендер активных paylines (PIXI Graphics)
│   ├── MysteryReelOverlay.svelte         — подсветка sticky-барабанов (PIXI)
│   ├── SymbolPlaceholder.svelte          — PIXI placeholder для B и M символов
│   ├── AssetPlaceholder.svelte           — HTML placeholder (для UI/меню/лого)
│   ├── FeaturesAutoSpinOverlay.svelte    — Bonus Boost / Special Spins тумблеры в Autoplay
│   ├── BuyBonusOverlay.svelte            — кастомное меню «Купить функцию» (NORMAL/SUPER)
│   └── ProgressLadder.svelte             — HTML overlay прогресс-лестницы во FS
├── game/
│   ├── config.ts                         — 50 paylines, 5 bet-modes, paytable
│   ├── constants.ts                      — INITIAL_BOARD (5×6), SYMBOL_INFO_MAP
│   ├── stateGame.svelte.ts               — + bonusCollected, ladderTier, mysteryReels, activeFeature
│   ├── typesBookEvent.ts                 — + bonusCollect, ladderTierUp, mysteryReelActivate, mysteryReveal
│   ├── typesEmitterEvent.ts              — + EmitterEventPaylineOverlay, MysteryReel, ProgressLadder
│   └── bookEventHandlerMap.ts            — handlers для Cash Stacks-событий
├── i18n/
│   ├── messagesMap/
│   │   ├── en.ts                         — английский словарь
│   │   └── ru.ts                         — русский словарь (приоритетный язык)
│   └── i18nDerived.ts                    — алиасы (gameTitle, normalBonus, …)
└── stories/data/
    ├── base_events.ts                    — single-event фикстуры (manual)
    ├── bonus_events.ts                   — single-event FS-фикстуры (manual)
    ├── base_books.ts                     — 100 books mode=base       (auto-gen)
    ├── bonus_books.ts                    — 30 books mode=bonus_normal (auto-gen)
    ├── books_bonus_boost.ts              — 60 books mode=bonus_boost  (auto-gen)
    ├── books_special_spins.ts            — 30 books mode=special_spins (auto-gen)
    └── books_bonus_super.ts              — 30 books mode=bonus_super  (auto-gen)
```

`*_books.ts` файлы сгенерированы из реального math-sdk вывода. Перегенерация:

```bash
cd third_party/math-sdk/games/0_0_daloniil_test
python3 run_storybook.py     # → library/books/books_*.json
python3 sync_to_web_sdk.py   # → apps/daloniil_test/src/stories/data/*.ts
```

---

## Mock book-events (Этап 1)

```
reveal              ← board paint
winInfo             ← paylineShow → animateSymbols → paylineHide
freeSpinTrigger     ← reset Cash Stacks state, animate B positions, FS intro
updateFreeSpin      ← counter
bonusCollect ★      ← +collected, animate B positions
ladderTierUp ★      ← +1 tier, +3 spins, pulse on ladder
mysteryReelActivate ★ ← + reels to stateGame.mysteryReels, highlight
mysteryReveal ★     ← animate reveal of M cells to revealed symbol
setWin / setTotalWin / finalWin / freeSpinEnd
```

★ = новые Cash Stacks события (Этап 2 math должен их сгенерировать).

---

## Ассеты: что используется и что нужно нарисовать

### Используются **стоковые** ассеты SDK (Money Mining theme)

Из `static/assets/`:
- `spines/symbols/h1.json … h4.json` — высокие символы (через `SYMBOL_INFO_MAP`)
- `spines/symbols/l1.json … l4.json` — низкие символы
- `spines/symbols3/W.json` — Wild (динамит)
- `spines/symbols3/explosion.json` — win explosion
- `spines/anticipation/`, `spines/bigwin/`, `spines/fsIntro/`, `spines/transition/`
- `spines/reelhouse/`, `spines/foregroundAnimation/`, `spines/foregroundFeatureAnimation/`
- `sprites/reelsFrame/`, `sprites/payFrame/`, `sprites/progressBar/`, `sprites/freeSpins/`
- `sprites/coin/`, `sprites/winSmall/`, `sprites/symbolsStatic/`
- `fonts/goldFont/`, `fonts/silverFont/`, `fonts/purpleFont/`, `fonts/goldBlur/`
- `audio/sounds.json`

### Используются **placeholder**'ы (нужно нарисовать в Wild-West теме)

| Что                       | Где                                          | Текущая реализация    |
| ------------------------- | -------------------------------------------- | --------------------- |
| Символ `B` (Bonus)        | board cells                                  | оранжевый rect + «B»  |
| Символ `M` (Mystery)      | sticky reels во FS                           | фиолетовый rect + «?» |
| Bonus иконка x3           | NORMAL карточка в Buy Bonus menu             | оранжевый rect        |
| Bonus иконка x4           | SUPER карточка в Buy Bonus menu              | розовый rect          |
| Лого «CASH STACKS»        | верхний правый угол UI                       | золотой текст         |
| Sticky Mystery overlay    | подсветка reel во FS                         | фиолетовая рамка + ?  |

> Когда придут реальные Wild West ассеты — заменить `SymbolPlaceholder`/`AssetPlaceholder`
> на `Sprite`/`Spine` (см. примеры в `SymbolSprite.svelte` / `SymbolSpine.svelte`).

---

## Открытые задачи (после Этапов 1+2)

1. **Wild West ассеты** — нарисовать и подменить плейсхолдеры (см. таблицу выше).

2. **Интеграция Features в реальный ModalAutoSpin** — сейчас overlay; нужно
   inline-вставить в стандартный `ModalAutoSpin` из `components-ui-html`.

3. **Buy Bonus → реальный bet-mode dispatch** — сейчас на BUY просто закрывается popup;
   нужно подать в RGS `bonus_normal` / `bonus_super` bet-mode.

4. **Math RTP-tuning** — текущие reelstrips сгенерированы детерминированно для
   smoke-теста; реальный RTP получится после прогона `optimization_program` (см.
   `third_party/math-sdk/games/0_0_daloniil_test/game_optimization.py`).

5. **Mystery Reel symbol-substitution** — сейчас math эмитит `mysteryReveal` событие,
   но фактически не подменяет символы перед line-eval (визуальный mock). Production:
   добавить substitution в `gamestate.run_freespin` после `apply_mystery_reels`.

---

## Спецификация paylines

См. полный список 50 paylines в [`PLAN_CASH_STACKS.md §2.5`](../../../../PLAN_CASH_STACKS.md).

Каждая линия — массив длины 5 (по одному row-index 0..5 на каждый из 5 reels).
Сгруппированы по визуальным шаблонам: 6 горизонталей, 4 V-shape, 4 ^-shape,
4 диагонали, 8 step-shapes, 5 U-shapes, 5 ⌒-shapes, 4 M-zigzag, 4 W-zigzag,
4 swooshes, 2 waves.
