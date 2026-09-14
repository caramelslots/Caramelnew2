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

    # Floor paw ≥3% + sw ≥3%, hold HIT at baseline, match RTP ~96.01%
    # hit-neutrally on the weighted publish LUT (before resample).
    from tools.enforce_paw_hit_rate import main as enforce_paw_main
    import sys

    sys.argv = [
        "enforce_paw_hit_rate.py",
        "--mode",
        "base",
        "--paw",
        "0.03",
        "--sw",
        "0.03",
        "--hit",
        "0.3708",
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
    except Exception as exc:  # noqa: BLE001 — analytics is optional
        print("create_stat_sheet skipped:", exc)
    print("base low-vol M5 done")
