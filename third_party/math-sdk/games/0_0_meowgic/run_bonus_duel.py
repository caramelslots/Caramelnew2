"""M5 / smoke runner for bonus_duel_cat + bonus_duel_dog.

Usage (from this directory):
  export PYTHONPATH=../..:.
  export PATH="$HOME/.cargo/bin:$PATH"
  /tmp/csmath_venv/bin/python run_bonus_duel.py 2>&1 | tee /tmp/m5_bonus_duel.log

Dev smoke (small N): set NUM_SIMS=200 before running.
Optional: MODE=bonus_duel_cat|bonus_duel_dog to run one side only.
Threads: NUM_THREADS=20 (create_books), RUST_THREADS=20 (opt only).

Sim-time (default):
  DUEL_INTRIGUE=1      — stamp intrigueShape from honest path (no reorder/scale/pad)
  DUEL_COMP_QUOTAS=1   — retry empty loses / steamroll wins toward bank TARGET windows
  DUEL_LOSE_MIRROR=0   — off; do not inflate banks after sim

After intrigue/board fix — duel-only pipeline (no full M5): see MATH_COMMANDS.md §3c.
After opt (weighted LUT), before resample — SMOOTH · VH body check / fix:
  $PY tools/duel_payout_histogram.py --lut-dir library/publish_files
  $PY tools/match_duel_win_body.py --mode bonus_duel_cat --lut-dir library/publish_files
  $PY tools/match_duel_win_body.py --mode bonus_duel_dog --lut-dir library/publish_files
  $PY tools/duel_intrigue_metrics.py
  $PY tools/assert_duel_invariants.py
  $PY tools/resample_books.py --100k --modes bonus_duel_cat,bonus_duel_dog
See CatMafia_Duel_SMOOTH_VH_Implementation_Plan.md phases B + A.
"""

import os

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":
    num_threads = int(os.environ.get("NUM_THREADS", "20"))
    rust_threads = int(os.environ.get("RUST_THREADS", "20"))
    batching_size = 500
    compression = True
    n = int(os.environ.get("NUM_SIMS", str(int(1e5))))
    run_opt = os.environ.get("RUN_OPT", "1") != "0"
    mode = os.environ.get("MODE", "").strip()
    if mode in {"bonus_duel_cat", "bonus_duel_dog"}:
        num_sim_args = {mode: n}
    else:
        num_sim_args = {"bonus_duel_cat": n, "bonus_duel_dog": n}
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
        batching_size,
        num_threads,
        compression,
        False,
    )
    generate_configs(gamestate)
    if run_opt:
        print("=== optimize ===")
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)
    print("=== done ===")
    print(
        "Next (SMOOTH · VH + intrigue): duel_payout_histogram.py → "
        "match_duel_win_body.py (win+lose) → duel_intrigue_metrics.py → "
        "assert_duel_invariants.py → resample_books.py"
    )
