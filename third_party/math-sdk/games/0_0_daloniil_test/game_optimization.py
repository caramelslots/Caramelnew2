"""Optimization-program setup для Cash Stacks (5 bet-modes).

Все 5 режимов используют одинаковый scoring profile с поправкой на
volatility (special_spins / bonus_super — выше волатильность).

На Этапе 2 это начальная конфигурация — она пройдёт `verify_optimization_input`,
но финальный RTP-tuning потребует калибровки по фактическим симуляциям.
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
    return ConstructScaling(
        [
            {"criteria": "basegame", "scale_factor": 1.2, "win_range": (1, 2), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.5, "win_range": (10, 20), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.8, "win_range": (1000, 2000), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.2, "win_range": (3000, 4000), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_scaling():
    return ConstructScaling(
        [
            {"criteria": "freegame", "scale_factor": 1.2, "win_range": (1, 20), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.5, "win_range": (20, 50), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.8, "win_range": (50, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.8, "win_range": (1000, 2000), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 1.2, "win_range": (3000, 4000), "probability": 1.0},
        ]
    ).return_dict()


class OptimizationSetup:
    """Build opt_params for всех 5 bet-modes Cash Stacks."""

    def __init__(self, game_config):
        self.game_config = game_config
        wincaps = {bm.get_name(): bm.get_wincap() for bm in game_config.bet_modes}

        self.game_config.opt_params = {
            "base": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["base"], search_conditions=wincaps["base"]
                    ).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    "freegame": ConstructConditions(
                        rtp=0.37, hr=200, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "basegame": ConstructConditions(hr=3.5, rtp=0.5801).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["basegame"],
                    bias_ranges=[(2.0, 3.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
            "bonus_boost": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_boost"], search_conditions=wincaps["bonus_boost"]
                    ).return_dict(),
                    "0": ConstructConditions(rtp=0, av_win=0, search_conditions=0).return_dict(),
                    "freegame": ConstructConditions(
                        rtp=0.47, hr=120, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    "basegame": ConstructConditions(hr=3.5, rtp=0.4801).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["basegame"],
                    bias_ranges=[(2.0, 3.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
            "special_spins": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.02, av_win=wincaps["special_spins"], search_conditions=wincaps["special_spins"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.9401, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(150.0, 250.0)],
                    bias_weights=[0.3],
                ).return_dict(),
            },
            "bonus_normal": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.01, av_win=wincaps["bonus_normal"], search_conditions=wincaps["bonus_normal"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.9501, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(200.0, 350.0)],
                    bias_weights=[0.3],
                ).return_dict(),
            },
            "bonus_super": {
                "conditions": {
                    "wincap": ConstructConditions(
                        rtp=0.02, av_win=wincaps["bonus_super"], search_conditions=wincaps["bonus_super"]
                    ).return_dict(),
                    "freegame": ConstructConditions(rtp=0.9401, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(300.0, 500.0)],
                    bias_weights=[0.3],
                ).return_dict(),
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
