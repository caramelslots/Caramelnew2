"""Quick smoke test — small sims, print event types."""

import json
import os
import traceback

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books


def main():
    config = GameConfig()
    gs = GameState(config)
    print(
        "config ok",
        config.game_id,
        config.num_rows,
        len(config.paylines),
        [b.get_name() for b in config.bet_modes],
    )
    try:
        create_books(
            gs,
            config,
            {"base": 40, "bonus_normal": 15},
            40,
            1,
            False,
            False,
        )
    except Exception:
        traceback.print_exc()
        raise

    bp = gs.output_files.book_path
    print("books written to", bp)
    for name in sorted(os.listdir(bp)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(bp, name)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        etypes = set()
        for book in data:
            events = book.get("events") or book.get("state") or []
            for ev in events:
                if isinstance(ev, dict):
                    etypes.add(ev.get("type"))
        print(f"{name}: {len(data)} books; events={sorted(t for t in etypes if t)}")


if __name__ == "__main__":
    main()
