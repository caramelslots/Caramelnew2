"""Re-optimize bonus_boost only (ETL40 fix) using existing sims.

Usage:
  export PYTHONPATH=../..:.
  export PATH="$HOME/.cargo/bin:$PATH"
  /tmp/csmath_venv/bin/python run_bonus_boost_etl.py 2>&1 | tee /tmp/bonus_boost_etl.log
"""

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":
    rust_threads = 20
    config = GameConfig()
    gamestate = GameState(config)
    OptimizationSetup(config)
    # Required before Rust opt — writes fences/bias into math_config.json.
    generate_configs(gamestate)

    print("=== optimize bonus_boost (ETL40 retune) ===")
    OptimizationExecution().run_all_modes(config, ["bonus_boost"], rust_threads)
    generate_configs(gamestate)
    print("=== done ===")
