# Cash Stacks (`0_0_daloniil_test`)

5×5 lines-pay slot, 20 paylines, RTP 96.01%, max win ×2,500.

Donor: `0_0_lines`. Cash Stacks adds:
  - 5×5 board (5 rows)
  - 30 paylines (rows 0..4, см. `game_config.paylines`)
  - Bonus symbol `B` — scatter-like trigger в base, collectible в FS (Progress Ladder)
  - Mystery symbol `M` — Sticky Mystery Reels во FS, раскрываются в один обычный символ
  - Progress Ladder — каждые 4 собранных `B` в FS = новый tier (+3 spins, +1 mystery reel)
  - 5 bet modes:
      base                ×1     (RTP 0.9601)
      bonus_boost         ×2     (RTP 0.9601, агрессивнее основной reelstrip)
      special_spins       ×30    (RTP 0.9601, гарантированный FS trigger)
      bonus_normal (buy)  ×100   (10 FS, гарантированный bonus trigger)
      bonus_super (buy)   ×200   (10 FS, старт с ×3 sticky Mystery Reels)

Natural FS trigger из base также даёт стартовые Mystery Reels:
      3× B → 10 FS, 0 starting MR
      4× B → 10 FS, 1 starting MR
      5× B → 10 FS, 2 starting MR

## Symbol pool

```
W      Wild      — wild + multiplier (×2..×50 в FS, см. padding_symbol_values)
H1-H4  High      — H1=top, H4=lowest premium
L1-L4  Low       — все равноценные (1.0 / 0.2 / 0.1 для 5/4/3-of-a-kind)
B      Bonus     — scatter, collectible, max 1 per reel (enforce на draw + collect)
M      Mystery   — appears only via Sticky Mystery Reel mechanic, не в reelstrip напрямую
```

Mystery reveal — **weighted random** pool (см. MATH_BLOCKERS.md M3/M10):

```python
mystery_reveal_pool_weights = {
    "W":  1,   # ~2.4% — rare, top-tier (×150 line, +multiplier ×2..×50 в FS)
    "H1": 3,   # ~7%   — premium
    "H2": 4,   # ~10%
    "H3": 5,   # ~12%
    "H4": 5,   # ~12%
    "L1": 6,   # ~14%  — low (frequent)
    "L2": 6,   # ~14%
    "L3": 6,   # ~14%
    "L4": 6,   # ~14%
}
```

Когда mystery reel раскрывается в W, **все 5 cells reel-а становятся Wild**.
Каждый W получает независимый multiplier из `mult_values[freegame_type]`
(×2..×50). В bonus_super с 3 mystery reels P(≥1 reveals=W) ≈ 7%.

B исключён из пула — Mystery не должен «дублировать» bonus collection.

## Wincap path

Max win ×2,500 формально достижим и в base (5×W = 225×20 = 4,500 max за спин),
и в FS (за счёт Wild multiplier ×2..×50). В `wincap_condition`:

```python
"force_freegame": True,   # distribution-quota: wincap-сэмплы через FS path
"force_wincap": True,
```

Это design choice для distribution sampling — quota гонит wincap-сэмплы
через FS, чтобы покрыть длинный tail событий с накопленными мультипликаторами.
В production wincap может выпадать и в base, и в FS — реальное распределение
определится после rerun-а optimization-а. См. MATH_BLOCKERS.md M6.

## New book events

- `bonusCollect`         — игрок собрал N Bonus символов в текущем FS
- `ladderTierUp`         — достигнут новый уровень Progress Ladder
- `mysteryReelActivate`  — активирован новый Sticky Mystery Reel
- `mysteryReveal`        — Mystery символы раскрылись в обычный символ

## FS retrigger policy

В Cash Stacks **единственный** источник дополнительных FS spins — Progress Ladder
(`+3 spins per tier`, до 5 tier-ов). SDK-стандартный scatter-retrigger
**не используется** — мы не вызываем `update_fs_retrigger_amt` в `run_freespin`,
и SDK сам этот метод никогда не вызывает.

`freespin_triggers[freegame_type]` в config оставлен пустым `{}` чтобы избежать
визуальной двусмысленности. См. MATH_BLOCKERS.md M7.

## Layout

```
game_config.py        — config (paytable, paylines, bet-modes, reelstrips, distribution)
gamestate.py          — run_spin / run_freespin loop
game_override.py      — Cash Stacks-specific hooks:
                          - reset_book (bonus_collected, ladder_tier, mystery_reels)
                          - apply_mystery_reels (M overlay на sticky reels)
                          - emit_mystery_reveal (M → revealed symbol, реальный substitution)
                          - collect_bonus_symbols (enforce 1 B per reel)
                          - check_ladder_tier_up (+spins, +1 mystery reel per tier)
                          - init_super_bonus_mystery_reels (3 reels со старта)
                          - init_natural_fs_mystery_reels (0/1/2 при 3/4/5 B)
game_executables.py   — evaluate_lines_board (использует Lines из SDK)
game_calculations.py  — passthrough к SDK
game_events.py        — Cash Stacks events (bonusCollect, ladderTierUp, ...)
game_optimization.py  — optimizer params для 5 bet-modes
run.py                — entry point
sync_to_web_sdk.py    — копирует library/books/*.json → web-sdk stories
reels/
  BR0.csv             — basegame default (для base, bonus_normal)
  BR1.csv             — basegame для bonus_boost (B-density выше)
  BR2.csv             — basegame для special_spins (B-density максимум)
  FR0.csv             — freegame default
  FR1.csv             — freegame для bonus_super (W/H-density выше; M на ленте нет, см. MYSTERY_SINGLE_M_REMOVAL.md)
  FRWCAP.csv          — freegame wincap path (wild-heavy; M на ленте нет)
library/
  books/              — sim outputs (books_<mode>.json)
  lookup_tables/      — LUTs после optimization
  configs/            — RGS verification sidecars
  publish_files/      — PAR sheets и release artifacts
```

## Notes

- `B` (Bonus) реализован через SDK `scatter`-механизм (special_symbols.scatter = ["B"]).
- `M` (Mystery) — sticky reel заменяет ВЕСЬ барабан на `M` в FS, потом раскрывается
  в один символ из `mystery_reveal_pool`. См. `apply_mystery_reels` / `emit_mystery_reveal`.
- На лентах (`BR*` / `FR*` / `FRWCAP`) символа `M` **нет**: M появляется ТОЛЬКО
  через sticky-mechanic. Это исключает «зависшие» одиночные M без раскрытия
  на FS-досках. См. MYSTERY_SINGLE_M_REMOVAL.md.
- Math evaluation идёт по уже раскрытой доске (после mystery_reveal). Линии считаются
  по реальным символам, не по `M`.
- Reelstrips подобраны вручную (mock-ratios от lines-донора). Для production RTP-tuning
  использовать `optimization_program` (см. game_optimization.py и MATH_BLOCKERS.md M1, M4).
- Sim count в run.py по умолчанию = 1e4 на mode (dev-режим). Для production PAR sheet
  поднимать до 1e6+ (см. MATH_BLOCKERS.md M5).
- Полный список блокеров и production roadmap: см. **MATH_BLOCKERS.md**.

## Quick commands

```bash
# Установить Python venv (один раз)
python3 -m venv /tmp/csmath_venv
/tmp/csmath_venv/bin/pip install -r ../../requirements.txt

# Прогон симов (dev)
PYTHONPATH=../..:. /tmp/csmath_venv/bin/python run.py

# Синк книг в web-sdk stories
PYTHONPATH=../..:. /tmp/csmath_venv/bin/python sync_to_web_sdk.py
```
