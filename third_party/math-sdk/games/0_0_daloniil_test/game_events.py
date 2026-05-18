"""Cash Stacks specific book-events.

Mirrors the JS-side definitions в
  apps/daloniil_test/src/game/typesBookEvent.ts

Each function appends a fully-formed event dict to gamestate.book.events
(совместимо с базовыми SDK событиями).

NB: Все позиции (`reel`, `row`) — в padded-coordinates (row=0 = top padding),
поэтому здесь применяем `+1` при необходимости (см. include_padding в SDK).
"""

BONUS_COLLECT = "bonusCollect"
LADDER_TIER_UP = "ladderTierUp"
MYSTERY_REEL_ACTIVATE = "mysteryReelActivate"
MYSTERY_REEL_UNLOCK = "mysteryReelUnlock"
MYSTERY_REVEAL = "mysteryReveal"


def _pad_positions(gamestate, positions: list[dict]) -> list[dict]:
    """Учесть top-padding row для клиента (как делают стандартные SDK events)."""
    if not gamestate.config.include_padding:
        return positions
    return [{"reel": p["reel"], "row": p["row"] + 1} for p in positions]


def bonus_collect_event(gamestate, positions: list[dict], collected_total: int, collected_delta: int) -> None:
    """Игрок собрал Bonus символы в текущем FS-цикле.

    positions       — реальные клетки B на доске (raw row, без padding)
    collected_total — общее число собранных Bonus за весь FS
    collected_delta — число собранных на этом спине
    """
    event = {
        "index": len(gamestate.book.events),
        "type": BONUS_COLLECT,
        "positions": _pad_positions(gamestate, positions),
        "collectedTotal": int(collected_total),
        "collectedDelta": int(collected_delta),
    }
    gamestate.book.add_event(event)


def ladder_tier_up_event(
    gamestate,
    previous_tier: int,
    new_tier: int,
    reward_spins: int,
    rewarded_mystery_reels: int = 0,
) -> None:
    """Достигнут новый Tier на Progress Ladder."""
    event = {
        "index": len(gamestate.book.events),
        "type": LADDER_TIER_UP,
        "previousTier": int(previous_tier),
        "newTier": int(new_tier),
        "rewardSpins": int(reward_spins),
        "rewardedMysteryReels": int(rewarded_mystery_reels),
    }
    gamestate.book.add_event(event)


def mystery_reel_activate_event(gamestate, reels: list[int], persistent: bool = True) -> None:
    """Активируется Sticky Mystery Reel(s) на FS."""
    event = {
        "index": len(gamestate.book.events),
        "type": MYSTERY_REEL_ACTIVATE,
        "reels": [int(r) for r in reels],
        "persistent": bool(persistent),
    }
    gamestate.book.add_event(event)


def mystery_reel_unlock_event(
    gamestate,
    reels: list[int],
    tier_after: int,
    reward_spins: int,
) -> None:
    """Celebration-событие при unlock-е новых Sticky Mystery Reel(s) через
    Progress Ladder (collect 4 B = +1 reel).

    Отдельное от mystery_reel_activate_event:
        - activate = технический факт «reel помечен sticky»
        - unlock = семантический «игрок выиграл/разблокировал награду»
    Frontend подписывается на unlock для full-screen overlay-анимации
    (см. REDESIGN_PLAN §2.5.2 — MysteryReelUnlockOverlay.svelte).
    """
    event = {
        "index": len(gamestate.book.events),
        "type": MYSTERY_REEL_UNLOCK,
        "reels": [int(r) for r in reels],
        "tierAfter": int(tier_after),
        "rewardSpins": int(reward_spins),
    }
    gamestate.book.add_event(event)


def mystery_reveal_event(gamestate, revealed_symbol: str, positions: list[dict]) -> None:
    """Mystery символы раскрылись в обычный символ.

    positions — все клетки M на барабане (raw row, без padding).
    """
    event = {
        "index": len(gamestate.book.events),
        "type": MYSTERY_REVEAL,
        "revealedSymbol": revealed_symbol,
        "positions": _pad_positions(gamestate, positions),
    }
    gamestate.book.add_event(event)
