"""Generate Wok Fury reelstrips deterministically.

Each CSV row = one stop position across all 5 reels (columns).
Format: same as 0_0_lines reels (comma-separated symbol names).

Generated strips:
  BR0.csv  — base default reelstrip (~220 rows)
  BR1.csv  — bonus_boost basegame (denser Bonus)
  BR2.csv  — special_spins basegame (very dense Bonus, near-guaranteed FS)
  FR0.csv  — freegame default (no scatter B)
  FR1.csv  — freegame for super bonus (no scatter B)
  FRWCAP.csv — wincap freegame (H1-rich + SW, no scatter B)

W rework (2026-08): обычный WILD удалён со всех лент — W выпадает только
через Wild-штору (SW expand). Вес W перелит в L1-L4 (hit rate) / H1+SW (FRWCAP).

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

# BR0 — basegame default. Lower vol.
#   SW on strips (2026-08): 2 stops/reel, как на FR0 — штора выпадает
#   естественно; форс-посадка force_sw_expand_on_board удалена. Максимум 1 SW
#   за спин держит enforce_single_sw_base (game_override.py). Гейт шторы без
#   изменений: SW должен стоять на выигрышной линии.
#   Paw на лентах по-прежнему НЕТ — лапа садится фенсом force_paw_on_board.
#   No W on strips (rework): W weight moved into L1-L4 to hold hit rate.
BR0_WEIGHTS = [
    {"L1": 44, "L2": 44, "L3": 45, "L4": 47, "H4": 6, "H3": 9, "H2": 11, "H1": 13, "B": 4, "SW": 2},
    {"L1": 43, "L2": 43, "L3": 44, "L4": 46, "H4": 6, "H3": 9, "H2": 11, "H1": 13, "B": 4, "SW": 2},
    {"L1": 44, "L2": 44, "L3": 45, "L4": 47, "H4": 6, "H3": 9, "H2": 11, "H1": 13, "B": 4, "SW": 2},
    {"L1": 43, "L2": 43, "L3": 44, "L4": 46, "H4": 6, "H3": 9, "H2": 11, "H1": 13, "B": 4, "SW": 2},
    {"L1": 43, "L2": 43, "L3": 44, "L4": 46, "H4": 6, "H3": 9, "H2": 11, "H1": 13, "B": 4, "SW": 2},
]

# BR1 — bonus_boost basegame. Same; paw/SW via equal force criteria. No W.
BR1_WEIGHTS = [
    {"L1": 45, "L2": 44, "L3": 45, "L4": 45, "H4": 6, "H3": 8, "H2": 10, "H1": 13, "B": 6},
    {"L1": 46, "L2": 45, "L3": 46, "L4": 46, "H4": 6, "H3": 8, "H2": 10, "H1": 13, "B": 6},
    {"L1": 44, "L2": 43, "L3": 44, "L4": 44, "H4": 6, "H3": 8, "H2": 10, "H1": 13, "B": 7},
    {"L1": 45, "L2": 44, "L3": 45, "L4": 45, "H4": 6, "H3": 8, "H2": 10, "H1": 13, "B": 6},
    {"L1": 44, "L2": 43, "L3": 44, "L4": 44, "H4": 6, "H3": 8, "H2": 10, "H1": 13, "B": 6},
]

# BR2 — special_spins basegame. Keeps high B density for near-guaranteed FS
# while shifting L → H ratio for volatility consistency with BR0/BR1. No W.
BR2_WEIGHTS = [
    {"L1": 37, "L2": 37, "L3": 37, "L4": 37, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "B": 14},
    {"L1": 37, "L2": 37, "L3": 37, "L4": 37, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "B": 14},
    {"L1": 37, "L2": 37, "L3": 36, "L4": 36, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "B": 16},
    {"L1": 37, "L2": 37, "L3": 37, "L4": 37, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "B": 14},
    {"L1": 37, "L2": 37, "L3": 37, "L4": 37, "H4": 7, "H3": 10, "H2": 12, "H1": 14, "B": 14},
]

# FR0 — Normal bonus FS. No W on strips (rework) — W weight moved into L1-L4.
#   BT restored to pre-medvol density (f6c5be6: BT ≈ 12/7/6/4/3 per 200).
#   No scatter (B) in FS.
FR0_WEIGHTS = [
    {"L1": 29, "L2": 34, "L3": 35, "L4": 32, "H4": 9, "H3": 13, "H2": 16, "H1": 18, "SW": 2, "BT": 12},
    {"L1": 34, "L2": 34, "L3": 35, "L4": 32, "H4": 9, "H3": 13, "H2": 16, "H1": 18, "SW": 2, "BT": 7},
    {"L1": 35, "L2": 34, "L3": 34, "L4": 32, "H4": 9, "H3": 13, "H2": 16, "H1": 18, "SW": 2, "BT": 6},
    {"L1": 37, "L2": 34, "L3": 35, "L4": 32, "H4": 9, "H3": 13, "H2": 16, "H1": 18, "SW": 2, "BT": 4},
    {"L1": 38, "L2": 34, "L3": 35, "L4": 32, "H4": 9, "H3": 13, "H2": 16, "H1": 18, "SW": 2, "BT": 3},
]

# FR1 — Super bonus FS. No W (rework); BT ≈ f6c5be6 (9/7/5/4/11).
FR1_WEIGHTS = [
    {"L1": 31, "L2": 34, "L3": 33, "L4": 32, "H4": 10, "H3": 14, "H2": 16, "H1": 19, "SW": 2, "BT": 9},
    {"L1": 33, "L2": 34, "L3": 33, "L4": 32, "H4": 10, "H3": 14, "H2": 16, "H1": 19, "SW": 2, "BT": 7},
    {"L1": 35, "L2": 33, "L3": 33, "L4": 31, "H4": 10, "H3": 14, "H2": 16, "H1": 19, "SW": 2, "BT": 5},
    {"L1": 36, "L2": 34, "L3": 33, "L4": 32, "H4": 10, "H3": 14, "H2": 16, "H1": 19, "SW": 2, "BT": 4},
    {"L1": 29, "L2": 34, "L3": 33, "L4": 32, "H4": 10, "H3": 14, "H2": 16, "H1": 19, "SW": 2, "BT": 11},
]

# FRWCAP — wincap freegame (120 cells). No W (rework): H1-heavy + SW so the
#   wincap fence still builds ×2500 (and ×25000 via products) — 5×H1 = 150,
#   SW sticky products (×2/×4/×6/×8) carry it to the cap.
FRWCAP_WEIGHTS = [
    {"L1": 5, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 39, "SW": 14},
    {"L1": 5, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 39, "SW": 14},
    {"L1": 4, "L2": 3, "L3": 3, "L4": 3, "H4": 10, "H3": 12, "H2": 14, "H1": 40, "SW": 14},
    {"L1": 5, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 39, "SW": 14},
    {"L1": 5, "L2": 4, "L3": 4, "L4": 4, "H4": 9, "H3": 11, "H2": 13, "H1": 39, "SW": 14},
]

# Zerowin strips — no W (rework), high symbol diversity for plain dead spins.
# Cluster dead spins use programmatic boards (game_cluster.py); these strips
# speed up criteria="0" sampling and mirror FR0/FR1 density for reference.
BR0_ZW_WEIGHTS = [
    {"L1": 39, "L2": 38, "L3": 38, "L4": 37, "H4": 10, "H3": 14, "H2": 15, "H1": 17, "B": 4},
    {"L1": 38, "L2": 39, "L3": 38, "L4": 37, "H4": 10, "H3": 14, "H2": 15, "H1": 17, "B": 4},
    {"L1": 39, "L2": 38, "L3": 37, "L4": 38, "H4": 10, "H3": 14, "H2": 15, "H1": 17, "B": 4},
    {"L1": 38, "L2": 38, "L3": 39, "L4": 37, "H4": 10, "H3": 14, "H2": 15, "H1": 17, "B": 4},
    {"L1": 39, "L2": 37, "L3": 38, "L4": 38, "H4": 10, "H3": 14, "H2": 15, "H1": 17, "B": 4},
]

BR1_ZW_WEIGHTS = [
    {"L1": 43, "L2": 42, "L3": 42, "L4": 41, "H4": 10, "H3": 13, "H2": 14, "H1": 16, "B": 6},
    {"L1": 42, "L2": 43, "L3": 42, "L4": 41, "H4": 10, "H3": 13, "H2": 14, "H1": 16, "B": 6},
    {"L1": 43, "L2": 42, "L3": 41, "L4": 42, "H4": 10, "H3": 13, "H2": 14, "H1": 16, "B": 7},
    {"L1": 42, "L2": 42, "L3": 43, "L4": 41, "H4": 10, "H3": 13, "H2": 14, "H1": 16, "B": 6},
    {"L1": 43, "L2": 41, "L3": 42, "L4": 42, "H4": 10, "H3": 13, "H2": 14, "H1": 16, "B": 6},
]

BR2_ZW_WEIGHTS = [
    {"L1": 36, "L2": 35, "L3": 35, "L4": 35, "H4": 10, "H3": 13, "H2": 14, "H1": 15, "B": 12},
    {"L1": 35, "L2": 36, "L3": 35, "L4": 35, "H4": 10, "H3": 13, "H2": 14, "H1": 15, "B": 12},
    {"L1": 36, "L2": 35, "L3": 34, "L4": 35, "H4": 10, "H3": 13, "H2": 14, "H1": 15, "B": 14},
    {"L1": 35, "L2": 35, "L3": 36, "L4": 35, "H4": 10, "H3": 13, "H2": 14, "H1": 15, "B": 12},
    {"L1": 36, "L2": 34, "L3": 35, "L4": 35, "H4": 10, "H3": 13, "H2": 14, "H1": 15, "B": 12},
]

FR0_ZW_WEIGHTS = [
    {"L1": 38, "L2": 32, "L3": 32, "L4": 30, "H4": 11, "H3": 16, "H2": 19, "H1": 22},
    {"L1": 38, "L2": 33, "L3": 31, "L4": 30, "H4": 11, "H3": 16, "H2": 19, "H1": 22},
    {"L1": 39, "L2": 32, "L3": 32, "L4": 29, "H4": 11, "H3": 16, "H2": 19, "H1": 22},
    {"L1": 37, "L2": 32, "L3": 33, "L4": 30, "H4": 11, "H3": 16, "H2": 19, "H1": 22},
    {"L1": 38, "L2": 31, "L3": 32, "L4": 30, "H4": 11, "H3": 16, "H2": 19, "H1": 22},
]

FR1_ZW_WEIGHTS = [
    {"L1": 34, "L2": 28, "L3": 28, "L4": 26, "H4": 12, "H3": 17, "H2": 21, "H1": 25},
    {"L1": 35, "L2": 29, "L3": 27, "L4": 26, "H4": 12, "H3": 17, "H2": 21, "H1": 25},
    {"L1": 35, "L2": 28, "L3": 28, "L4": 25, "H4": 12, "H3": 17, "H2": 21, "H1": 25},
    {"L1": 33, "L2": 28, "L3": 29, "L4": 26, "H4": 12, "H3": 17, "H2": 21, "H1": 25},
    {"L1": 34, "L2": 27, "L3": 28, "L4": 26, "H4": 12, "H3": 17, "H2": 21, "H1": 25},
]


STRIPS = [
    ("BR0", BR0_WEIGHTS, 220, 1001),
    ("BR1", BR1_WEIGHTS, 220, 1002),
    ("BR2", BR2_WEIGHTS, 220, 1003),
    ("BR0_ZW", BR0_ZW_WEIGHTS, 220, 1101),
    ("BR1_ZW", BR1_ZW_WEIGHTS, 220, 1102),
    ("BR2_ZW", BR2_ZW_WEIGHTS, 220, 1103),
    ("FR0", FR0_WEIGHTS, 200, 2001),
    ("FR1", FR1_WEIGHTS, 200, 2002),
    ("FRWCAP", FRWCAP_WEIGHTS, 120, 2003),
    ("FR0_ZW", FR0_ZW_WEIGHTS, 200, 2101),
    ("FR1_ZW", FR1_ZW_WEIGHTS, 200, 2102),
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
