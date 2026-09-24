# Cat Mafia — план: per-line × штор + phase-2 gate (Super / Normal / Duel)

Дата: 2026-09-23 (код: 2026-09-24)  
Scope: `third_party/math-sdk/games/0_0_cat_mafia` + web sticky display + Dev QA.  
Статус: **реализовано в коде** (нужен M5/resample при приёмке RTP).

Связано: `CatMafia_Modes.md`.

---

## 0. Контракт (продукт)

### 0.1 Множители штор — только hit по линии

- **Открытая sticky-штора** = wild-колонка + свой ×.
- **Лежачий SW** = обычный wild, **без ×**.
- Выплата линии: `raw × (× только sticky-reel из positions)`.
- Глобальный product на весь спин — **запрещён**.

### 0.2 Phase-2 после новой шторы

- ≥1 линия через reel новой шторы → phase-2 (все линии, × per-line).
- Иначе → expand + sticky, **без** phase-2 `winInfo`.

### 0.3 Эталонный скрин

Phase-1 `0.1×4 + 0.1×4 = 0.8` → expand col5 → нет phase-2 → итог **0.8**.

---

## 1. Что сделано в коде

| Место | Изменение |
|-------|-----------|
| `game_features.py` | `sticky_mult_for_positions`, `apply_sticky_mults_to_wins`, `wins_hit_any_reel` |
| `game_override.py` | evaluate + duel phase-1 apply per-line; `_emit_sw_reeval_wins` / duel gate + per-line; sticky-only rescale no-op |
| `bookEventHandlerMap.ts` | не масштабировать UI глобальным `stickyProduct` |
| `smoke_sw_two_beat_additive.py` | helpers, screenshot no-p2, hit R5, live/base |
| `DevButtons.svelte` | **Per-line · no hit R5** / **Per-line · hit R5** → `evalDevMathBoard` |

### Dev A / B (проверено `eval_dev_board`)

- **A:** `winInfo` ×1, expand, нет 2-го `winInfo`, payout **80** (0.8×).
- **B:** phase-2 есть; линия через обе шторы `stickyMult=16`, линия только через первую `stickyMult=4`.

---

## 2. После мержа

- [ ] M5 / resample / acceptance (RTP снизится на 2-шторных no-hit).
- [ ] Вручную Dev A/B в браузере.
