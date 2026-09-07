"""M5 for base + bonus_boost only (buy bonuses unchanged).

  cd third_party/math-sdk/games/0_0_cat_mafia
  export PYTHONPATH=../..:.
  /tmp/csmath_venv/bin/python run_base_boost.py
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

    num_sim_args = {
        "base": int(1e5),
        "bonus_boost": int(1e5),
    }
    target_modes = list(num_sim_args.keys())

    config = GameConfig()
    gamestate = GameState(config)
    OptimizationSetup(config)

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

    from tools.enforce_paw_hit_rate import main as enforce_paw_main
    import sys

    hit_baseline = {"base": "0.3708", "bonus_boost": "0.4133"}
    for mode in target_modes:
        print(f"\n=== Post-opt LUT fix: {mode} (paw≥3%, sw≥3%, HIT/RTP baseline) ===")
        sys.argv = [
            "enforce_paw_hit_rate.py",
            "--mode",
            mode,
            "--paw",
            "0.03",
            "--sw",
            "0.03",
            "--hit",
            hit_baseline[mode],
            "--rtp",
            "0.9601",
            "--lut-dir",
            "library/publish_files",
        ]
        enforce_paw_main()

    custom_keys = [
        {"symbol": "scatter"},
        {"kind": 5, "symbol": "H1"},
    ]
    try:
        create_stat_sheet(gamestate, custom_keys=custom_keys)
    except Exception as exc:  # noqa: BLE001
        print("create_stat_sheet skipped:", exc)
    print("base+boost M5 done")
