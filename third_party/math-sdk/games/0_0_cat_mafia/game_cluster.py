"""Visual cluster boards for zero-win spins (MATH_RETENTION_PLAN Stage 2, type A).

Generates 5×5 boards with 4–6 copies of one symbol visible on screen without
forming any line win. Used for criteria ``0_cluster`` and FS dead-spin clusters.
"""

from __future__ import annotations

import random
from typing import Callable, Optional

from src.calculations.lines import Lines


# BR0 rarity weights — bias cluster hero toward highs for denser premium look.
# Still guaranteed zero line-win by construction in generate_cluster_board_names.
# No W (rework): natural wild drops removed; W only exists via SW curtains.
CLUSTER_SYMBOL_WEIGHTS_BR0 = {
    "L3": 3,
    "L4": 3,
    "L1": 3,
    "L2": 3,
    "H4": 5,
    "H3": 5,
    "H2": 4,
    "H1": 4,
}

CLUSTER_SYMBOL_WEIGHTS_BR1 = dict(CLUSTER_SYMBOL_WEIGHTS_BR0)
CLUSTER_SYMBOL_WEIGHTS_BR2 = dict(CLUSTER_SYMBOL_WEIGHTS_BR0)

# FR0 / FR1 — match ~1:1 premium noise target used in base enrich.
CLUSTER_SYMBOL_WEIGHTS_FR0 = {
    "L3": 3,
    "L4": 3,
    "L1": 3,
    "L2": 3,
    "H4": 5,
    "H3": 5,
    "H2": 4,
    "H1": 4,
}

CLUSTER_SYMBOL_WEIGHTS_FR1 = {
    "L3": 2,
    "L4": 2,
    "L1": 3,
    "L2": 3,
    "H4": 5,
    "H3": 5,
    "H2": 4,
    "H1": 4,
}

FILLER_SYMBOLS = ["L1", "L2", "L3", "L4", "H4", "H3", "H2", "H1"]
# Weighted fillers ≈ 58% high among L+H (Hell Hot–like noise).
FILLER_WEIGHTS = {
    "L1": 2,
    "L2": 2,
    "L3": 2,
    "L4": 2,
    "H4": 4,
    "H3": 4,
    "H2": 3,
    "H1": 3,
}


def pick_cluster_symbol(weights: dict[str, int], rng: random.Random) -> str:
    symbols = list(weights.keys())
    w = list(weights.values())
    return rng.choices(symbols, weights=w, k=1)[0]


def pick_filler_symbol(exclude: str, rng: random.Random) -> str:
    pool = [s for s in FILLER_SYMBOLS if s != exclude]
    weights = [FILLER_WEIGHTS.get(s, 1) for s in pool]
    return rng.choices(pool, weights=weights, k=1)[0]


def _scatter_count(board_names: list[list[str]]) -> int:
    reels_with_b = set()
    for reel, col in enumerate(board_names):
        for name in col:
            if name == "B":
                reels_with_b.add(reel)
    return len(reels_with_b)


def _bonus_per_reel_ok(board_names: list[list[str]], max_per_reel: int = 1) -> bool:
    """True when no column shows more than max_per_reel Bonus symbols."""
    for col in board_names:
        if sum(1 for name in col if name == "B") > max_per_reel:
            return False
    return True


def _pick_cluster_positions(
    num_reels: int,
    num_rows: list[int],
    cluster_size: int,
    rng: random.Random,
) -> list[tuple[int, int]]:
    """Pick spread positions across at least 3 reels when possible."""
    all_cells = [(r, row) for r in range(num_reels) for row in range(num_rows[r])]
    rng.shuffle(all_cells)

    min_reels = min(3, num_reels)
    chosen: list[tuple[int, int]] = []
    used_reels: set[int] = set()

    for cell in all_cells:
        if len(chosen) >= cluster_size:
            break
        reel, row = cell
        if reel in used_reels and len(used_reels) < min_reels:
            continue
        if cell in chosen:
            continue
        chosen.append(cell)
        used_reels.add(reel)

    while len(chosen) < cluster_size:
        cell = rng.choice(all_cells)
        if cell not in chosen:
            chosen.append(cell)
            used_reels.add(cell[0])

    return chosen


def generate_cluster_board_names(
    config,
    symbol_weights: dict[str, int],
    create_symbol: Callable[[str], object],
    *,
    global_multiplier: int = 1,
    max_scatters: int = 2,
    min_cluster: int = 4,
    max_cluster: int = 6,
    max_attempts: int = 600,
    rng: Optional[random.Random] = None,
) -> Optional[list[list[str]]]:
    """Return reel-major symbol-name board or None if generation failed."""
    rng = rng or random.Random()
    num_reels = config.num_reels
    num_rows = config.num_rows

    for _ in range(max_attempts):
        cluster_sym = pick_cluster_symbol(symbol_weights, rng)
        cluster_size = rng.randint(min_cluster, max_cluster)
        positions = _pick_cluster_positions(num_reels, num_rows, cluster_size, rng)
        pos_set = set(positions)

        board_names: list[list[str]] = []
        for reel in range(num_reels):
            col: list[str] = []
            for row in range(num_rows[reel]):
                if (reel, row) in pos_set:
                    col.append(cluster_sym)
                else:
                    col.append(pick_filler_symbol(cluster_sym, rng))
            board_names.append(col)

        if _scatter_count(board_names) > max_scatters:
            continue
        if not _bonus_per_reel_ok(board_names):
            continue

        board = [
            [create_symbol(board_names[r][row]) for row in range(num_rows[r])]
            for r in range(num_reels)
        ]
        win_data = Lines.get_lines(
            board,
            config,
            global_multiplier=global_multiplier,
        )
        if win_data["totalWin"] == 0:
            return board_names

    return None
