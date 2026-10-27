"""Bonus-normal only: match weighted LUT to ladder v6 targets (+ optional 100k rebuild).

Default (fast): match existing publish_files_backup_pre_resample LUT → publish.

Full rebuild:
  BONUS_NORMAL_LADDER_FULL=1 $PY run_bonus_normal_ladder.py

  cd third_party/math-sdk/games/0_0_meowgic
  export PYTHONPATH=/path/to/math-sdk:.
  ../../env/bin/python run_bonus_normal_ladder.py
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path


def _match_only(root: Path) -> None:
    from tools.match_base_win_ladder import main as match_ladder_main

    pre = root / "library" / "publish_files_backup_pre_resample"
    pub = root / "library" / "publish_files"
    lut_name = "lookUpTable_bonus_normal_0.csv"
    if not (pre / lut_name).exists():
        raise SystemExit(f"missing weighted LUT {pre / lut_name}")

    # Safety copy before overwrite.
    bak = root / "library" / "publish_files_backup_pre_bonus_normal_ladder"
    bak.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pre / lut_name, bak / lut_name)
    pub_lut = pub / lut_name
    if pub_lut.exists():
        shutil.copy2(pub_lut, bak / f"publish_{lut_name}")

    sys.argv = [
        "match_base_win_ladder.py",
        "--mode",
        "bonus_normal",
        "--targets",
        str(root / "tools" / "bonus_normal_win_ladder_targets.json"),
        "--lut-dir",
        str(pre),
        "--also-publish",
        "--tol",
        "0.0020",
        "--rtp",
        "0.96",
        "--rtp-tol",
        "0.005",
        "--rounds",
        "8",
    ]
    match_ladder_main()


def _full_pipeline(root: Path) -> None:
    from gamestate import GameState
    from game_config import GameConfig
    from game_optimization import OptimizationSetup
    from optimization_program.run_script import OptimizationExecution
    from utils.game_analytics.run_analysis import create_stat_sheet
    from src.state.run_sims import create_books
    from src.write_data.write_configs import generate_configs

    num_threads = 20
    rust_threads = 20
    batching_size = 2000
    compression = True
    profiling = False

    num_sim_args = {"bonus_normal": int(1e5)}
    target_modes = ["bonus_normal"]

    config = GameConfig()
    gamestate = GameState(config)
    _ = OptimizationSetup(config)

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

    pub = root / "library" / "publish_files"
    pre = root / "library" / "publish_files_backup_pre_resample"
    pre.mkdir(parents=True, exist_ok=True)
    lut_name = "lookUpTable_bonus_normal_0.csv"
    for name in (lut_name, "lookUpTableIndex_bonus_normal.json"):
        src = pub / name
        if src.exists():
            shutil.copy2(src, pre / name)

    # Buy always pays — no hit enforce; only soft RTP hold then ladder match.
    from tools.enforce_paw_hit_rate import main as enforce_paw_main

    sys.argv = [
        "enforce_paw_hit_rate.py",
        "--mode",
        "bonus_normal",
        "--rtp",
        "0.9601",
        "--lut-dir",
        str(pub),
    ]
    enforce_paw_main()

    if not (pub / lut_name).exists():
        raise SystemExit(f"missing {pub / lut_name} after enforce")
    shutil.copy2(pub / lut_name, pre / lut_name)

    _match_only(root)

    try:
        create_stat_sheet(
            gamestate,
            custom_keys=[{"symbol": "scatter"}, {"kind": 5, "symbol": "H1"}],
        )
    except Exception as exc:  # noqa: BLE001
        print("create_stat_sheet skipped:", exc)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    full = os.environ.get("BONUS_NORMAL_LADDER_FULL", "").strip() in {"1", "true", "yes"}
    if full:
        print("=== bonus_normal ladder FULL (100k sims + opt + match) ===", flush=True)
        _full_pipeline(root)
    else:
        print("=== bonus_normal ladder MATCH-ONLY (weighted LUT) ===", flush=True)
        _match_only(root)
    print("bonus_normal ladder done", flush=True)
