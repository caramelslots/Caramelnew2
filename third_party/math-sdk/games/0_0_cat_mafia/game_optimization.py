"""Optimization-program setup для Wok Fury (5 bet-modes).

MATH_LOW_VOL_PLAN Stage 3: line hit ~37%, low avg win per hit (~1.08× base),
RTP 96%. FS optimizer profile unchanged (Q2).
"""

from optimization_program.optimization_config import (
    ConstructScaling,
    ConstructParameters,
    ConstructConditions,
    ConstructFenceBias,
    verify_optimization_input,
)


def _common_parameters():
    # Low-vol base: mean/median closer to 1.5–3 (was 4–8 → high-vol LUT).
    return ConstructParameters(
        num_show=5000,
        num_per_fence=10000,
        min_m2m=1.5,
        max_m2m=3.0,
        pmb_rtp=1.0,
        sim_trials=5000,
        test_spins=[50, 100, 200],
        test_weights=[0.3, 0.4, 0.3],
        score_type="rtp",
    ).return_dict()


def _bonus_parameters():
    # Medium vol: mean/median ≈ 1.4–2.2 (was 4–8 → forced high-vol LUT).
    return ConstructParameters(
        num_show=5000,
        num_per_fence=10000,
        min_m2m=1.4,
        max_m2m=2.2,
        pmb_rtp=1.0,
        sim_trials=5000,
        test_spins=[10, 20, 50],
        test_weights=[0.6, 0.2, 0.2],
        score_type="rtp",
    ).return_dict()


def _basegame_scaling():
    # Moderate A: keep meloch, fill mid 1–1.5×, soft-cut huge FS/SW tails.
    # RTP budget moves from ≥50× into body; total RTP still ~96% via fences + enforce.
    return ConstructScaling(
        [
            {"criteria": "basegame", "scale_factor": 1.9, "win_range": (0.1, 0.5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.8, "win_range": (0.5, 1.0), "probability": 1.0},
            # Key band for 1 / 1.2 / 1.5× line hits (was starved).
            {"criteria": "basegame", "scale_factor": 2.4, "win_range": (1.0, 2.0), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.0, "win_range": (2.0, 5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 0.35, "win_range": (5, 20), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 0.12, "win_range": (20, 50), "probability": 1.0},
            # Prefer typical coin-row pays (~4–8×) so more paw hits fit in fence RTP.
            {"criteria": "paw", "scale_factor": 2.2, "win_range": (3, 8), "probability": 1.0},
            {"criteria": "paw", "scale_factor": 1.4, "win_range": (8, 15), "probability": 1.0},
            {"criteria": "paw", "scale_factor": 0.40, "win_range": (15, 50), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 1.4, "win_range": (1, 10), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 0.9, "win_range": (10, 30), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 0.28, "win_range": (30, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.5, "win_range": (1, 40), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.0, "win_range": (40, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.35, "win_range": (100, 300), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.12, "win_range": (300, 2500), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_boost_parameters():
    # Tighter mean/median than base — ETL40 fails when FS tails dominate (cost=2).
    return ConstructParameters(
        num_show=5000,
        num_per_fence=10000,
        min_m2m=2.0,
        max_m2m=4.0,
        pmb_rtp=1.0,
        sim_trials=5000,
        test_spins=[50, 100, 200],
        test_weights=[0.3, 0.4, 0.3],
        score_type="rtp",
    ).return_dict()


def _bonus_boost_scaling():
    """Bonus Boost (cost 2×): same moderate-A body fill as base + ETL40-safe FS cut.

    Lift meloch/mid 1–1.5×; soft-cut huge FS/SW. Keep RTP ≈96% via fences + enforce.
    """
    return ConstructScaling(
        [
            {"criteria": "basegame", "scale_factor": 1.85, "win_range": (0.1, 0.5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.75, "win_range": (0.5, 1.0), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 2.3, "win_range": (1.0, 2.0), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.0, "win_range": (2.0, 5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 0.30, "win_range": (5, 50), "probability": 1.0},
            {"criteria": "paw", "scale_factor": 2.2, "win_range": (3, 8), "probability": 1.0},
            {"criteria": "paw", "scale_factor": 1.4, "win_range": (8, 15), "probability": 1.0},
            {"criteria": "paw", "scale_factor": 0.40, "win_range": (15, 50), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 1.4, "win_range": (1, 10), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 0.9, "win_range": (10, 30), "probability": 1.0},
            {"criteria": "sw_expand", "scale_factor": 0.28, "win_range": (30, 100), "probability": 1.0},
            # FS: 40× cost = 80× bet — prefer sessions below that band.
            {"criteria": "freegame", "scale_factor": 1.55, "win_range": (1, 40), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.2, "win_range": (40, 80), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.55, "win_range": (80, 200), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.28, "win_range": (200, 500), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.12, "win_range": (500, 2500), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_normal_scaling():
    """Buy Normal (cost 100×): lift mid body, soften extreme tail."""
    return ConstructScaling(
        [
            {"criteria": "freegame", "scale_factor": 1.35, "win_range": (1, 35), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.55, "win_range": (35, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.25, "win_range": (100, 220), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.75, "win_range": (220, 700), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.4, "win_range": (700, 2500), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_super_scaling():
    """Buy Super (cost 200×): same shape, shifted up vs Normal."""
    return ConstructScaling(
        [
            {"criteria": "freegame", "scale_factor": 1.3, "win_range": (1, 70), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.5, "win_range": (70, 200), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.2, "win_range": (200, 400), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.75, "win_range": (400, 1000), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.4, "win_range": (1000, 2500), "probability": 1.0},
        ]
    ).return_dict()


class OptimizationSetup:
    """Build opt_params for Cat Mafia bet-modes (no special_spins)."""

    def __init__(self, game_config):
        self.game_config = game_config
        wincaps = {bm.get_name(): bm.get_wincap() for bm in game_config.bet_modes}

        self.game_config.opt_params = {
            "base": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["base"], search_conditions=wincaps["base"]
                    ).return_dict(),
                    # 0_cluster shares optimizer fence with 0 (both rtp=0, win=0).
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    # Paw ~3% hits (hr≈33), rtp≈0.18 → avg ~6×. Mid body in basegame.
                    # Total fences ≈0.96 (wincap 0.01 + FS/paw/sw/basegame).
                    "freegame": ConstructConditions(
                        rtp=0.25, hr=300, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "paw": ConstructConditions(hr=33, rtp=0.18).return_dict(),
                    "sw_expand": ConstructConditions(hr=40, rtp=0.05).return_dict(),
                    "basegame": ConstructConditions(hr=2.7, rtp=0.47).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                # Bias modest FS + typical paw coin-row band (keeps avg paw win down → more hits).
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame", "paw", "basegame"],
                    bias_ranges=[(20.0, 100.0), (3.0, 10.0), (1.0, 2.0)],
                    bias_weights=[0.40, 0.65, 0.55],
                ).return_dict(),
            },
            "bonus_boost": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_boost"], search_conditions=wincaps["bonus_boost"]
                    ).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    # Same moderate-A split as base; FS still richer than base (hr 160).
                    "freegame": ConstructConditions(
                        rtp=0.38, hr=160, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "paw": ConstructConditions(hr=33, rtp=0.16).return_dict(),
                    "sw_expand": ConstructConditions(hr=40, rtp=0.05).return_dict(),
                    "basegame": ConstructConditions(hr=2.8, rtp=0.36).return_dict(),
                },
                "scaling": _bonus_boost_scaling(),
                "parameters": _bonus_boost_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame", "paw", "basegame"],
                    bias_ranges=[(15.0, 70.0), (3.0, 10.0), (1.0, 2.0)],
                    bias_weights=[0.30, 0.65, 0.55],
                ).return_dict(),
            },
            "bonus_normal": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_normal"], search_conditions=wincaps["bonus_normal"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.95, hr="x").return_dict(),
                },
                "scaling": _bonus_normal_scaling(),
                "parameters": _bonus_parameters(),
                # Bias toward mid band around ~0.5–1.2× buy price (not wincap).
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(45.0, 130.0)],
                    bias_weights=[0.35],
                ).return_dict(),
            },
            "bonus_super": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.02, av_win=wincaps["bonus_super"], search_conditions=wincaps["bonus_super"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.94, hr="x").return_dict(),
                },
                "scaling": _bonus_super_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(90.0, 260.0)],
                    bias_weights=[0.35],
                ).return_dict(),
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
