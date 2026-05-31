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

# BR0 — basegame default. HIGH VOLATILITY tuning.
#   L ratio: 77% → 55% (many fewer cheap combos)
#   H ratio: 13% → 22%
#   W ratio:  8% → 17% (Wild-heavy → basegame direct hits are big when they land)
#   FS (3+B) = 1 in ~180 (B=4 all reels, unchanged)
#
#   With HR=25 in optimizer, direct basegame wins are very rare.
#   When they DO hit, the high W density means line wins are substantial.
#   Sum per reel = 220.
BR0_WEIGHTS = [
    # reel 0 (leftmost)
    {"L1": 30, "L2": 30, "L3": 30, "L4": 30, "H4": 7, "H3": 11, "H2": 14, "H1": 17, "W": 37, "B": 4},
    # reel 1
    {"L1": 30, "L2": 30, "L3": 30, "L4": 30, "H4": 7, "H3": 11, "H2": 14, "H1": 17, "W": 37, "B": 4},
    # reel 2 (middle)
    {"L1": 30, "L2": 30, "L3": 30, "L4": 30, "H4": 7, "H3": 11, "H2": 14, "H1": 17, "W": 37, "B": 4},
    # reel 3
    {"L1": 30, "L2": 30, "L3": 30, "L4": 30, "H4": 7, "H3": 11, "H2": 14, "H1": 17, "W": 37, "B": 4},
    # reel 4 (rightmost)
    {"L1": 30, "L2": 30, "L3": 30, "L4": 30, "H4": 7, "H3": 11, "H2": 14, "H1": 17, "W": 37, "B": 4},
]

# BR1 — bonus_boost basegame. Same medium-high volatility profile as BR0,
# keeping B=6 for the elevated FS trigger rate (cost ratio = 2×).
BR1_WEIGHTS = [
    {"L1": 37, "L2": 36, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 17, "W": 22, "B": 6},
    {"L1": 37, "L2": 36, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 17, "W": 22, "B": 6},
    {"L1": 36, "L2": 36, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 17, "W": 22, "B": 7},
    {"L1": 37, "L2": 36, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 17, "W": 22, "B": 6},
    {"L1": 37, "L2": 36, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 17, "W": 22, "B": 6},
]

# BR2 — special_spins basegame. Keeps high B density for near-guaranteed FS
# while shifting L → H ratio for volatility consistency with BR0/BR1.
BR2_WEIGHTS = [
    {"L1": 33, "L2": 33, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "W": 16, "B": 14},
    {"L1": 33, "L2": 33, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "W": 16, "B": 14},
    {"L1": 33, "L2": 33, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "W": 14, "B": 16},
    {"L1": 33, "L2": 33, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "W": 16, "B": 14},
    {"L1": 33, "L2": 33, "L3": 33, "L4": 33, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "W": 16, "B": 14},
]

# FR0 — freegame default. 200 cells.
#   W=15% (30 per reel) — enough for good wins but allows wide payout distribution.
#   Mystery reveals cover the high-volatility tail (optimizer biases those sessions up).
#   Target: FS sessions range from ~30× (bad reveals, few W) to 2500× (wincap).
FR0_WEIGHTS = [
    {"L1": 30, "L2": 28, "L3": 28, "L4": 26, "H4": 8, "H3": 13, "H2": 17, "H1": 20, "W": 30, "B": 4},
    {"L1": 30, "L2": 28, "L3": 28, "L4": 26, "H4": 8, "H3": 13, "H2": 17, "H1": 20, "W": 30, "B": 4},
    {"L1": 29, "L2": 27, "L3": 27, "L4": 25, "H4": 8, "H3": 13, "H2": 17, "H1": 20, "W": 31, "B": 5},
    {"L1": 30, "L2": 28, "L3": 28, "L4": 26, "H4": 8, "H3": 13, "H2": 17, "H1": 20, "W": 30, "B": 4},
    {"L1": 30, "L2": 28, "L3": 28, "L4": 26, "H4": 8, "H3": 13, "H2": 17, "H1": 20, "W": 30, "B": 4},
]

# FR1 — freegame for super_bonus. Higher W than FR0 for elevated FS outcomes.
#   W=20% gives frequent Wild combos; mystery Wild (18%) creates bimodal distribution
#   (low: ~50-200×, high: near-wincap) — ideal for high-volatility optimizer.
FR1_WEIGHTS = [
    {"L1": 26, "L2": 24, "L3": 24, "L4": 22, "H4": 9, "H3": 14, "H2": 18, "H1": 22, "W": 40, "B": 4},
    {"L1": 26, "L2": 24, "L3": 24, "L4": 22, "H4": 9, "H3": 14, "H2": 18, "H1": 22, "W": 40, "B": 4},
    {"L1": 25, "L2": 23, "L3": 23, "L4": 21, "H4": 9, "H3": 14, "H2": 18, "H1": 22, "W": 41, "B": 6},
    {"L1": 26, "L2": 24, "L3": 24, "L4": 22, "H4": 9, "H3": 14, "H2": 18, "H1": 22, "W": 40, "B": 4},
    {"L1": 26, "L2": 24, "L3": 24, "L4": 22, "H4": 9, "H3": 14, "H2": 18, "H1": 22, "W": 40, "B": 4},
]

# FRWCAP — wincap freegame (120 cells). Wild-heavy for max-win approach.
#   Slight reduction in L (6→4) frees space for extra H — makes premium combos
#   more likely alongside the dominant Wild mass.
#   K_W=38 → (38/120)^5 * 30 ≈ 1/3.5 (5×W every ~3-4 spins in wincap FS).
FRWCAP_WEIGHTS = [
    {"L1": 4, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 15, "W": 38, "B": 1},
    {"L1": 4, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 15, "W": 38, "B": 1},
    {"L1": 3, "L2": 3, "L3": 3, "L4": 3, "H4": 10, "H3": 12, "H2": 14, "H1": 16, "W": 38, "B": 1},
    {"L1": 4, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 15, "W": 38, "B": 1},
    {"L1": 4, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 15, "W": 38, "B": 1},
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
