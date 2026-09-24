"""SMOOTH · VH victory pot helpers — win payout body + lose-mirror.

On duel_lose the player payout stays 0, but the session pot
(dogTotal + catTotal) should follow the same band weights as wins.
"""

from __future__ import annotations

import json
import os
import random
from pathlib import Path
from typing import Any

TARGETS_PATH = Path(__file__).resolve().parent / "tools" / "duel_smooth_vh_targets.json"

# Mode name as used by betmodes / LUT files.
MODE_CAT = "bonus_duel_cat"
MODE_DOG = "bonus_duel_dog"


def lose_mirror_enabled() -> bool:
    return os.environ.get("DUEL_LOSE_MIRROR", "1") != "0"


def _q(value: float) -> float:
    """RGS payout step: 0.1× bet."""
    return round(float(value), 1)


def load_targets(path: Path | None = None) -> dict[str, Any]:
    p = path or TARGETS_PATH
    return json.loads(p.read_text(encoding="utf-8"))


def bands_for_mode(mode: str, targets: dict[str, Any] | None = None) -> list[dict]:
    data = targets if targets is not None else load_targets()
    key = mode if mode in data else MODE_CAT
    return list(data[key]["bands"])


def mode_from_player_side(player_side: str) -> str:
    return MODE_DOG if player_side == "dog" else MODE_CAT


def sample_victory_pot(bands: list[dict], rng: random.Random) -> float:
    """Sample a pot (bet multiples) from SMOOTH · VH band shares."""
    rigid = [b for b in bands if not b.get("flexible")]
    pool = rigid if rigid else bands
    weights = [max(1e-9, float(b["share"])) for b in pool]
    band = rng.choices(pool, weights=weights, k=1)[0]
    lo, hi = float(band["lo"]), float(band["hi"])
    # Cap open-ended / huge hi for sampling; leave true max to rare flexible draws.
    if hi >= 25000:
        hi = min(hi, max(lo + 50.0, lo * 1.5 + 200.0))
    if hi <= lo:
        return _q(lo)
    # Uniform within band; keep ≥ lo and < hi when hi is exclusive-ish.
    x = rng.uniform(lo, max(lo + 0.1, hi - 0.05))
    return _q(max(lo, x))


def scale_banks_to_pot(
    dog: float,
    cat: float,
    winner: str,
    target_pot: float,
) -> tuple[float, float]:
    """Scale banks to target pot; preserve winner; min gap 0.1×."""
    target_pot = _q(max(0.2, target_pot))
    dog, cat = _q(dog), _q(cat)
    pot = _q(dog + cat)

    if pot <= 0:
        if winner == "dog":
            dog, cat = _q(target_pot * 0.55), _q(target_pot * 0.45)
        else:
            cat, dog = _q(target_pot * 0.55), _q(target_pot * 0.45)
    else:
        scale = target_pot / pot
        dog = _q(dog * scale)
        cat = _q(cat * scale)

    # Fix rounding drift on pot.
    drift = _q(target_pot - (dog + cat))
    if drift != 0:
        if winner == "dog":
            dog = _q(dog + drift)
        else:
            cat = _q(cat + drift)

    # Enforce winner + no tie.
    if winner == "dog":
        if dog <= cat:
            dog = _q(cat + 0.1)
    else:
        if cat <= dog:
            cat = _q(dog + 0.1)

    # If we nudged winner past target, trim loser (keep pot near target when possible).
    pot2 = _q(dog + cat)
    if pot2 > target_pot + 0.05:
        excess = _q(pot2 - target_pot)
        if winner == "dog":
            cat = _q(max(0.0, cat - excess))
            if dog <= cat:
                dog = _q(cat + 0.1)
        else:
            dog = _q(max(0.0, dog - excess))
            if cat <= dog:
                cat = _q(dog + 0.1)

    return _q(dog), _q(cat)


def maybe_mirror_lose_pot(
    dog: float,
    cat: float,
    winner: str,
    player_won: bool,
    player_side: str,
    rng: random.Random,
    bands: list[dict] | None = None,
) -> tuple[float, float, float | None]:
    """On lose, resample pot from SMOOTH bands. Returns (dog, cat, target_or_None)."""
    if player_won or not lose_mirror_enabled():
        return _q(dog), _q(cat), None
    if bands is None:
        bands = bands_for_mode(mode_from_player_side(player_side))
    target = sample_victory_pot(bands, rng)
    dog2, cat2 = scale_banks_to_pot(dog, cat, winner, target)
    return dog2, cat2, target


def victory_amount_from_end(end: dict) -> float:
    """Pot in bet multiples from duelEnd cents fields."""
    dog = int(end.get("dogTotal") or 0)
    cat = int(end.get("catTotal") or 0)
    return (dog + cat) / 100.0


def band_index_for(x: float, bands: list[dict]) -> int | None:
    if x <= 0:
        return None
    for i, b in enumerate(bands):
        lo, hi = float(b["lo"]), float(b["hi"])
        if hi >= 25000:
            if x >= lo:
                return i
        elif lo <= x < hi:
            return i
    return None
