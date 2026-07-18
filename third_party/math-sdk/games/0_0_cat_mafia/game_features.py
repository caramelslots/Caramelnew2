"""Cat Mafia feature helpers (paw / SW / XOR / target pick / bullets / shoot)."""

from __future__ import annotations

import random
from typing import Any

from src.calculations.statistics import get_random_outcome

LOW = {"L1", "L2", "L3", "L4"}
HIGH = {"H1", "H2", "H3", "H4"}


def _sym_name(cell) -> str:
    return cell.name if hasattr(cell, "name") else str(cell)


def _sym_mult(cell) -> int:
    if hasattr(cell, "get_attribute"):
        try:
            return int(cell.get_attribute("multiplier") or 1)
        except Exception:
            pass
    if hasattr(cell, "multiplier"):
        return int(getattr(cell, "multiplier") or 1)
    return 1


def find_symbols(board, names: set[str]) -> list[dict]:
    hits = []
    for reel, col in enumerate(board):
        for row, cell in enumerate(col):
            if _sym_name(cell) in names:
                hits.append({"reel": reel, "row": row, "name": _sym_name(cell), "mult": _sym_mult(cell)})
    return hits


def find_paws(board) -> list[dict]:
    return find_symbols(board, {"P"})


def find_super_wilds(board) -> list[dict]:
    return find_symbols(board, {"SW"})


def find_bullets(board) -> list[dict]:
    return find_symbols(board, {"BT"})


def coin_tier_for(symbol_name: str) -> int:
    if symbol_name in LOW:
        return 1
    if symbol_name in HIGH:
        return 2
    if symbol_name in {"W", "SW", "B"}:
        return 3
    if symbol_name == "P":
        return 0
    return 1


def sw_positions_in_wins(sw_hits: list[dict], win_data: dict) -> set[tuple[int, int]]:
    """Return (reel,row) of SW cells that sit on a winning payline."""
    winning_pos = set()
    for win in win_data.get("wins") or []:
        for p in win.get("positions") or []:
            winning_pos.add((p["reel"], p["row"]))
    return {(h["reel"], h["row"]) for h in sw_hits if (h["reel"], h["row"]) in winning_pos}


def resolve_xor(has_paw: bool, expand_sw: bool) -> tuple[bool, bool]:
    """One spin: either paw or SW expand — never both."""
    if has_paw and expand_sw:
        # Prefer SW expand when both would fire.
        return False, True
    return has_paw, expand_sw


def build_paw_resolve(board, bet: float = 1.0) -> tuple[list[dict], list[dict], float]:
    """Build pawCoinResolve payload from board. Returns (paws, rows, total_win)."""
    paws = find_paws(board)
    if not paws:
        return [], [], 0.0

    rows_to_convert = sorted({p["row"] for p in paws})
    rows_payload = []
    total = 0.0
    for row in rows_to_convert:
        cells = []
        for reel in range(len(board)):
            name = _sym_name(board[reel][row])
            tier = coin_tier_for(name)
            win = float(tier) * bet
            total += win
            cells.append({"reel": reel, "from": name, "coinTier": tier, "win": win})
        rows_payload.append({"row": row, "cells": cells})
    return [{"reel": p["reel"], "row": p["row"]} for p in paws], rows_payload, total


def expand_sw_columns(board, create_symbol, sw_hits: list[dict]) -> tuple[list[dict], int]:
    """Fill each SW reel with SW wilds at that mult. Returns (expands, productMult)."""
    # One expand per reel (first SW on that reel).
    by_reel: dict[int, dict] = {}
    for h in sw_hits:
        by_reel.setdefault(h["reel"], h)

    expands = []
    product = 1
    for reel, h in sorted(by_reel.items()):
        mult = max(1, int(h.get("mult") or 2))
        product *= mult
        for row in range(len(board[reel])):
            board[reel][row] = create_symbol("SW")
            board[reel][row].assign_attribute({"multiplier": mult})
        expands.append({"reel": reel, "row": h["row"], "mult": mult})
    return expands, product if expands else 1


def pick_fs_targets(config, rng: random.Random | None = None) -> tuple[list[int], int, int]:
    """Return (targets[6], chosenIndex, awardedFs)."""
    rng = rng or random
    values = list(config.target_pick_values)
    count = int(config.target_pick_count)
    # Build a mixed layout of only 8/10/12.
    targets = [rng.choice(values) for _ in range(count)]
    # Ensure all three values appear at least once when count >= 3.
    if count >= 3:
        for i, v in enumerate(values[: min(3, count)]):
            targets[i] = v
        rng.shuffle(targets)
    chosen_index = rng.randrange(count)
    awarded = targets[chosen_index]
    return targets, chosen_index, awarded


def collect_bullets(board, drum_count: int, drum_max: int) -> tuple[list[dict], int]:
    hits = find_bullets(board)
    if not hits or drum_count >= drum_max:
        return [], drum_count
    room = drum_max - drum_count
    taken = hits[:room]
    return [{"reel": h["reel"], "row": h["row"]} for h in taken], drum_count + len(taken)


def run_target_shoot(
    drum_count: int,
    reward_weights: dict[int, int],
    target_count: int = 9,
    rng: random.Random | None = None,
) -> tuple[list[dict], int]:
    """N guaranteed hits on distinct targets. Returns (shots, extraFs)."""
    rng = rng or random
    n = min(int(drum_count), target_count)
    if n <= 0:
        return [], 0
    indices = list(range(target_count))
    rng.shuffle(indices)
    shots = []
    extra = 0
    for i in range(n):
        reward = int(get_random_outcome(reward_weights))
        shots.append({"targetIndex": indices[i], "reward": reward})
        extra += reward
    return shots, extra
