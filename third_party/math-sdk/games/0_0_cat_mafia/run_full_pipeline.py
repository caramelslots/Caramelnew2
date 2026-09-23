"""Shared M5/M6 pipeline: sim → optimize → enforce → analysis → format checks."""

from __future__ import annotations

import sys
from typing import Literal

from gamestate import GameState
from game_config import GameConfig
from game_optimization import OptimizationSetup
from optimization_program.run_script import OptimizationExecution
from utils.game_analytics.run_analysis import create_stat_sheet
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

ALL_MODES = (
    "base",
    "bonus_boost",
    "bonus_normal",
    "bonus_super",
    "bonus_duel_cat",
    "bonus_duel_dog",
)

ResamplePreset = Literal["--100k", "--1m"]


def run_full_pipeline(
    num_sims_per_mode: int,
    *,
    label: str,
    resample_preset: ResamplePreset,
) -> None:
    num_threads = 1
    rust_threads = 20
    batching_size = 2000
    compression = True
    profiling = False

    num_sim_args = {mode: num_sims_per_mode for mode in ALL_MODES}
    target_modes = list(num_sim_args.keys())

    print(f"=== {label}: {num_sims_per_mode:,} sims per mode ===")
    print(f"    modes: {', '.join(target_modes)}")

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

    from tools.enforce_paw_hit_rate import main as enforce_lut_main

    hit_baseline = {"base": "0.3708", "bonus_boost": "0.4133"}
    for mode in ("base", "bonus_boost"):
        if mode not in target_modes:
            continue
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
        enforce_lut_main()

    custom_keys = [
        {"symbol": "scatter"},
        {"kind": 5, "symbol": "H1"},
    ]
    try:
        create_stat_sheet(gamestate, custom_keys=custom_keys)
    except Exception as exc:  # noqa: BLE001
        print("create_stat_sheet skipped:", exc)

    execute_all_tests(config)

    print(f"\n=== {label} done ===")
    print(
        f"Next: $PY tools/resample_books.py {resample_preset} "
        "(auto-copies publish → backup_pre_resample)."
    )
