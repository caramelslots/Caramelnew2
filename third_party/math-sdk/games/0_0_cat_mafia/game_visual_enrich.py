"""Cosmetic board enrich: more high symbols in non-paying noise only.

Hard invariants:
- Winning paylines (symbol / kind / positions / amounts) stay identical
- Paw coin totals stay identical
- Post-SW-expand line wins stay identical
- Special symbols (W/SW/PB/PS/PG/B/BT/M) are never rewritten

Only L1–L4 cells outside locked positions may become H1–H4.
"""

from __future__ import annotations

import random
from typing import Callable, Optional

from src.calculations.lines import Lines

from game_features import (
    build_paw_resolve,
    expand_sw_columns,
    find_paws,
    find_super_wilds,
)

LOW_SYMBOLS = ("L1", "L2", "L3", "L4")
HIGH_SYMBOLS = ("H1", "H2", "H3", "H4")
PROTECTED_SYMBOLS = frozenset({"W", "SW", "PB", "PS", "PG", "B", "BT", "M"})

# Target share of highs among L+H on the visible board (Hell Hot ref ≈ 48%).
TARGET_HIGH_SHARE = 0.48

# Prefer mid/high visuals slightly; all highs allowed.
HIGH_PICK_WEIGHTS = {"H4": 3, "H3": 3, "H2": 2, "H1": 2}


def _sym_name(cell) -> str:
    return cell.name if hasattr(cell, "name") else str(cell)


def _clone_board(board, create_symbol: Callable[[str], object]):
    out = []
    for col in board:
        new_col = []
        for cell in col:
            name = _sym_name(cell)
            sym = create_symbol(name)
            mult = getattr(cell, "multiplier", None)
            if name == "SW" and mult is not None:
                sym.assign_attribute({"multiplier": int(mult)})
            new_col.append(sym)
        out.append(new_col)
    return out


def _neutralize_sw_mults(board) -> list[tuple]:
    saved = []
    for reel, col in enumerate(board):
        for row, cell in enumerate(col):
            if _sym_name(cell) != "SW":
                continue
            prev = getattr(cell, "multiplier", None) or 1
            saved.append((reel, row, int(prev)))
            cell.assign_attribute({"multiplier": 1})
    return saved


def _restore_sw_mults(board, saved: list[tuple]) -> None:
    for reel, row, mult in saved:
        board[reel][row].assign_attribute({"multiplier": int(mult)})


def _lines_fingerprint(board, config, global_multiplier: int) -> tuple:
    saved = _neutralize_sw_mults(board)
    try:
        win_data = Lines.get_lines(board, config, global_multiplier=global_multiplier)
    finally:
        _restore_sw_mults(board, saved)

    wins = []
    for w in win_data.get("wins") or []:
        pos = tuple((int(p["reel"]), int(p["row"])) for p in (w.get("positions") or []))
        meta = w.get("meta") or {}
        wins.append(
            (
                w.get("symbol"),
                int(w.get("kind") or 0),
                round(float(w.get("win") or 0), 2),
                pos,
                meta.get("lineIndex"),
            )
        )
    return (round(float(win_data.get("totalWin") or 0), 2), tuple(sorted(wins)))


def _paw_fingerprint(board) -> tuple:
    _paws, rows, total = build_paw_resolve(board, bet=1.0)
    cells = []
    for row_payload in rows:
        row = int(row_payload["row"])
        for c in row_payload.get("cells") or []:
            cells.append(
                (
                    int(c["reel"]),
                    row,
                    c.get("from"),
                    int(c.get("coinTier") or 0),
                    round(float(c.get("win") or 0), 2),
                )
            )
    return (round(float(total), 2), tuple(cells))


def _sw_post_expand_fingerprint(board, create_symbol, config, global_multiplier: int) -> tuple | None:
    sw_hits = find_super_wilds(board)
    if not sw_hits:
        return None
    cloned = _clone_board(board, create_symbol)
    hits = find_super_wilds(cloned)
    expand_sw_columns(cloned, create_symbol, hits)
    return _lines_fingerprint(cloned, config, global_multiplier)


def _outcome_fingerprint(board, create_symbol, config, global_multiplier: int) -> tuple:
    return (
        _lines_fingerprint(board, config, global_multiplier),
        _paw_fingerprint(board),
        _sw_post_expand_fingerprint(board, create_symbol, config, global_multiplier),
    )


def _winning_positions(board, config, global_multiplier: int) -> set[tuple[int, int]]:
    saved = _neutralize_sw_mults(board)
    try:
        win_data = Lines.get_lines(board, config, global_multiplier=global_multiplier)
    finally:
        _restore_sw_mults(board, saved)
    pos: set[tuple[int, int]] = set()
    for w in win_data.get("wins") or []:
        for p in w.get("positions") or []:
            pos.add((int(p["reel"]), int(p["row"])))
    return pos


def _paw_locked_positions(board) -> set[tuple[int, int]]:
    paws = find_paws(board)
    if not paws:
        return set()
    # Lock every row the paw coin(s) will convert (1/2/3 rows by type),
    # not just the row the paw sits on.
    _p, rows_payload, _t = build_paw_resolve(board, bet=1.0)
    rows = {int(r["row"]) for r in rows_payload}
    locked: set[tuple[int, int]] = set()
    for reel, col in enumerate(board):
        for row in rows:
            if 0 <= row < len(col):
                locked.add((reel, row))
    return locked


def _board_lh_counts(board) -> tuple[int, int]:
    low = high = 0
    for col in board:
        for cell in col:
            name = _sym_name(cell)
            if name in LOW_SYMBOLS:
                low += 1
            elif name in HIGH_SYMBOLS:
                high += 1
    return low, high


def _pick_high(rng: random.Random) -> str:
    names = list(HIGH_PICK_WEIGHTS.keys())
    weights = [HIGH_PICK_WEIGHTS[n] for n in names]
    return rng.choices(names, weights=weights, k=1)[0]


def enrich_board_non_winning(
    board,
    config,
    create_symbol: Callable[[str], object],
    *,
    create_symbol_raw: Optional[Callable[[str], object]] = None,
    global_multiplier: int = 1,
    target_high_share: float = TARGET_HIGH_SHARE,
    rng: Optional[random.Random] = None,
) -> int:
    """Upgrade non-paying L→H until high share ≈ target. Returns replacements applied.

    create_symbol_raw: symbol factory that must NOT consume game RNG (no SW mult rolls).
    Used only for outcome-safety clones. Board edits use create_symbol (L→H only).
    """
    rng = rng or random.Random()
    raw_create = create_symbol_raw or create_symbol
    low, high = _board_lh_counts(board)
    lh = low + high
    if lh <= 0:
        return 0

    target_high = int(round(target_high_share * lh))
    need = target_high - high
    if need <= 0:
        return 0

    locked = _winning_positions(board, config, global_multiplier) | _paw_locked_positions(board)
    eligible: list[tuple[int, int]] = []
    for reel, col in enumerate(board):
        for row, cell in enumerate(col):
            name = _sym_name(cell)
            if name not in LOW_SYMBOLS:
                continue
            if (reel, row) in locked:
                continue
            if name in PROTECTED_SYMBOLS:
                continue
            eligible.append((reel, row))

    if not eligible:
        return 0

    rng.shuffle(eligible)
    baseline = _outcome_fingerprint(board, raw_create, config, global_multiplier)
    applied = 0

    for reel, row in eligible:
        if applied >= need:
            break
        prev = board[reel][row]
        prev_name = _sym_name(prev)
        new_name = _pick_high(rng)
        board[reel][row] = create_symbol(new_name)
        if _outcome_fingerprint(board, raw_create, config, global_multiplier) != baseline:
            board[reel][row] = prev if hasattr(prev, "name") else create_symbol(prev_name)
            continue
        applied += 1

    return applied


def enrich_padding_symbols(
    top_symbols,
    bottom_symbols,
    create_symbol: Callable[[str], object],
    *,
    sticky_sw_reels: Optional[set[int]] = None,
    target_high_share: float = TARGET_HIGH_SHARE,
    rng: Optional[random.Random] = None,
) -> int:
    """Cosmetic enrich for top/bottom padding only (never affects line eval)."""
    rng = rng or random.Random()
    sticky = sticky_sw_reels or set()
    pads = []
    if top_symbols:
        pads.append(top_symbols)
    if bottom_symbols:
        pads.append(bottom_symbols)
    if not pads:
        return 0

    cells: list[tuple[list, int]] = []
    low = high = 0
    for pad in pads:
        for reel, cell in enumerate(pad):
            if reel in sticky:
                continue
            name = _sym_name(cell)
            if name in PROTECTED_SYMBOLS:
                continue
            if name in LOW_SYMBOLS:
                low += 1
                cells.append((pad, reel))
            elif name in HIGH_SYMBOLS:
                high += 1

    lh = low + high
    if lh <= 0 or not cells:
        return 0
    need = int(round(target_high_share * lh)) - high
    if need <= 0:
        return 0

    rng.shuffle(cells)
    applied = 0
    for pad, reel in cells:
        if applied >= need:
            break
        pad[reel] = create_symbol(_pick_high(rng))
        applied += 1
    return applied
