"""Duel competition targets + sim accept/reject (honest path only).

Used by:
  - gamestate.run_duel — retry empty loses / steamroll wins
  - tools/match_duel_competition.py — LUT reweight shares + bank soft targets
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

TARGETS_PATH = Path(__file__).resolve().parent / "tools" / "duel_competition_targets.json"


def competition_enabled() -> bool:
    return os.environ.get("DUEL_COMP_QUOTAS", "1") != "0"


@lru_cache(maxsize=1)
def load_targets() -> dict[str, Any]:
    if not TARGETS_PATH.exists():
        return {}
    return json.loads(TARGETS_PATH.read_text(encoding="utf-8"))


def mode_bank_targets(mode: str) -> dict[str, tuple[float, float]]:
    raw = (load_targets().get("modes") or {}).get(mode) or {}
    out: dict[str, tuple[float, float]] = {}
    for key in ("win", "lose"):
        block = raw.get(key) or {}
        out[key] = (float(block.get("player") or 0), float(block.get("opp") or 0))
    return out


def share_targets() -> dict[str, float]:
    shares = load_targets().get("shares") or {}
    return {
        "CLOSE": float(shares.get("CLOSE", 0.3)),
        "MEDIUM": float(shares.get("MEDIUM", 0.45)),
        "BLOWOUT": float(shares.get("BLOWOUT", 0.25)),
    }


def lead_then_lose_target() -> float:
    return float(load_targets().get("lead_then_lose_of_loses") or 0.4)


def sim_settings() -> dict[str, Any]:
    return dict(load_targets().get("sim") or {})


def _player_opp_banks(
    dog_total: float, cat_total: float, player_side: str
) -> tuple[float, float]:
    if player_side == "cat":
        return float(cat_total), float(dog_total)
    return float(dog_total), float(cat_total)


def competition_score(
    *,
    mode: str,
    player_won: bool,
    dog_total: float,
    cat_total: float,
    player_side: str,
) -> float:
    """Higher = closer to bank TARGET for this outcome."""
    banks = mode_bank_targets(mode)
    key = "win" if player_won else "lose"
    tp, to = banks.get(key, (0.0, 0.0))
    if tp <= 0 or to <= 0:
        return 0.0
    p, o = _player_opp_banks(dog_total, cat_total, player_side)
    # Relative squared error; prefer both sides present
    sp = max(20.0, tp * 0.5)
    so = max(20.0, to * 0.5)
    err = ((p - tp) / sp) ** 2 + ((o - to) / so) ** 2
    return float(-err)


def competition_accept(
    *,
    mode: str,
    player_won: bool,
    dog_total: float,
    cat_total: float,
    player_side: str,
) -> bool:
    """Whether this honest outcome is competitive enough to keep without retry.

    Floors are anti-empty / anti-steamroll gates on the natural duel distribution.
    Soft TARGET bank means (277↔180 etc.) are handled by §3c LUT weights, not here.
    """
    if not competition_enabled():
        return True
    banks = mode_bank_targets(mode)
    sim = sim_settings()
    key = "win" if player_won else "lose"
    tp, to = banks.get(key, (0.0, 0.0))
    p, o = _player_opp_banks(dog_total, cat_total, player_side)

    # Prefer absolute mins when set (tuned to BR_DUEL natural banks).
    if player_won:
        if "win_opp_min" in sim:
            return o >= float(sim["win_opp_min"])
        if tp <= 0 or to <= 0:
            return True
        opp_min = to * float(sim.get("win_opp_min_frac") or 0.45)
        return o >= opp_min

    if "lose_player_min" in sim or "lose_opp_min" in sim:
        player_min = float(sim.get("lose_player_min") or 0)
        opp_min = float(sim.get("lose_opp_min") or 0)
        return p >= player_min and o >= opp_min
    if tp <= 0 or to <= 0:
        return True
    player_min = tp * float(sim.get("lose_player_min_frac") or 0.35)
    opp_min = to * float(sim.get("lose_opp_min_frac") or 0.45)
    return p >= player_min and o >= opp_min
