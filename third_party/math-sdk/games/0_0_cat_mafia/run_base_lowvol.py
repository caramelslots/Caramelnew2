"""Base-only M5 after low-vol + paw fence changes.

  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  /tmp/csmath_venv/bin/python run_base_lowvol.py
"""

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":
    num_threads = 1
    rust_threads = 20
    batching_size = 2000
    compression = True
    profiling = False

    num_sim_args = {"base": int(1e5)}
    target_modes = ["base"]

    config = GameConfig()
    gamestate = GameState(config)
    optimization_setup_class = OptimizationSetup(config)

    create_books(
        gamestate,
        config,
        num_sim_args,
        batching_size,
        num_threads,
        compression,
        profiling,
    )
    generate_configs(gamestate)
    OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
    generate_configs(gamestate)

    custom_keys = [
        {"symbol": "scatter"},
        {"kind": 5, "symbol": "W"},
        {"kind": 5, "symbol": "H1"},
    ]
    create_stat_sheet(gamestate, custom_keys=custom_keys)
    print("base low-vol M5 done")
