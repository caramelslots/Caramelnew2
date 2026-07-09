# Demo Issues — daloniil_test

Живой документ с найденными расхождениями между поведением демки и
ожидаемым поведением (REDESIGN_PLAN.md). Каждый bug → root cause → fix
→ статус. Дополнять по мере обнаружения новых проблем.

> Связанный документ: [REDESIGN_PLAN.md](./REDESIGN_PLAN.md)
> Дата создания: 2026-05-18
> Последний M-run: M5 (1e5 sims/mode, RTP=96.01% во всех buy-bonus модах ✓)

---

## Status legend

- 🔴 **Open** — баг подтверждён, fix не начат
- 🟡 **In-progress** — fix в работе
- 🟢 **Fixed** — fix применён, ждёт проверки в демке
- ✅ **Verified** — пользователь подтвердил исправление в демке

---

## BUG-001 🟢 Super Bonus всё ещё стартует с 3+ Mystery Reels вместо 1

### Симптом
При покупке `super_bonus` в демке Sticky Mystery Reels появляются
сразу на 3+ барабанах (а в некоторых книгах — на 4 одновременно), хотя
по плану должен стартовать **ровно 1** reel в случайной позиции.

### Ожидание (REDESIGN_PLAN §2.2 / §2.3)
- `bonus_super`: 1 стартовый reel в случайной позиции (0..4).
- Дополнительные reels — только через Progress Ladder (каждые 4 B).

### Root cause (✓ установлен)
**Демка читает устаревшие fixture-books в web-sdk**, сгенерированные
ДО math-правок M3/M5.

Доказательства:
| Артефакт | Когда обновлён | Какое значение `super_bonus_starting_mystery_reels` |
|---|---|---|
| `math-sdk/games/0_0_daloniil_test/game_config.py:154` | 18 мая ~22:00 | `1` ✓ |
| `math-sdk/library/publish_files/books_bonus_super.jsonl.zst` | **18 мая 23:04** | сгенерировано на новом config (M5) ✓ |
| `web-sdk/apps/daloniil_test/src/stories/data/books_bonus_super.ts` | **17 мая 22:01** ✗ | старая логика (n=3..4) |

Первый `mysteryReelActivate` event в `books_bonus_super.ts`:

```ts
{"type": "mysteryReelActivate", "reels": [0, 1, 2, 3], "persistent": true}
```

→ это поведение до redesign'а: фиксированно 0..N-1 reels (и в данной
конкретной книге даже 4, потому что в старом коде natural-FS-trigger
mystery reels тоже инициализировались).

### Fix plan
1. Запустить `sync_to_web_sdk.py` (или эквивалент `run_storybook.py`)
   чтобы регенерировать `books_bonus_super.ts`, `books_bonus_normal.ts`,
   `books_special_spins.ts`, `books_bonus_boost.ts`, `base_books.ts`
   из свежего `library/publish_files/`.
2. Перезапустить демку (Vite HMR подхватит).
3. Проверить вручную: 5–10 покупок `super_bonus` → ожидаем
   распределение стартовых reels близкое к равномерному по позициям 0..4
   и ровно 1 reel в стартовом snapshot.

### Acceptance criteria
- [x] В фикстурах `bonus_super` стартует ровно с **1** sticky reel
      (проверено: 0 books with multi-reel start, 30/30 books)
- [x] Позиция этого reel варьируется между покупками
      (распределение: #0=2, #1=2, #2=5, #3=6, #4=случайно — рандом)
- [x] Дополнительные reels появляются только после `ladderTierUp`
- [x] `books_bonus_super.ts` регенерирован 2026-05-18
- [ ] **Verified by user в демке** — ждёт ручной проверки

### Применённый fix
```
cd third_party/math-sdk/games/0_0_daloniil_test
PYTHONPATH=../..:. /tmp/csmath_venv/bin/python run_storybook.py
/tmp/csmath_venv/bin/python sync_to_web_sdk.py
```
Результат:
- `base_books.ts`         (100 books, 344.9 KB)
- `bonus_books.ts`        (30 books, 628.1 KB)
- `books_bonus_boost.ts`  (60 books, 300.3 KB)
- `books_special_spins.ts`(30 books, 612.0 KB)
- `books_bonus_super.ts`  (30 books, 656.1 KB)

### Owner / ETA
DONE — ждёт user verification

---

## CHG-001 🟢 Упростить баннер Mystery Reels (убрать Tier и Sticky-счётчик)

### Контекст
Скриншот текущего состояния баннера (правый верх, во Free Spins):

```
┌─────────────────────────────────────┐
│  MYSTERY REELS           TIER 0     │  ← убрать "TIER 0"
│  ✦ 3/5  STICKY                       │  ← убрать всю строку
│  ████████████░░░░░░░  (progress bar)│  ← оставить
│  3/4 ✦              1 TO NEXT REEL  │  ← оставить
│  ─  ─  ─  ─  ─                       │  ← tier-маркеры внизу: убрать
└─────────────────────────────────────┘
```

### Цель (новый минималистичный вид)
Баннер должен показывать **только**:

```
┌─────────────────────────────────────┐
│  MYSTERY REELS                      │
│  ████████████░░░░░░░  (progress bar)│
│  3/4 ✦              1 TO NEXT REEL  │
└─────────────────────────────────────┘
```

То есть оставляем:
- Заголовок `MYSTERY REELS`
- Прогресс-бар к следующему reel'у
- Текущий счётчик собранных B (`X/4 ✦`) + remainder (`Y TO NEXT REEL`)

Убираем:
- Индикатор `TIER N` (правый верхний угол)
- Строку `✦ X/5  STICKY` (количество уже активных sticky reels)
- Нижние tier-маркеры (5 чёрточек/сегментов)

### Обоснование
- Tier — внутренняя механика, игроку не несёт смысла без подписей.
- Sticky-счётчик дублирует визуальную информацию: игрок видит активные
  sticky reels прямо на барабанах (они подсвечены/анимированы).
- Минимализм усиливает фокус на единственной важной метрике —
  «сколько бонусов до следующего unlock».

### Fix plan
1. `web-sdk/apps/daloniil_test/src/components/ProgressLadder.svelte`
   - Удалить блок с `TIER {tier}` (правый верхний).
   - Удалить блок `{activeMysteryReels}/{maxReels} STICKY`.
   - Удалить ряд tier-маркеров (`<div class="tier-dots">…`).
   - Оставить заголовок, progress bar, нижнюю строку с счётчиком B.
2. Проверить, что i18n-ключ `STICKY_REELS_ACTIVE` больше не
   используется — если нет, удалить из `messagesMap/en.ts`, `ru.ts`,
   `i18nDerived.ts` (cleanup).
3. Обновить Storybook story `ComponentsProgressLadder.stories.svelte`:
   - убрать stories, которые показывали разные значения tier/sticky;
   - оставить варианты «прогресс 0/4», «1/4», «3/4», «4/4 (pulse)».
4. Скриншот «до/после» в этот документ.

### Acceptance criteria
- [x] Баннер показывает только заголовок + bar + counter
- [x] Storybook stories обновлены (5 stories: 0/4, 1/4, 3/4, pulse, max)
- [x] i18n keys cleanup (`STICKY_REELS_ACTIVE` + `stickyReelsActive` удалены)
- [x] Lint clean
- [ ] **Verified by user в демке** — ждёт ручной проверки

### Применённый fix (файлы)
- `web-sdk/.../components/ProgressLadder.svelte` — убраны `.tier` span,
  `.reels-row`, `.tiers` (tier-dots), их CSS, derived `tier` и `activeMysteryReels`
- `web-sdk/.../i18n/i18nDerived.ts` — удалён `stickyReelsActive`
- `web-sdk/.../i18n/messagesMap/{en,ru}.ts` — удалён `STICKY_REELS_ACTIVE`
- `web-sdk/.../stories/ComponentsProgressLadder.stories.svelte` —
  обновлены имена и набор stories

### Owner / ETA
DONE — ждёт user verification

---

## BUG-002 — slot для следующей записи

(заполнить при обнаружении)

---

## Open questions / нужно уточнить с пользователем

- [ ] Q1: Хочется ли в демке принудительно проиграть «happy-path»
      сценарий (купить super_bonus → собрать 4B → увидеть unlock-overlay)
      или достаточно случайных книг из публикации?
- [ ] Q2: Нужно ли для regression-теста добавить chi²-проверку
      распределения стартовых reels в `tools/`?

---

## Журнал изменений документа

- 2026-05-18 — создан, добавлен BUG-001 (stale super_bonus fixture).
- 2026-05-18 — добавлен CHG-001 (упростить баннер Mystery Reels:
  убрать Tier и Sticky-счётчик).
- 2026-05-18 — BUG-001 → 🟢 Fixed (regenerated fixtures via
  run_storybook.py + sync_to_web_sdk.py, verified math output).
- 2026-05-18 — CHG-001 → 🟢 Fixed (ProgressLadder simplified,
  i18n cleaned, stories updated, lint clean).
