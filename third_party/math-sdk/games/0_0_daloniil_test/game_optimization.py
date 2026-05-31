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
    # HIGH VOLATILITY:
    # - Suppress small basegame wins (<5x) with low scale factor
    # - Reward medium-large basegame hits (5-50x) — achievable with our reelstrips
    # - Push FS wins toward near-wincap (500-2500x) territory
    # NOTE: ranges must have sufficient books to avoid Rust optimizer panic.
    # With basegame quota=0.069 and HR=12: ~575 winning books.
    return ConstructScaling(
        [
            {"criteria": "basegame", "scale_factor": 0.3, "win_range": (1, 5), "probability": 1.0},
            {"criteria": "basegame", "scale_factor": 1.8, "win_range": (5, 50), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.5, "win_range": (1, 100), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.0, "win_range": (500, 2500), "probability": 1.0},
        ]
    ).return_dict()


def _bonus_scaling():
    # HIGH VOLATILITY for buy-bonus / special-spins:
    # - Heavily penalize small FS sessions (<50x)
    # - Strongly reward near-wincap sessions (1000-2500x)
    # NOTE: max VI per mode with wincap=2500:
    #   special_spins ≈ 9.3, bonus_normal ≈ 5.0, bonus_super ≈ 3.5
    return ConstructScaling(
        [
            {"criteria": "freegame", "scale_factor": 0.3, "win_range": (1, 50), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 0.5, "win_range": (50, 200), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.0, "win_range": (500, 1500), "probability": 1.0},
            {"criteria": "freegame", "scale_factor": 2.5, "win_range": (1500, 2500), "probability": 1.0},
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
                    # avg_win target = 0.55 × 200 = 110× bet.
                    # With reduced mult_values and W=15% FR0, FS books now range
                    # from ~30× to 2500× — optimizer finds low-end subset at 110×.
                    "freegame": ConstructConditions(
                        rtp=0.55, hr=200, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    # avg_win target = 0.4001 × 12 = 4.8× — small basegame line wins.
                    "basegame": ConstructConditions(hr=12.0, rtp=0.4001).return_dict(),
                },
                "scaling": _basegame_scaling(),
                "parameters": _common_parameters(),
                # Bias freegame fence toward near-wincap FS sessions.
                # Optimizer selects both near-wincap AND low-payout books to hit avg=110×,
                # creating the bimodal high-volatility distribution we want.
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
                    # avg_win target = 0.65 × 120 = 78× bet → achievable from low-end FS.
                    "freegame": ConstructConditions(
                        rtp=0.65, hr=120, search_conditions={"symbol": "scatter"}
                    ).return_dict(),
                    # avg_win target = 0.3001 × 12 = 3.6× → small line wins.
                    "basegame": ConstructConditions(hr=12.0, rtp=0.3001).return_dict(),
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
                    "freegame": ConstructConditions(rtp=0.9401, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                # MAX ACHIEVABLE: bias toward near-wincap sessions (1000-2500x).
                # Max VI ≈ 9.3 for this mode.
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
                    "freegame": ConstructConditions(rtp=0.9501, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                # MAX ACHIEVABLE: bias near-wincap. Max VI ≈ 5.0 for this mode.
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
                    "freegame": ConstructConditions(rtp=0.9401, hr="x").return_dict(),
                },
                "scaling": _bonus_scaling(),
                "parameters": _bonus_parameters(),
                # MAX ACHIEVABLE: bias near-wincap. Max VI ≈ 3.5 for this mode.
                "distribution_bias": ConstructFenceBias(
                    applied_criteria=["freegame"],
                    bias_ranges=[(1500.0, 2500.0)],
                    bias_weights=[0.5],
                ).return_dict(),
            },
        }

        verify_optimization_input(self.game_config, self.game_config.opt_params)
