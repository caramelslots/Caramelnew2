"""Small all-modes sim — same as run.py, but tiny N and no opt/analysis.

Usage (from this directory):
  export PYTHONPATH=../..:.
  NUM_SIMS=200 /tmp/csmath_venv/bin/python run_small.py

Optional:
  NUM_SIMS=1000          # default 200
  RUN_OPT=1              # also run optimizer (slower)
"""

import os

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":
    n = int(os.environ.get("NUM_SIMS", "200"))
    run_opt = os.environ.get("RUN_OPT", "0") == "1"

    num_sim_args = {
        "base": n,
        "bonus_boost": n,
        "bonus_normal": n,
        "bonus_super": n,
        "bonus_duel_cat": n,
        "bonus_duel_dog": n,
    }
    target_modes = list(num_sim_args.keys())

    config = GameConfig()
    gamestate = GameState(config)
    if run_opt:
        OptimizationSetup(config)

    print("=== create_books", num_sim_args, "===")
    create_books(
        gamestate,
        config,
        num_sim_args,
        min(500, n),
        1,
        True,
        False,
    )
    generate_configs(gamestate)

    if run_opt:
        print("=== optimize ===")
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads=20)
        generate_configs(gamestate)

    print("=== done (small all-modes) ===")
