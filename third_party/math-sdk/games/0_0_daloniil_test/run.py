"""Main file для генерации результатов Cash Stacks (daloniil_test).

Запуск:
  cd third_party/math-sdk/games/0_0_daloniil_test
  python3 run.py

Sim counts уменьшены до 1e3 для быстрой проверки. Для production-симуляции
поднять до 1e6+ в каждом режиме.
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

    # M5 intermediate (1e5 sims per mode) — ~10-15 минут.
    # Production target: 1e6 (см. MATH_BLOCKERS.md M5).
    num_sim_args = {
        "base": int(1e5),
        "bonus_boost": int(1e5),
        "special_spins": int(1e5),
        "bonus_normal": int(1e5),
        "bonus_super": int(1e5),
    }

    run_conditions = {
        "run_sims": True,
        "run_optimization": True,
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
        # Cash Stacks-custom analytics keys:
        custom_keys = [
            {"symbol": "scatter"},  # Bonus collects
            {"kind": 5, "symbol": "W"},  # Wild ×5
            {"kind": 5, "symbol": "H1"},  # H1 ×5
        ]
        create_stat_sheet(gamestate, custom_keys=custom_keys)

    if run_conditions["run_format_checks"]:
        execute_all_tests(config)
