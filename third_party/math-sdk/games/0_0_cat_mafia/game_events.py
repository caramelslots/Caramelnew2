"""Cat Mafia book-events — mirrors web-sdk apps/cat_mafia typesBookEvent.ts."""

PAW_COIN_RESOLVE = "pawCoinResolve"
SUPER_WILD_EXPAND = "superWildExpand"
FREE_SPIN_TARGET_PICK = "freeSpinTargetPick"
BULLET_COLLECT = "bulletCollect"
TARGET_SHOOT_ROUND = "targetShootRound"


def _pad_positions(gamestate, positions: list[dict]) -> list[dict]:
    if not gamestate.config.include_padding:
        return positions
    return [{"reel": p["reel"], "row": p["row"] + 1} for p in positions]


def paw_coin_resolve_event(gamestate, paws: list[dict], rows: list[dict], total_coin_win: float) -> None:
    """Paw converts row(s) into coins. Positions use raw (unpadded) rows."""
    padded_rows = []
    for row in rows:
        padded_rows.append(
            {
                "row": row["row"] + (1 if gamestate.config.include_padding else 0),
                "cells": [
                    {
                        "reel": c["reel"],
                        "from": c["from"],
                        "coinTier": c["coinTier"],
                        "win": int(round(c["win"] * 100)),
                    }
                    for c in row["cells"]
                ],
            }
        )
    pad = 1 if gamestate.config.include_padding else 0
    event = {
        "index": len(gamestate.book.events),
        "type": PAW_COIN_RESOLVE,
        "paws": [
            {"reel": p["reel"], "row": p["row"] + pad, "kind": p.get("kind", "bronze")}
            for p in paws
        ],
        "rows": padded_rows,
        "totalCoinWin": int(round(total_coin_win * 100)),
    }
    gamestate.book.add_event(event)


def super_wild_expand_event(gamestate, expands: list[dict], product_mult: int) -> None:
    padded = []
    for e in expands:
        padded.append(
            {
                "reel": e["reel"],
                "row": e["row"] + (1 if gamestate.config.include_padding else 0),
                "mult": int(e["mult"]),
            }
        )
    event = {
        "index": len(gamestate.book.events),
        "type": SUPER_WILD_EXPAND,
        "expands": padded,
        "productMult": int(product_mult),
    }
    gamestate.book.add_event(event)


def free_spin_target_pick_event(
    gamestate,
    targets: list[int],
    chosen_index: int,
    awarded_fs: int,
) -> None:
    event = {
        "index": len(gamestate.book.events),
        "type": FREE_SPIN_TARGET_PICK,
        "targets": [int(t) for t in targets],
        "chosenIndex": int(chosen_index),
        "awardedFs": int(awarded_fs),
    }
    gamestate.book.add_event(event)


def bullet_collect_event(gamestate, bullets: list[dict], drum_count: int) -> None:
    event = {
        "index": len(gamestate.book.events),
        "type": BULLET_COLLECT,
        "bullets": _pad_positions(gamestate, bullets),
        "drumCount": int(drum_count),
    }
    gamestate.book.add_event(event)


def target_shoot_round_event(gamestate, shots: list[dict], extra_fs: int) -> None:
    event = {
        "index": len(gamestate.book.events),
        "type": TARGET_SHOOT_ROUND,
        "shots": [
            {"targetIndex": int(s["targetIndex"]), "reward": int(s["reward"])} for s in shots
        ],
        "extraFs": int(extra_fs),
    }
    gamestate.book.add_event(event)


# === Duel bonus (buy-only dual board session) ===

DUEL_START = "duelStart"
DUEL_SPIN = "duelSpin"
DUEL_BANK_UPDATE = "duelBankUpdate"
DUEL_END = "duelEnd"


def duel_start_event(
    gamestate,
    total_spins_per_side: int = 10,
    player_side: str = "cat",
) -> None:
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": DUEL_START,
            "totalSpinsPerSide": int(total_spins_per_side),
            "playerSide": player_side,
        }
    )


def duel_spin_event(
    gamestate,
    side: str,
    spin_index: int,
    board: list,
    spin_win: float,
    wins: list | None = None,
    total_win: float | None = None,
) -> None:
    """One side spin. board is visible 5×4 (no padding). Amounts in bet multiples → cents."""
    from copy import deepcopy

    event = {
        "index": len(gamestate.book.events),
        "type": DUEL_SPIN,
        "side": side,
        "spinIndex": int(spin_index),
        "board": board,
        "spinWin": int(round(spin_win * 100)),
    }
    if wins:
        wins_out = deepcopy(wins)
        for w in wins_out:
            # Pixi reel pool uses padded rows (top pad → visible row 0 is index 1).
            w["positions"] = [
                {"reel": p["reel"], "row": p["row"] + 1} for p in w.get("positions") or []
            ]
            w["win"] = int(round(min(float(w.get("win") or 0), gamestate.config.wincap) * 100))
            if "meta" in w and "winWithoutMult" in w["meta"]:
                w["meta"]["winWithoutMult"] = int(
                    round(min(float(w["meta"]["winWithoutMult"]), gamestate.config.wincap) * 100)
                )
        tw = float(total_win if total_win is not None else spin_win)
        event["wins"] = wins_out
        event["totalWin"] = int(round(min(tw, gamestate.config.wincap) * 100))
    gamestate.book.add_event(event)


def duel_bank_update_event(
    gamestate,
    side: str,
    spin_win: float,
    side_total: float,
    dog_total: float,
    cat_total: float,
) -> None:
    gamestate.book.add_event(
        {
            "index": len(gamestate.book.events),
            "type": DUEL_BANK_UPDATE,
            "side": side,
            "spinWin": int(round(spin_win * 100)),
            "sideTotal": int(round(side_total * 100)),
            "dogTotal": int(round(dog_total * 100)),
            "catTotal": int(round(cat_total * 100)),
        }
    )


def duel_end_event(
    gamestate,
    dog_total: float,
    cat_total: float,
    winner: str,
    payout: float,
    win_level: int | None = None,
    player_side: str | None = None,
    player_won: bool | None = None,
) -> None:
    event = {
        "index": len(gamestate.book.events),
        "type": DUEL_END,
        "dogTotal": int(round(dog_total * 100)),
        "catTotal": int(round(cat_total * 100)),
        "winner": winner,
        "payout": int(round(payout * 100)),
    }
    if player_side is not None:
        event["playerSide"] = player_side
    if player_won is not None:
        event["playerWon"] = bool(player_won)
    if win_level is not None:
        event["winLevel"] = int(win_level)
    gamestate.book.add_event(event)
