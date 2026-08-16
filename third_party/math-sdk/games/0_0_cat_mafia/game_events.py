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
