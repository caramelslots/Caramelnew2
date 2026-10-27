"""Base-only M5 after low-vol + paw fence changes.

  cd third_party/math-sdk/games/0_0_meowgic
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
    num_threads = 20
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

    # Floor paw ≥3% + sw ≥3%, hold HIT at ladder v2 (~53.15%), match RTP ~96.01%
    # hit-neutrally on the weighted publish LUT (before resample).
    from tools.enforce_paw_hit_rate import main as enforce_paw_main
    from tools.match_base_win_ladder import main as match_ladder_main
    import shutil
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parent
    pub = root / "library" / "publish_files"
    pre = root / "library" / "publish_files_backup_pre_resample"
    pre.mkdir(parents=True, exist_ok=True)
    lut_name = "lookUpTable_base_0.csv"
    for name in (lut_name, "lookUpTableIndex_base.json"):
        src = pub / name
        if src.exists():
            shutil.copy2(src, pre / name)

    sys.argv = [
        "enforce_paw_hit_rate.py",
        "--mode",
        "base",
        "--paw",
        "0.03",
        "--sw",
        "0.03",
        "--hit",
        "0.53044",
        "--rtp",
        "0.9601",
        "--lut-dir",
        str(pub),
    ]
    enforce_paw_main()

    # Reshape payout ladder toward tools/base_win_ladder_targets.json (v3b).
    if not (pub / lut_name).exists():
        raise SystemExit(f"missing {pub / lut_name} after enforce")
    shutil.copy2(pub / lut_name, pre / lut_name)
    sys.argv = [
        "match_base_win_ladder.py",
        "--lut-dir",
        str(pre),
        "--also-publish",
        "--tol",
        "0.0015",
        "--rtp",
        "0.96",
        "--rtp-tol",
        "0.005",
        "--rounds",
        "6",
    ]
    match_ladder_main()

    custom_keys = [
        {"symbol": "scatter"},
        {"kind": 5, "symbol": "H1"},
    ]
    try:
        create_stat_sheet(gamestate, custom_keys=custom_keys)
    except Exception as exc:  # noqa: BLE001 — analytics is optional
        print("create_stat_sheet skipped:", exc)
    print("base low-vol M5 done")
