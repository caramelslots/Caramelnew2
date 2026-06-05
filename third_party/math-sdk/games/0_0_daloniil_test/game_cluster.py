"""Visual cluster boards for zero-win spins (MATH_RETENTION_PLAN Stage 2, type A).

Generates 5×5 boards with 4–6 copies of one symbol visible on screen without
forming any line win. Used for criteria ``0_cluster`` and FS dead-spin clusters.
"""

from __future__ import annotations

import random
from typing import Callable, Optional

from src.calculations.lines import Lines


# BR0 rarity weights — mirror MATH_RETENTION_PLAN §Stage 2 Q4.
CLUSTER_SYMBOL_WEIGHTS_BR0 = {
    "L3": 6,
    "L4": 6,
    "L1": 5,
    "L2": 5,
    "H4": 4,
    "H3": 3,
    "H2": 2,
    "H1": 1,
    "W": 1,
}

CLUSTER_SYMBOL_WEIGHTS_BR1 = dict(CLUSTER_SYMBOL_WEIGHTS_BR0)
CLUSTER_SYMBOL_WEIGHTS_BR2 = dict(CLUSTER_SYMBOL_WEIGHTS_BR0)

# FR0 / FR1 — slightly lower L weight vs base strips (more H on FS reels).
CLUSTER_SYMBOL_WEIGHTS_FR0 = {
    "L3": 5,
    "L4": 5,
    "L1": 4,
    "L2": 4,
    "H4": 4,
    "H3": 3,
    "H2": 3,
    "H1": 2,
    "W": 2,
}

CLUSTER_SYMBOL_WEIGHTS_FR1 = {
    "L3": 4,
    "L4": 4,
    "L1": 4,
    "L2": 4,
    "H4": 5,
    "H3": 4,
    "H2": 3,
    "H1": 2,
    "W": 3,
}

FILLER_SYMBOLS = ["L1", "L2", "L3", "L4", "H4", "H3", "H2", "H1"]


def pick_cluster_symbol(weights: dict[str, int], rng: random.Random) -> str:
    symbols = list(weights.keys())
    w = list(weights.values())
    return rng.choices(symbols, weights=w, k=1)[0]


def _scatter_count(board_names: list[list[str]]) -> int:
    reels_with_b = set()
    for reel, col in enumerate(board_names):
        for name in col:
            if name == "B":
                reels_with_b.add(reel)
    return len(reels_with_b)


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
                    pool = [s for s in FILLER_SYMBOLS if s != cluster_sym]
                    col.append(rng.choice(pool))
            board_names.append(col)

        if _scatter_count(board_names) > max_scatters:
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
