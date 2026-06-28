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
    return ConstructParameters(
        num_show=5000,
        num_per_fence=10000,
        min_m2m=4,
        max_m2m=8,
        pmb_rtp=1.0,
        sim_trials=5000,
        test_spins=[50, 100, 200],
        test_weights=[0.3, 0.4, 0.3],
        score_type="rtp",
    ).return_dict()


def _bonus_parameters():
    return ConstructParameters(
        num_show=5000,
        num_per_fence=10000,
        min_m2m=4,
        max_m2m=8,
        pmb_rtp=1.0,
        sim_trials=5000,
        test_spins=[10, 20, 50],
        test_weights=[0.6, 0.2, 0.2],
        score_type="rtp",
    ).return_dict()


def _basegame_scaling():
    # LOW-VOL tuning: boost micro-wins (0.1–1×), penalize base tails >1.5×.
    # With basegame quota=0.37 and HR=3.2: ~18500 winning books for optimizer.
    return ConstructScaling(
        [
            {"criteria": "basegame", "scale_factor": 1.5, "win_range": (0.1, 0.5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.3, "win_range": (0.5, 1.0), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 0.7, "win_range": (1.5, 5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 0.4, "win_range": (5, 50), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.5, "win_range": (1, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.0, "win_range": (500, 2500), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_scaling():
    return ConstructScaling(
        [
            {"criteria": "freegame", "scale_factor": 0.3, "win_range": (1, 50), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.5, "win_range": (50, 200), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.0, "win_range": (500, 1500), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.5, "win_range": (1500, 2500), "probability": 1.0},
        ]
    ).return_dict()


class OptimizationSetup:
    """Build opt_params for всех 5 bet-modes Wok Fury."""

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
                    "freegame": ConstructConditions(
                        rtp=0.55, hr=200, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "basegame": ConstructConditions(hr=3.2, rtp=0.40).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(500.0, 2500.0)],
                    bias_weights=[0.6],
                ).return_dict(),
            },
            "bonus_boost": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_boost"], search_conditions=wincaps["bonus_boost"]
                    ).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    "freegame": ConstructConditions(
                        rtp=0.65, hr=120, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "basegame": ConstructConditions(hr=3.2, rtp=0.30).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(500.0, 2500.0)],
                    bias_weights=[0.6],
                ).return_dict(),
            },
            "special_spins": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.02, av_win=wincaps["special_spins"], search_conditions=wincaps["special_spins"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.94, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(1000.0, 2500.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
            "bonus_normal": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_normal"], search_conditions=wincaps["bonus_normal"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.95, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(1000.0, 2500.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
            "bonus_super": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.02, av_win=wincaps["bonus_super"], search_conditions=wincaps["bonus_super"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.94, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(1500.0, 2500.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
