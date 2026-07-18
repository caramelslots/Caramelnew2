"""M5 for bonus_normal + bonus_super only (medium-vol retune).

Usage (from this directory):
  export PYTHONPATH=../..:.
  export PATH="$HOME/.cargo/bin:$PATH"
  /tmp/csmath_venv/bin/python run_bonus_medvol.py 2>&1 | tee /tmp/m5_bonus_medvol.log
"""

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":
    num_threads = 1
    rust_threads = 20
    batching_size = 2000
    compression = True
    num_sim_args = {
        "bonus_normal": int(1e5),
        "bonus_super": int(1e5),
    }
    target_modes = list(num_sim_args.keys())

    config = GameConfig()
    gamestate = GameState(config)
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
    print("=== optimize ===")
    OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
    generate_configs(gamestate)
    print("=== done ===")
