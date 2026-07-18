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


def resolve_xor(
    has_paw: bool,
    expand_sw: bool,
    rng: random.Random | None = None,
) -> tuple[bool, bool]:
    """One spin: either paw or SW expand — never both.

    When both qualify, coin-flip 50/50 so feature rates stay balanced.
    """
    if has_paw and expand_sw:
        pick = rng.random() if rng is not None else random.random()
        if pick < 0.5:
            return True, False
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
    """Fill SW reel(s) with SW wilds at that mult. Returns (expands, productMult).

    One expand per reel; multiple reels → product of multipliers.
    """
    by_reel: dict[int, dict] = {}
    for h in sw_hits:
        by_reel.setdefault(h["reel"], h)

    expands = []
    product = 1
    for reel, h in sorted(by_reel.items()):
        mult = max(1, int(h.get("mult") or 2))
        product *= mult
        stamp_expanded_sw_column(board, create_symbol, reel, mult, row=h["row"])
        expands.append({"reel": reel, "row": h["row"], "mult": mult})
    return expands, product if expands else 1


def keep_one_sw_per_reel(board, create_symbol, skip_reels: set[int] | None = None, rng: random.Random | None = None) -> list[dict]:
    """At most one lying SW cell per reel (skip already-sticky reels)."""
    rng = rng or random
    skip = skip_reels or set()
    hits = find_super_wilds(board)
    by_reel: dict[int, list[dict]] = {}
    for h in hits:
        if h["reel"] in skip:
            continue
        by_reel.setdefault(h["reel"], []).append(h)
    kept: list[dict] = []
    for reel, group in by_reel.items():
        keep = rng.choice(group)
        kept.append(keep)
        for h in group:
            if h is keep:
                continue
            board[h["reel"]][h["row"]] = create_symbol("L2")
    return kept


def product_of_mults(mults) -> int:
    product = 1
    for m in mults:
        product *= max(1, int(m))
    return product if product > 0 else 1


def stamp_expanded_sw_column(
    board,
    create_symbol,
    reel: int,
    mult: int,
    row: int = 0,
) -> dict:
    """Paint a full reel as expanded Super Wild."""
    mult = max(1, int(mult))
    for r in range(len(board[reel])):
        board[reel][r] = create_symbol("SW")
        board[reel][r].assign_attribute({"multiplier": mult})
    return {"reel": int(reel), "row": int(row), "mult": mult}


def strip_all_sw(board, create_symbol, filler: str = "L2") -> None:
    for reel, col in enumerate(board):
        for row, cell in enumerate(col):
            if _sym_name(cell) == "SW":
                board[reel][row] = create_symbol(filler)


def keep_single_sw(
    board,
    create_symbol,
    prefer_reel: int | None = None,
    rng: random.Random | None = None,
) -> list[dict]:
    """Leave at most one SW on the board.

    Column choice is uniform among reels that have SW (not weighted by how many
    SW cells sit on a reel — avoids bias to denser / last columns).
    """
    hits = find_super_wilds(board)
    if len(hits) <= 1:
        return hits
    rng = rng or random
    keep = None
    if prefer_reel is not None:
        preferred = [h for h in hits if h["reel"] == prefer_reel]
        if preferred:
            keep = rng.choice(preferred)
    if keep is None:
        reels_with_sw = sorted({h["reel"] for h in hits})
        chosen_reel = rng.choice(reels_with_sw)
        keep = rng.choice([h for h in hits if h["reel"] == chosen_reel])
    for h in hits:
        if h is keep:
            continue
        board[h["reel"]][h["row"]] = create_symbol("L2")
    return [keep]


def pick_sticky_sw_column(num_reels: int, mult_weights: dict, rng: random.Random | None = None) -> tuple[int, int]:
    """Choose sticky SW reel + multiplier for Super Bonus (any of the 5 columns)."""
    rng = rng or random
    reel = rng.randrange(int(num_reels))  # 0..num_reels-1 — любая колонка
    mult = int(get_random_outcome(mult_weights))
    return reel, max(1, mult)


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
