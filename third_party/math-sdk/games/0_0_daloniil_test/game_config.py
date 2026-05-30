"""Cash Stacks (daloniil_test) — game configuration.

5 reels × 5 rows, 25 paylines (smooth-only), RTP 96.01%, max win ×2500.
Donor: 0_0_lines. См. games/0_0_daloniil_test/readme.txt и
MATH_REDESIGN_PLAN.md (volatility / no-jump paylines).
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
        self.game_id = "0_0_daloniil_test"
        self.provider_number = 0
        self.working_name = "Cash Stacks"
        self.wincap = 2_500.0
        self.win_type = "lines"
        self.rtp = 0.9601
        self.construct_paths()

        # === Cash Stacks dimensions ===
        self.num_reels = 5
        self.num_rows = [5] * self.num_reels

        # === Paytable ===
        # Wild платит только на 5 of a kind (см. 0_0_lines readme).
        # B (Bonus) — scatter-like trigger, без line-pay.
        #
        # MATH_REDESIGN_PLAN.md §2.2 (Опция A): убрали 3-of-a-kind у Low
        # символов — это решает «много линий горит, выигрыш < ставки».
        # Минимум 3-OAK low был 0.1 × bet (Stake RGS: payout cents %10 == 0)
        # × ~5–8 линий на хит → +0.5–0.8 bet, что меньше ставки даже при
        # «ярком» визуале. Удалив 3OAK low, мы перебрасываем эту RTP-долю
        # в 4-OAK (×1.67) и 5-OAK (×2) low, поэтому минимальный выигрыш
        # становится 4×L = 0.5 × bet × N линий.
        #
        # High-tier paytable не трогаем (§2.3 — отдельный шаг).
        # Финальные веса (RTP=96.01%) — подкрутит optimization-run.
        self.paytable = {
            (5, "W"): 225.0,
            # H1 (highest) — без изменений
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
            (3, "H4"): 0.7,  # Stake RGS: payout cents must be multiple of 10
            # Low symbols — все одинаковые. 3-OAK УДАЛЁН (Опция A).
            # 4-OAK ×1.67 (0.3 → 0.5), 5-OAK ×2 (1.5 → 3.0).
            (5, "L1"): 3.0,
            (4, "L1"): 0.5,
            (5, "L2"): 3.0,
            (4, "L2"): 0.5,
            (5, "L3"): 3.0,
            (4, "L3"): 0.5,
            (5, "L4"): 3.0,
            (4, "L4"): 0.5,
        }

        # === 25 paylines (5×5, rows 0..4) — все smooth ===
        # MATH_REDESIGN_PLAN.md §2.1: убрали 6 «прыгающих» линий (с
        # delta=2 между соседними барабанами) и расширили набор до 25
        # smooth-линий, разбитых на 7 семейств. Все линии: |Δ row| ≤ 1
        # между соседними барабанами — глаз «считает» их без прыжков.
        #
        # ВАЖНО: web-sdk apps/daloniil_test/src/game/config.ts:paylines
        # ДОЛЖЕН зеркалить этот dict ключ-в-ключ. PaylineOverlay смотрит
        # rows по ключу из meta.lineIndex (см. config.ts:78-83).
        self.paylines = {
            # Группа 1: 5 горизонталей
            1: [0, 0, 0, 0, 0],
            2: [1, 1, 1, 1, 1],
            3: [2, 2, 2, 2, 2],
            4: [3, 3, 3, 3, 3],
            5: [4, 4, 4, 4, 4],
            # Группа 2: V «улыбка»
            6: [0, 1, 2, 1, 0],
            7: [1, 2, 3, 2, 1],
            8: [2, 3, 4, 3, 2],
            # Группа 3: ^ «бровь»
            9:  [4, 3, 2, 3, 4],
            10: [3, 2, 1, 2, 3],
            11: [2, 1, 0, 1, 2],
            # Группа 4: диагонали
            12: [0, 1, 2, 3, 4],
            13: [4, 3, 2, 1, 0],
            # Группа 5: hooks край → центр
            14: [0, 1, 2, 2, 2],
            15: [4, 3, 2, 2, 2],
            16: [2, 2, 2, 1, 0],
            17: [2, 2, 2, 3, 4],
            # Группа 6: ступеньки от края
            18: [0, 0, 1, 2, 2],
            19: [4, 4, 3, 2, 2],
            20: [2, 2, 1, 0, 0],
            21: [2, 2, 3, 4, 4],
            # Группа 7: горизонталь с провалом в центр
            22: [0, 1, 1, 1, 0],
            23: [4, 3, 3, 3, 4],
            24: [1, 0, 0, 0, 1],
            25: [3, 4, 4, 4, 3],
        }

        self.include_padding = True
        # В Cash Stacks Bonus ('B') играет роль scatter (триггер FS, collectible в FS).
        # Wild имеет multiplier в FS (как в lines).
        self.special_symbols = {
            "wild": ["W"],
            "scatter": ["B"],
            "multiplier": ["W"],
            "mystery": ["M"],
        }

        # FS triggers: 3+ Bonus в base = 10 spins.
        #
        # ВАЖНО: в Cash Stacks **единственный** retrigger source — Progress Ladder
        # (+3 spins per tier, max 5 tier-ов; см. game_override.check_ladder_tier_up).
        # SDK-стандартный scatter-retrigger в FS НЕ используется:
        #   - run_freespin не вызывает check_fs_condition / update_fs_retrigger_amt
        #   - update_fs_retrigger_amt SDK сам нигде не вызывает (dead code в src/executables)
        # Поэтому `freespin_triggers[freegame_type]` = {} — никаких ретриггеров от B в FS.
        # См. MATH_BLOCKERS.md M7.
        self.freespin_triggers = {
            self.basegame_type: {3: 10, 4: 10, 5: 10},
            self.freegame_type: {},
        }
        # anticipation_triggers — порог для anticipation animation.
        # M4b (REDESIGN_PLAN §2.4): anticipation полностью отключён в обоих
        # gametype. Условие в SDK `len(scatters) >= threshold` никогда не
        # сработает, потому что num_reels+1 (=6) больше любого возможного len.
        # Эффект: в book-events `anticipation` всегда [0]*num_reels.
        # Уход от generic-механики освобождает визуальное поле для премиум-
        # моментов (mystery-reveal + Sticky Mystery Reel unlock celebration).
        self.anticipation_triggers = {
            self.basegame_type: self.num_reels + 1,
            self.freegame_type: self.num_reels + 1,
        }

        # === Cash Stacks-specific params ===
        # Progress Ladder: каждые N собранных Bonus = новый tier.
        self.ladder_bonuses_per_tier = 4
        self.ladder_max_tier = 5
        self.ladder_spins_per_tier = 3
        # Сколько Sticky Mystery Reels приходит с каждым tier (cumulative).
        self.ladder_mystery_reels_per_tier = 1
        # Super Bonus стартует с указанного количества Mystery Reels,
        # позиция выбирается СЛУЧАЙНО (см. game_override.init_super_bonus_mystery_reels).
        # M3 (REDESIGN_PLAN §2.2): уменьшено с 3 до 1, чтобы сохранить
        # роль Progress Ladder как основного источника mystery reels даже
        # в купленном bonus_super режиме. Один стартовый reel — «премиум
        # бонус за покупку», эквивалентный «уже собранным 4 B».
        self.super_bonus_starting_mystery_reels = 1

        # MYSTERY REVEAL POOL — weighted random distribution
        # ──────────────────────────────────────────────────
        # Когда Sticky Mystery Reel раскрывается, ВСЕ 5 cells reel-а становятся
        # одним символом из этого пула с указанными весами (см. emit_mystery_reveal).
        #
        # Design choice — weighted (не uniform):
        #
        #   - W ВКЛЮЧЁН в пул, чтобы 5×W (top payout ×150) был достижим в bonus_super.
        #     Без W в пуле 5×W было математически невозможно в Super режиме —
        #     compliance issue (paytable обещает выплату, недостижимую в купленном
        #     режиме). См. MATH_BLOCKERS.md M3.
        #
        #   - Веса подобраны так, чтобы:
        #       P(W)   ≈ 2.4%  (rare, controls volatility)
        #       P(H*)  ≈ 41%   (premium reveals, 4 символа × ~10%)
        #       P(L*)  ≈ 57%   (low reveals, 4 символа × ~14%)
        #
        #   - При 3 mystery reels в Super:
        #       P(≥1 reveals as W) ≈ 1 - (41/42)³ = 7%
        #       P(all 3 as W)      ≈ (1/42)³ = 0.0013%
        #     Это даёт чувствительно ниже volatility чем uniform pool с W
        #     (P(reveal=W)=11%, P(all 3 W)=0.14%).
        #
        # Веса можно подкручивать на этапе reelstrip-tuning (M4) и optimization (M1).
        self.mystery_reveal_pool_weights = {
            "W":  1,   # rare top-tier (×150 line, +multiplier ×2..×50)
            "H1": 3,   # premium
            "H2": 4,
            "H3": 5,
            "H4": 5,
            "L1": 6,   # low (frequent)
            "L2": 6,
            "L3": 6,
            "L4": 6,
        }
        # Backward-compat: list для legacy кода (если где-то остался random.choice).
        # Веса игнорируются при использовании списка; основной путь — weighted.
        self.mystery_reveal_pool = list(self.mystery_reveal_pool_weights.keys())

        # === Reels ===
        reels = {
            "BR0": "BR0.csv",  # basegame default
            "BR1": "BR1.csv",  # bonus_boost basegame (агрессивнее)
            "BR2": "BR2.csv",  # special_spins basegame (гарантированный FS)
            "FR0": "FR0.csv",  # freegame default
            "FR1": "FR1.csv",  # freegame для super bonus (больше Mystery)
            "WCAP": "FRWCAP.csv",
        }
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))

        self.padding_reels[self.basegame_type] = self.reels["BR0"]
        self.padding_reels[self.freegame_type] = self.reels["FR0"]
        # Wild multiplier values (для FS).
        self.padding_symbol_values = {
            "W": {"multiplier": {2: 100, 3: 50, 4: 30, 5: 20, 10: 10, 20: 5, 50: 2}}
        }

        # === Distribution conditions ===
        freegame_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 50, 4: 20, 5: 5},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 60, 3: 80, 4: 50, 5: 20, 10: 15, 20: 10, 50: 5},
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

        zerowin_condition = {
            "reel_weights": {self.basegame_type: {"BR0": 1}},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 100, 3: 80, 4: 50, 5: 20, 10: 10, 20: 5, 50: 1},
            },
            "force_wincap": False,
            "force_freegame": False,
        }

        # WINCAP CRITERION
        # ────────────────
        # Wincap снижен с 25,000 до 2,500. С таким лимитом wincap **достижим
        # и в base, и в FS** (max basegame line win ≈ 5×W (×225) × 20 paylines
        # = 4,500 за спин, что уже превышает 2,500). Тем не менее distribution
        # sampling по-прежнему гонит wincap-сэмплы через FS path:
        #
        #   - `force_freegame: True` — quota для покрытия FS-tail событий;
        #   - `force_wincap: True`   — симуляция обязана дойти до wincap-trigger
        #     (`evaluate_wincap` в SDK executables);
        #   - W в FS получает multiplier ×2..×50 (см. padding_symbol_values),
        #     поэтому wincap легко набирается на одной линии в FS.
        #
        # NOTE (после уменьшения wincap): force_freegame в `wincap_condition`
        # больше не является структурной необходимостью — wincap теперь может
        # выпадать и в base. Если хочется естественнее распределять wincap
        # между base и FS path, можно ослабить эти флаги; пока сохраняем
        # текущее поведение, чтобы не ломать сэмплинг до полного rerun-а
        # optimization-а.
        wincap_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1, "WCAP": 5},
            },
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 10, 3: 20, 4: 50, 5: 60, 10: 100, 20: 90, 50: 50},
            },
            "scatter_triggers": {4: 1, 5: 2},
            "force_wincap": True,
            "force_freegame": True,
        }

        # Bonus Boost — отдельный reelstrip с большим количеством Bonus символов.
        bonus_boost_basegame_condition = {
            "reel_weights": {self.basegame_type: {"BR1": 1}},
            "mult_values": {self.basegame_type: {1: 1}},
            "force_wincap": False,
            "force_freegame": False,
        }
        bonus_boost_freegame_condition = {
            "reel_weights": {
                self.basegame_type: {"BR1": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 60, 4: 25, 5: 8},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 60, 3: 80, 4: 50, 5: 20, 10: 15, 20: 10, 50: 5},
            },
            "force_wincap": False,
            "force_freegame": True,
        }

        # Special Spins — гарантированный FS trigger.
        special_spins_freegame_condition = {
            "reel_weights": {
                self.basegame_type: {"BR2": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 70, 4: 20, 5: 10},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 60, 3: 80, 4: 50, 5: 20, 10: 15, 20: 10, 50: 5},
            },
            "force_wincap": False,
            "force_freegame": True,
        }

        # Buy Bonus (Normal) — гарантированный FS, обычные reelstrips.
        # Cost = 100. Target RTP per spin = 96 bet. Поэтому FS должен avg ≈ 96 bet/spin.
        # M4 Iter 1: avg FS payout = 30 bet → нужно ×3.2 boost через мульты.
        # Avg multiplier shifted: {2:60→20, 3:80→30, 4:50→30, 5:20→20, 10:15→40, 20:10→50, 50:5→40}
        #   New weighted avg = (40 + 90 + 120 + 100 + 400 + 1000 + 2000)/230 = 3750/230 = 16.3x (от 5.25x).
        buy_normal_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR0": 1},
            },
            "scatter_triggers": {3: 50, 4: 20, 5: 5},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 20, 3: 30, 4: 30, 5: 20, 10: 40, 20: 50, 50: 40},
            },
            "force_wincap": False,
            "force_freegame": True,
        }

        # Buy Bonus (Super) — гарантированный FS со старта × 3 Mystery Reels.
        # Cost = 200. Target RTP per spin = 192 bet → FS avg ≈ 192 bet/spin.
        # M4 Iter 1: avg FS payout (FR1) = 50 bet → нужно ×3.8 boost.
        # Boost мультов сильнее чем в buy_normal:
        #   {2:5, 3:10, 4:20, 5:30, 10:50, 20:60, 50:50} avg = (10+30+80+150+500+1200+2500)/225 = 4470/225 = 19.9x
        # Использует FR1 (FS reelstrip с большим Mystery-весом).
        buy_super_condition = {
            "reel_weights": {
                self.basegame_type: {"BR0": 1},
                self.freegame_type: {"FR1": 1},
            },
            "scatter_triggers": {3: 50, 4: 20, 5: 5},
            "mult_values": {
                self.basegame_type: {1: 1},
                self.freegame_type: {2: 5, 3: 10, 4: 20, 5: 30, 10: 50, 20: 60, 50: 50},
            },
            "force_wincap": False,
            "force_freegame": True,
            # Cash Stacks-custom flag — обрабатывается в gamestate.run_freespin.
            "super_bonus": True,
        }

        # === Bet modes ===
        mode_maxwins = {
            "base": self.wincap,
            "bonus_boost": self.wincap,
            "special_spins": self.wincap,
            "bonus_normal": self.wincap,
            "bonus_super": self.wincap,
        }

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
                    Distribution(criteria="freegame", quota=0.1, conditions=freegame_condition),
                    Distribution(criteria="0", quota=0.4, win_criteria=0.0, conditions=zerowin_condition),
                    Distribution(criteria="basegame", quota=0.499, conditions=basegame_condition),
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
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["bonus_boost"],
                        conditions=wincap_condition,
                    ),
                    Distribution(criteria="freegame", quota=0.18, conditions=bonus_boost_freegame_condition),
                    Distribution(criteria="0", quota=0.35, win_criteria=0.0, conditions=bonus_boost_basegame_condition),
                    Distribution(criteria="basegame", quota=0.469, conditions=bonus_boost_basegame_condition),
                ],
            ),
            BetMode(
                name="special_spins",
                cost=30.0,
                rtp=self.rtp,
                max_win=mode_maxwins["special_spins"],
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="wincap",
                        quota=0.002,
                        win_criteria=mode_maxwins["special_spins"],
                        conditions=wincap_condition,
                    ),
                    Distribution(criteria="freegame", quota=0.998, conditions=special_spins_freegame_condition),
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
                    Distribution(
                        criteria="wincap",
                        quota=0.001,
                        win_criteria=mode_maxwins["bonus_normal"],
                        conditions=wincap_condition,
                    ),
                    Distribution(criteria="freegame", quota=0.999, conditions=buy_normal_condition),
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
                        win_criteria=mode_maxwins["bonus_super"],
                        conditions=wincap_condition,
                    ),
                    Distribution(criteria="freegame", quota=0.998, conditions=buy_super_condition),
                ],
            ),
        ]

    # NOTE: Cash Stacks 4-tier win-level map (overrides SDK default 10-tier
    # `standard`/`endFeature` tables in src/config/config.py).
    #
    # Front-end (web-sdk apps/daloniil_test/src/game/winLevelMap.ts) interprets
    # the integer level returned here, so any change MUST be mirrored there.
    #
    #   1..5 → no full-screen banner, just count-up ticker
    #   6    → BIG WIN          (10x..50x)
    #   7    → SUPER WIN        (50x..100x)
    #   8    → EPIC WIN         (100x..250x)
    #   9    → SENSATIONAL WIN  (250x..wincap=2500x)
    #   10   → SENSATIONAL WIN  (wincap..∞ — same visual tier as 9)
    #
    # Same table is used for both base game (`setWin`) and FS outro
    # (`freeSpinEnd`); `winlevel_key` is accepted for SDK signature
    # compatibility but ignored.
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
            9: (250.0, self.wincap),
            10: (self.wincap, float("inf")),
        }
        for idx, (lo, hi) in levels.items():
            if win_amount >= lo and win_amount < hi:
                return idx
        # Fallback for floating-point edge at exactly wincap+ε already covered
        # by level 10 (open upper bound). Anything below 0 → level 1.
        return 1
