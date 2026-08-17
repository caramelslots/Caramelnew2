"""Cat Mafia — game configuration.

5×4 board, ~20 paylines, RTP ~96%.
Base/boost max ×2500; buy bonus max ×25000 (ultra-rare), soft jackpot ×2500.
Forked from 0_0_daloniil_test; Wok Fury ladder/mystery removed.
"""

import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode


class GameConfig(Config):

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "0_0_cat_mafia"
        self.provider_number = 0
        self.working_name = "Cat Mafia"
        # Soft jackpot (common force-wincap fence). Buy modes also allow ultra-rare ×25000.
        self.soft_wincap = 2_500.0
        self.wincap = self.soft_wincap  # default; bet-mode max_win overrides during sims
        self.win_type = "lines"
        self.rtp = 0.96
        self.construct_paths()

        # === Board ===
        self.num_reels = 5
        self.num_rows = [4] * self.num_reels

        # === Paytable (mirrors web-sdk cat_mafia config) ===
        self.paytable = {
            (5, "W"): 225.0,
            (5, "H1"): 150.0,
            (4, "H1"): 15.0,
            (3, "H1"): 3.0,
            (5, "H2"): 75.0,
            (4, "H2"): 7.5,
            (3, "H2"): 1.8,
            (5, "H3"): 45.0,
            (4, "H3"): 4.5,
            (3, "H3"): 1.2,
            (5, "H4"): 30.0,
            (4, "H4"): 3.0,
            (3, "H4"): 0.7,
            (5, "L1"): 3.0,
            (4, "L1"): 0.5,
            (3, "L1"): 0.1,
            (5, "L2"): 3.0,
            (4, "L2"): 0.5,
            (3, "L2"): 0.1,
            (5, "L3"): 3.0,
            (4, "L3"): 0.5,
            (3, "L3"): 0.1,
            (5, "L4"): 3.0,
            (4, "L4"): 0.5,
            (3, "L4"): 0.1,
        }

        # === 20 paylines (5×4, rows 0..3) — mirror web-sdk config.ts ===
        self.paylines = {
            1: [0, 0, 0, 0, 0],
            2: [1, 1, 1, 1, 1],
            3: [2, 2, 2, 2, 2],
            4: [3, 3, 3, 3, 3],
            5: [0, 1, 2, 1, 0],
            6: [1, 2, 3, 2, 1],
            7: [3, 2, 1, 2, 3],
            8: [2, 1, 0, 1, 2],
            9: [0, 1, 2, 3, 3],
            10: [3, 2, 1, 0, 0],
            11: [0, 1, 2, 2, 2],
            12: [3, 2, 2, 2, 2],
            13: [2, 2, 2, 1, 0],
            14: [2, 2, 2, 3, 3],
            15: [0, 0, 1, 2, 2],
            16: [3, 3, 2, 1, 1],
            17: [2, 2, 1, 0, 0],
            18: [2, 2, 3, 3, 3],
            19: [0, 1, 1, 1, 0],
            20: [3, 2, 2, 2, 3],
        }

        self.include_padding = True
        self.special_symbols = {
            "wild": ["W", "SW"],
            "scatter": ["B"],
            "multiplier": ["SW"],
            "paw": ["PB", "PS", "PG"],
            "bullet": ["BT"],
        }

        # Min scatter count to enter FS; actual FS count from freeSpinTargetPick.
        self.freespin_triggers = {
            self.basegame_type: {3: 8, 4: 10},
            self.freegame_type: {},
        }
        self.max_bonus_on_board = 5
        self.anticipation_triggers = {
            self.basegame_type: self.num_reels + 1,
            self.freegame_type: self.num_reels + 1,
        }

        # === Cat Mafia feature params ===
        self.target_pick_values = [8, 10, 12]
        self.target_pick_count = 6
        self.drum_max = 6
        # Medium-vol bonus: mostly ×2/×4; ×6/×8 stay rare spice.
        # (Product of 2 sticky columns still capped by max_sticky_sw.)
        self.sw_mult_weights = {2: 42, 4: 40, 6: 13, 8: 5}
        # Paw-coin type split inside the (unchanged) ~3% paw fence quota.
        # Bronze 1 row / silver 2 rows / gold 3 rows — gold is rarest.
        self.paw_tier_weights = {"PB": 60, "PS": 30, "PG": 10}
        # Cap sticky SW columns in bonus (product of mults grows very fast).
        self.max_sticky_sw = 2
        # Shoot rewards: empty / +1 / +2 / +3 FS (weights)
        self.shoot_reward_weights = {0: 45, 1: 30, 2: 18, 3: 7}
        self.dead_cluster_fraction = 0.19
        self.fs_cluster_on_dead_fraction = 0.25

        # === Reels ===
        reels = {
            "BR0": "BR0.csv",
            "BR1": "BR1.csv",
            "BR0_ZW": "BR0_ZW.csv",
            "BR1_ZW": "BR1_ZW.csv",
            "FR0": "FR0.csv",
            "FR1": "FR1.csv",
            "FR0_ZW": "FR0_ZW.csv",
            "FR1_ZW": "FR1_ZW.csv",
            "WCAP": "FRWCAP.csv",
        }
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))

        self.padding_reels[self.basegame_type] = self.reels["BR0"]
        self.padding_reels[self.freegame_type] = self.reels["FR0"]
        # SW multipliers (W has no mult)
        self.padding_symbol_values = {
            "SW": {"multiplier": dict(self.sw_mult_weights)},
        }

        # === Distribution conditions ===
        freegame_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 70, 4: 30},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: dict(self.sw_mult_weights),
            },
            "force_wincap": False,
            "force_freegame": True,
        }

        basegame_condition = {
            "reel_weights": {self.basegame_type: {"BR0": 1}},
            "mult_values": {self.basegame_type: {1: 1}},
            "force_wincap": False,
            "force_freegame": False,
        }

        # Dedicated feature fences — equal quotas; strips have no P/SW.
        # ~3% each → paw coins and SW expand appear at the same rate (XOR).
        paw_condition = {
            "reel_weights": {self.basegame_type: {"BR0": 1}},
            "mult_values": {self.basegame_type: {1: 1}},
            "force_wincap": False,
            "force_freegame": False,
            "force_paw": True,
        }
        # SW lands naturally from BR0 strips — no force flag. The sw_expand
        # criteria segment is covered via check_repeat rejection sampling
        # (required superWildExpand event must fire).
        sw_expand_condition = {
            "reel_weights": {self.basegame_type: {"BR0": 1}},
            "mult_values": {self.basegame_type: {1: 1}},
            "force_wincap": False,
            "force_freegame": False,
        }

        zerowin_condition = {
            "reel_weights": {self.basegame_type: {"BR0_ZW": 1}},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: dict(self.sw_mult_weights),
            },
            "force_wincap": False,
            "force_freegame": False,
        }

        zerowin_cluster_condition = {
            "reel_weights": {self.basegame_type: {"BR0_ZW": 1}},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: dict(self.sw_mult_weights),
            },
            "force_wincap": False,
            "force_freegame": False,
            "cluster_board": True,
        }

        wincap_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1, "WCAP": 5},
            },
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 10, 4: 30, 6: 40, 8: 50},
            },
            "scatter_triggers": {3: 1, 4: 1},
            "force_wincap": True,
            "force_freegame": True,
        }

        buy_normal_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 1},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: dict(self.sw_mult_weights),
            },
            "force_wincap": False,
            "force_freegame": True,
        }

        buy_super_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR1": 1},
            },
            "scatter_triggers": {4: 1},
            "mult_values": {
                self.basegame_type: {1: 1},
                # Medium-vol Super: still richer than Normal, but not ×6/×8-heavy.
                self.freegame_type: {2: 35, 4: 40, 6: 18, 8: 7},
            },
            "force_wincap": False,
            "force_freegame": True,
            "super_bonus": True,
        }

        # Buy bonuses: advertised/hard max ×25000; soft force-wincap fence stays ×2500.
        mode_maxwins = {
            "base": self.soft_wincap,
            "bonus_boost": self.soft_wincap,
            "bonus_normal": 25_000.0,
            "bonus_super": 25_000.0,
        }
        buy_soft = self.soft_wincap
        buy_hard = 25_000.0
        # ~10 forced max books per 1e5 sims; opt keeps their LUT weight tiny.
        buy_wincap_max_quota = 0.0001

        # Dead + basegame + paw + sw_expand + freegame + wincap = 1.0
        # Equal feature rates: paw == sw_expand (~1/33 each).
        # bonus_boost = same BR0 mechanics as base; freegame quota ~2× (20% vs 10%).
        feature_quota = 0.03
        dead_cluster = 0.10
        dead_plain = round(0.469 - dead_cluster, 4)
        boost_freegame_quota = 0.20
        boost_basegame_quota = 0.27  # base keeps 0.37; difference → freegame

        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=mode_maxwins["base"],
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["base"],
                        conditions=wincap_condition,
                    ),
                    Distribution(criteria="freegame", quota=0.10, conditions=freegame_condition),
                    Distribution(criteria="0", quota=dead_plain, win_criteria=0.0, conditions=zerowin_condition),
                    Distribution(
                        criteria="0_cluster",
                        quota=dead_cluster,
                        win_criteria=0.0,
                        conditions=zerowin_cluster_condition,
                    ),
                    Distribution(criteria="paw", quota=feature_quota, conditions=paw_condition),
                    Distribution(
                        criteria="sw_expand",
                        quota=feature_quota,
                        conditions=sw_expand_condition,
                    ),
                    Distribution(criteria="basegame", quota=0.37, conditions=basegame_condition),
                ],
            ),
            BetMode(
                name="bonus_boost",
                cost=2.0,
                rtp=self.rtp,
                max_win=mode_maxwins["bonus_boost"],
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                # Same BR0 / paw / SW / dead as base — only freegame vs basegame mix differs.
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["bonus_boost"],
                        conditions=wincap_condition,
                    ),
                    Distribution(
                        criteria="freegame",
                        quota=boost_freegame_quota,
                        conditions=freegame_condition,
                    ),
                    Distribution(criteria="0", quota=dead_plain, win_criteria=0.0, conditions=zerowin_condition),
                    Distribution(
                        criteria="0_cluster",
                        quota=dead_cluster,
                        win_criteria=0.0,
                        conditions=zerowin_cluster_condition,
                    ),
                    Distribution(criteria="paw", quota=feature_quota, conditions=paw_condition),
                    Distribution(
                        criteria="sw_expand",
                        quota=feature_quota,
                        conditions=sw_expand_condition,
                    ),
                    Distribution(
                        criteria="basegame",
                        quota=boost_basegame_quota,
                        conditions=basegame_condition,
                    ),
                ],
            ),
            BetMode(
                name="bonus_normal",
                cost=100.0,
                rtp=self.rtp,
                max_win=mode_maxwins["bonus_normal"],
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    # Classic big hit ×2500 (same feel as before).
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=buy_soft,
                        conditions=wincap_condition,
                    ),
                    # Ultra-rare official max ×25000.
                    Distribution(
                        criteria="wincap_max",
                        quota=buy_wincap_max_quota,
                        win_criteria=buy_hard,
                        conditions=wincap_condition,
                    ),
                    Distribution(
                        criteria="freegame",
                        quota=round(0.999 - 0.001 - buy_wincap_max_quota, 6),
                        conditions=buy_normal_condition,
                    ),
                ],
            ),
            BetMode(
                name="bonus_super",
                cost=200.0,
                rtp=self.rtp,
                max_win=mode_maxwins["bonus_super"],
                auto_close_disabled=False,
                is_feature=False,
                is_buybonus=True,
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.002,
                        win_criteria=buy_soft,
                        conditions=wincap_condition,
                    ),
                    Distribution(
                        criteria="wincap_max",
                        quota=buy_wincap_max_quota,
                        win_criteria=buy_hard,
                        conditions=wincap_condition,
                    ),
                    Distribution(
                        criteria="freegame",
                        quota=round(0.998 - buy_wincap_max_quota, 6),
                        conditions=buy_super_condition,
                    ),
                ],
            ),
        ]

    def get_win_level(self, win_amount: float, winlevel_key: str = "standard") -> int:
        levels = {
            1: (0.0, 0.1),
            2: (0.1, 1.0),
            3: (1.0, 3.0),
            4: (3.0, 6.0),
            5: (6.0, 10.0),
            6: (10.0, 50.0),
            7: (50.0, 100.0),
            8: (100.0, 250.0),
            # Sensational from soft jackpot band; true ×25000 still level 10.
            9: (250.0, self.soft_wincap),
            10: (self.soft_wincap, float("inf")),
        }
        for idx, (lo, hi) in levels.items():
            if win_amount >= lo and win_amount < hi:
                return idx
        return 1

    def get_cluster_symbol_weights(self, gametype: str, betmode: str) -> dict[str, int]:
        from game_cluster import (
            CLUSTER_SYMBOL_WEIGHTS_BR0,
            CLUSTER_SYMBOL_WEIGHTS_FR0,
            CLUSTER_SYMBOL_WEIGHTS_FR1,
        )

        if gametype == self.freegame_type:
            if betmode == "bonus_super":
                return CLUSTER_SYMBOL_WEIGHTS_FR1
            return CLUSTER_SYMBOL_WEIGHTS_FR0

        # bonus_boost shares BR0 feel with base (no separate BR1 cluster mix).
        return CLUSTER_SYMBOL_WEIGHTS_BR0
