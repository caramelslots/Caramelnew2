"""Main file для генерации результатов Cat Mafia (0_0_cat_mafia).

Запуск:
  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  /tmp/csmath_venv/bin/python run.py
"""

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs


if __name__ == "__main__":

    num_threads = 1
    rust_threads = 20
    batching_size = 2000
    compression = True
    profiling = False

    # M5: 1e5 per mode (~10–20 мин). M6 production: bump to 1e6.
    # Dev smoke: use smoke_test.py or temporarily lower these to 1e4.
    num_sim_args = {
        "base": int(1e5),
        "bonus_boost": int(1e5),
        "bonus_normal": int(1e5),
        "bonus_super": int(1e5),
    }

    run_conditions = {
        "run_sims": True,
        "run_optimization": True,  # required to pull RTP toward ~96%
        "run_analysis": True,
        "run_format_checks": True,
    }
    target_modes = list(num_sim_args.keys())

    config = GameConfig()
    gamestate = GameState(config)

    if run_conditions["run_optimization"] or run_conditions["run_analysis"]:
        optimization_setup_class = OptimizationSetup(config)

    if run_conditions["run_sims"]:
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

    if run_conditions["run_optimization"]:
        OptimizationExecution().run_all_modes(config, target_modes, rust_threads)
        generate_configs(gamestate)

    if run_conditions["run_analysis"]:
        custom_keys = [
            {"symbol": "scatter"},
            {"kind": 5, "symbol": "W"},
            {"kind": 5, "symbol": "H1"},
        ]
        create_stat_sheet(gamestate, custom_keys=custom_keys)

    if run_conditions["run_format_checks"]:
        execute_all_tests(config)
