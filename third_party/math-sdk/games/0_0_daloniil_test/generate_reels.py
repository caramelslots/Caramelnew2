"""Generate Cash Stacks reelstrips deterministically.

Each CSV row = one stop position across all 5 reels (columns).
Format: same as 0_0_lines reels (comma-separated symbol names).

Generated strips:
  BR0.csv  — base default reelstrip (~220 rows)
  BR1.csv  — bonus_boost basegame (denser Bonus)
  BR2.csv  — special_spins basegame (very dense Bonus, near-guaranteed FS)
  FR0.csv  — freegame default
  FR1.csv  — freegame for super bonus (denser Mystery + Bonus)
  FRWCAP.csv — wincap freegame (Wild-rich, fewer Bonus)

Запуск:  python3 generate_reels.py
Output:  reels/*.csv (перезаписывает существующие).

NB: ЭТО MOCK reelstrips для Этапа 2 (proof-of-concept).
Production-level RTP-tuning делается через optimization_program (см. game_optimization.py).
"""

import os
import random


# Распределения (weights) символов по барабанам.
# Каждый ключ — индекс барабана (0..4), каждое значение — dict {symbol: weight}.
#
# General balance hints для 5×5 30-lines:
#   - L1..L4 — общие, дают small wins
#   - H1..H4 — high pays (H1 редкий, H4 чаще)
#   - W — Wild, ~3-5% веса в base, ~6-10% в FS
#   - B — Bonus / scatter (FS trigger). Чем больше, тем чаще FS.
#   - M — **на лентах НЕ присутствует** (ни base, ни FS).
#     M появляется на доске исключительно через `apply_mystery_reels()`
#     (sticky mystery columns), затем раскрывается book-event'ом
#     `mysteryReveal`. См. MYSTERY_SINGLE_M_REMOVAL.md.


def _normalize(weights: dict, length: int) -> list:
    """Развернуть веса в массив длины `length` (deterministic shuffle)."""
    items = []
    total = sum(weights.values())
    for sym, w in weights.items():
        count = max(1, round(length * w / total))
        items.extend([sym] * count)
    # Подгоним длину
    while len(items) > length:
        items.pop()
    while len(items) < length:
        items.append(random.choice(list(weights.keys())))
    random.shuffle(items)
    return items


def _build_strip(weights_per_reel: list, length: int, seed: int) -> list:
    """Сгенерировать массив из `length` строк × 5 столбцов."""
    rng = random.Random(seed)
    reels = []
    for reel_idx in range(5):
        random.seed(seed + reel_idx)
        col = _normalize(weights_per_reel[reel_idx], length)
        rng.shuffle(col)
        reels.append(col)
    rows = [[reels[r][i] for r in range(5)] for i in range(length)]
    return rows


def write_csv(path: str, rows: list[list[str]]) -> None:
    with open(path, "w") as f:
        for row in rows:
            f.write(",".join(row) + "\n")


# Базовая конфигурация весов — варьируется по бараб./стрипу.

# BR0 — basegame default. Tuned in M4 Iter 1 (см. M4_REELSTRIP_TUNING.md):
#   Target HRs (High volatility):
#     5×W       = 1 in 10,000   (W=17, 5xW = (17/220)^5 × 36 ≈ 1/10,140)
#     5×H1      = 1 in 1,000    (H1=9 + W=17 wild sub)
#     5×H2      = 1 in 1,500    (H2=8 + W=17)
#     5×H3      = 1 in ~2,000   (H3=7 + W=17)
#     5×H4      = 1 in ~2,500   (H4=5 + W=17)
#     5×L1-L4   = 1 in ~100     (L=42-43 each, target 80)
#     FS (3+ B) = 1 in ~155     (B=4 all reels, target 200 — tolerance 150-250)
#   Sum per reel = 220.
#
# NB: значения weight = absolute count (т.к. sum(weights) = length=220, normalize
# даёт count = weight). Это упрощает контроль.
BR0_WEIGHTS = [
    # reel 0 (leftmost)
    {"L1": 43, "L2": 43, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 17, "B": 4},
    # reel 1
    {"L1": 43, "L2": 43, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 17, "B": 4},
    # reel 2 (middle)
    {"L1": 43, "L2": 43, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 17, "B": 4},
    # reel 3
    {"L1": 43, "L2": 43, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 17, "B": 4},
    # reel 4 (rightmost)
    {"L1": 43, "L2": 43, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 17, "B": 4},
]

# BR1 — bonus_boost basegame.  Cost ratio = 2× (см. game_config.py betmode cost).
# Натуральный FS HR ~80 (=1 in 80, ~2.5× базы) → меньше B чем сейчас.
# Премиумы и W = идентичны BR0.
#   B=6 per reel → P_per_reel ≈ 1-(214/220)^5 = 0.131
#   P(3+ B на 5 рилах) ≈ 0.0181 → FS HR ≈ 55
#   (чуть выше target 80, но в ballpark с anticipation bias)
BR1_WEIGHTS = [
    {"L1": 43, "L2": 42, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 6},
    {"L1": 43, "L2": 42, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 6},
    {"L1": 42, "L2": 42, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 7},
    {"L1": 43, "L2": 42, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 6},
    {"L1": 43, "L2": 42, "L3": 42, "L4": 42, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 6},
]

# BR2 — special_spins basegame. Cost ratio = 100× (см. game_config.py).
# "Special spins" = почти гарантированный FS. Натуральный FS HR ~2-3.
#   B=14 per reel → P_per_reel ≈ 0.288 → P(3+) ≈ 0.40 → FS HR ≈ 2.5 ✓
BR2_WEIGHTS = [
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 15, "B": 14},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 15, "B": 14},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 37, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 15, "B": 16},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 15, "B": 14},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 15, "B": 14},
]

# FR0 — freegame default. 200 cells.
# Target HRs внутри FS:
#   5×W (FS) = 1 in ~9,000 → K_W=16 (16/200)^5 * 30 ≈ 1/9,300
#   5×H1..H4 — близко к base (H ratio same)
#   B (для Ladder progression): редкий, ~3-4 per reel → ~3-4 B visible per FS spin
#
# NB: M удалена с ленты (см. MYSTERY_SINGLE_M_REMOVAL.md). Sticky Mystery
# заходит только через `apply_mystery_reels()` в game_override.py; одиночных
# «зависающих» M на досках FS больше быть не должно.
# Вес M перераспределён: +1 к W (доминанта FS), остаток — на H* при необходимости.
FR0_WEIGHTS = [
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 3},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 3},
    {"L1": 38, "L2": 38, "L3": 37, "L4": 37, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 18, "B": 4},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 3},
    {"L1": 38, "L2": 38, "L3": 38, "L4": 38, "H4": 5, "H3": 7, "H2": 8, "H1": 9, "W": 16, "B": 3},
]

# FR1 — freegame для super_bonus (3 sticky mystery reels с самого старта).
# Premiums и W чуть выше FR0; ранее M была плотнее (9-12 per reel) "для feel",
# но после MYSTERY_SINGLE_M_REMOVAL.md убрана с ленты: sticky M уже накладывается
# через `apply_mystery_reels()` (минимум 3 столбца с старта супер-бонуса).
#
# Вес M перераспределён: ~⅓ в W (boost 5×W), ~⅔ в H* пропорционально (boost premium
# pays под FS multipliers).
#   5×W FS super: K_W=21, (21/200)^5 * 30 ≈ 1/4,000 — частое (super = «горячий» FS).
FR1_WEIGHTS = [
    {"L1": 34, "L2": 34, "L3": 34, "L4": 34, "H4": 7, "H3": 9, "H2": 11, "H1": 12, "W": 21, "B": 4},
    {"L1": 34, "L2": 34, "L3": 34, "L4": 34, "H4": 7, "H3": 9, "H2": 11, "H1": 12, "W": 21, "B": 4},
    {"L1": 34, "L2": 34, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 11, "H1": 13, "W": 22, "B": 5},
    {"L1": 34, "L2": 34, "L3": 34, "L4": 34, "H4": 7, "H3": 9, "H2": 11, "H1": 12, "W": 21, "B": 4},
    {"L1": 34, "L2": 34, "L3": 34, "L4": 34, "H4": 7, "H3": 9, "H2": 11, "H1": 12, "W": 21, "B": 4},
]

# FRWCAP — wincap freegame (120 cells). Wild-heavy для приближения к max win.
# Здесь все 5×W чаще + premiums dense → 5×W HR ~50-100 (target 5M
# регулируется через ladder/multiplier accumulator, не reelstrip).
#
# M убрана с ленты (см. MYSTERY_SINGLE_M_REMOVAL.md). Sticky Mystery в wincap-FS
# заходит через `apply_mystery_reels()` как обычно. Вес M полностью передан в W —
# усиливает wild-heavy характер cap-стрипа.
#   K_W=34 → (34/120)^5 * 30 ≈ 1/5.4 (5×W каждые ~5-6 спинов в wincap FS).
FRWCAP_WEIGHTS = [
    {"L1": 6, "L2": 6, "L3": 6, "L4": 6, "H4": 8, "H3": 9, "H2": 10, "H1": 12, "W": 34, "B": 1},
    {"L1": 6, "L2": 6, "L3": 6, "L4": 6, "H4": 8, "H3": 9, "H2": 10, "H1": 12, "W": 34, "B": 1},
    {"L1": 6, "L2": 6, "L3": 5, "L4": 5, "H4": 9, "H3": 10, "H2": 11, "H1": 13, "W": 34, "B": 1},
    {"L1": 6, "L2": 6, "L3": 6, "L4": 6, "H4": 8, "H3": 9, "H2": 10, "H1": 12, "W": 34, "B": 1},
    {"L1": 6, "L2": 6, "L3": 6, "L4": 6, "H4": 8, "H3": 9, "H2": 10, "H1": 12, "W": 34, "B": 1},
]


STRIPS = [
    ("BR0", BR0_WEIGHTS, 220, 1001),
    ("BR1", BR1_WEIGHTS, 220, 1002),
    ("BR2", BR2_WEIGHTS, 220, 1003),
    ("FR0", FR0_WEIGHTS, 200, 2001),
    ("FR1", FR1_WEIGHTS, 200, 2002),
    ("FRWCAP", FRWCAP_WEIGHTS, 120, 2003),
]


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    reels_dir = os.path.join(here, "reels")
    os.makedirs(reels_dir, exist_ok=True)
    for name, weights, length, seed in STRIPS:
        rows = _build_strip(weights, length, seed)
        path = os.path.join(reels_dir, f"{name}.csv")
        write_csv(path, rows)
        print(f"Wrote {path}: {length} rows")


if __name__ == "__main__":
    main()
