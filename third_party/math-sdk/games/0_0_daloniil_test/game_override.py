"""Cash Stacks state overrides.

Расширяет lines-донор Cash Stacks-механиками:

  - Progress Ladder:        каждые N собранных Bonus (config.ladder_bonuses_per_tier)
                            = новый tier (+spins, +sticky mystery reel)
  - Sticky Mystery Reels:   список барабанов, которые во FS остаются "под маской"
                            и раскрываются в один обычный символ
  - Super Bonus:            старт FS с 1 sticky mystery reel (bonus_super / natural 4× B)

Эта реализация — UI-ceremonial для Этапа 2: эмитит правильные события,
но фактическая линия-эвалюция продолжает работать на оригинальной доске,
не подменяя символы. На production-этапе можно добавить full symbol-substitution.
"""

import copy
import random

from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome
from src.calculations.lines import Lines
from src.events.events import reveal_event
from game_cluster import generate_cluster_board_names
from game_events import (
    bonus_collect_event,
    ladder_tier_up_event,
    mystery_reel_activate_event,
    mystery_reel_unlock_event,
    mystery_reveal_event,
)


class GameStateOverride(GameExecutables):

    # ---- Reset / init ----

    def reset_book(self):
        super().reset_book()
        # Cash Stacks FS-state — обнуляется на каждом новом round.
        self.bonus_collected = 0
        self.ladder_tier = 0
        self.mystery_reels: list[int] = []
        # Запоминаем сколько B упало в base-триггер FS (3 = normal, 4 = super).
        self.fs_trigger_bonus_count = 0
        # FS reel profile selected at trigger: "bonus_normal" (FR0) or "bonus_super" (FR1).
        self.fs_profile: str | None = None

    def assign_special_sym_function(self):
        self.special_symbol_functions = {
            "W": [self.assign_mult_property],
        }

    def assign_mult_property(self, symbol) -> dict:
        """Assign multiplier value to Wild symbol in freegame."""
        multiplier_value = 1
        if self.gametype == self.config.freegame_type:
            multiplier_value = get_random_outcome(
                self.get_current_distribution_conditions()["mult_values"][self.gametype]
            )
        symbol.assign_attribute({"multiplier": multiplier_value})

    def check_repeat(self):
        super().check_repeat()
        if self.repeat is False:
            win_criteria = self.get_current_betmode_distributions().get_win_criteria()
            if win_criteria is not None and self.final_win != win_criteria:
                self.repeat = True
                return
            if win_criteria is None and self.final_win == 0:
                self.repeat = True
                return

    def draw_board(self, emit_event: bool = True, trigger_symbol: str = "scatter") -> None:
        """Override: cluster dead boards + FS zero-win cluster replacement."""
        conditions = self.get_current_distribution_conditions()
        if conditions.get("cluster_board") or self.criteria == "0_cluster":
            if self.draw_cluster_board(emit_event=emit_event):
                return

        if self.gametype == self.config.freegame_type:
            super().draw_board(emit_event=False, trigger_symbol=trigger_symbol)
            self.enforce_bonus_symbol_rules()
            win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
            if (
                win_data["totalWin"] == 0
                and random.random() < self.config.fs_cluster_on_dead_fraction
            ):
                self.draw_cluster_board(emit_event=False)
            if emit_event:
                reveal_event(self)
            return

        super().draw_board(emit_event=False, trigger_symbol=trigger_symbol)
        self.enforce_bonus_symbol_rules()
        if emit_event:
            reveal_event(self)

    def draw_cluster_board(self, emit_event: bool = True) -> bool:
        """Build a validated zero-win visual cluster board."""
        betmode = self.get_current_betmode().get_name()
        weights = self.config.get_cluster_symbol_weights(self.gametype, betmode)
        board_names = generate_cluster_board_names(
            self.config,
            weights,
            self.create_symbol,
            global_multiplier=self.global_multiplier,
            max_scatters=2,
        )
        if board_names is None:
            return False

        board = []
        for reel in range(self.config.num_reels):
            col = []
            for row in range(self.config.num_rows[reel]):
                col.append(self.create_symbol(board_names[reel][row]))
            board.append(col)
        self.board = board
        self.get_special_symbols_on_board()
        self.enforce_bonus_symbol_rules()
        self.anticipation = [0] * self.config.num_reels
        self.reel_positions = [0] * self.config.num_reels
        self.padding_position = [0] * self.config.num_reels
        self.reelstrip_id = "CLUSTER"
        if self.config.include_padding:
            pool = ["L1", "L2", "L3", "L4", "H4", "H3"]
            self.top_symbols = [self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)]
            self.bottom_symbols = [self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)]
        if emit_event:
            reveal_event(self)
        return True

    def imprint_wins(self) -> None:
        """Tag cluster dead books so the optimizer can split 0 vs 0_cluster fences."""
        if self.criteria == "0_cluster":
            self.record({"criteria": self.criteria})
        super().imprint_wins()

    # ---- Cash Stacks specific ----

    def get_current_distribution_conditions(self) -> dict:
        """Return distribution conditions, applying natural FS profile overrides."""
        conditions = super().get_current_distribution_conditions()
        if self.gametype != self.config.freegame_type or self.fs_profile is None:
            return conditions

        conditions = copy.copy(conditions)
        reel_weights = copy.copy(conditions.get("reel_weights", {}))
        if self.fs_profile == "bonus_super":
            conditions["super_bonus"] = True
            reel_weights[self.config.freegame_type] = {"FR1": 1}
        else:
            conditions["super_bonus"] = False
            reel_weights[self.config.freegame_type] = {"FR0": 1}
        conditions["reel_weights"] = reel_weights
        return conditions

    def count_bonus_on_board(self) -> int:
        """Count Bonus symbols after spec dedupe (max 1 per reel)."""
        return len(self.special_syms_on_board.get("scatter", []))

    def apply_fs_profile_from_trigger(self) -> None:
        """Pick FS reel profile from bet mode or natural trigger B count.

        Natural trigger (base / bonus_boost / special_spins):
          3× B → bonus_normal (FR0, no starting MR)
          4× B → bonus_super  (FR1, 1 starting MR)

        Buy bonus modes keep their purchased profile regardless of forced B count.
        """
        betmode = self.get_current_betmode().get_name()
        if betmode == "bonus_normal":
            self.fs_profile = "bonus_normal"
        elif betmode == "bonus_super":
            self.fs_profile = "bonus_super"
        else:
            count = self.count_bonus_on_board()
            self.fs_trigger_bonus_count = count
            self.fs_profile = "bonus_super" if count >= 4 else "bonus_normal"

    def emit_fs_trigger_bonus_collect(self) -> None:
        """Emit bonusCollect ceremony on the FS trigger board (basegame)."""
        positions = [
            {"reel": pos["reel"], "row": pos["row"]}
            for pos in self.special_syms_on_board.get("scatter", [])
        ]
        if not positions:
            return
        positions = sorted(positions, key=lambda p: p["reel"])
        bonus_collect_event(
            self,
            positions=positions,
            collected_total=len(positions),
            collected_delta=len(positions),
        )

    def is_super_bonus(self) -> bool:
        """True for purchased super bonus or natural 4× B FS trigger."""
        if self.fs_profile == "bonus_super":
            return True
        return bool(self.get_current_distribution_conditions().get("super_bonus", False))

    def init_super_bonus_mystery_reels(self) -> None:
        """Super Bonus стартует с N sticky mystery reels (M3: по умолчанию 1).

        REDESIGN_PLAN §2.2: позиция reels выбирается **случайно** из всех
        доступных, без повторов. Это убирает «всегда слева направо»
        ощущение и приводит к индустрийному стандарту (Money Train,
        Dog House, Wanted Dead or a Wild и т.д.).
        """
        n = self.config.super_bonus_starting_mystery_reels
        n = min(n, self.config.num_reels)
        if n <= 0:
            return
        reels = sorted(random.sample(range(self.config.num_reels), n))
        self.mystery_reels = reels
        mystery_reel_activate_event(self, reels=reels, persistent=True)

    def init_natural_fs_mystery_reels(self) -> None:
        """Natural FS-триггер: НЕТ стартовых Sticky Mystery Reels.

        REDESIGN_PLAN §2.3: trigger-based starting reels убраны. Mystery
        Reels теперь выдаются ИСКЛЮЧИТЕЛЬНО через Progress Ladder
        (каждые 4 собранных B = +1 reel). Метод сохранён как no-op
        для обратной совместимости с существующими call-сайтами в
        gamestate.run_freespin.
        """
        return

    def collect_bonus_symbols(self) -> None:
        """Подсчёт Bonus символов на текущей доске (после reveal), emit event.

        Уважает spec: max 1 B per reel — берётся только первое (top-most) вхождение.
        """
        b_positions = []
        # special_syms_on_board["scatter"] заполняется в Board.create_board_reelstrips.
        for pos in self.special_syms_on_board.get("scatter", []):
            b_positions.append({"reel": pos["reel"], "row": pos["row"]})

        # Enforce 1 per reel — оставляем top-most вхождение на барабане.
        by_reel = {}
        for p in b_positions:
            if p["reel"] not in by_reel:
                by_reel[p["reel"]] = p
        b_positions = sorted(by_reel.values(), key=lambda p: p["reel"])

        if not b_positions:
            return

        delta = len(b_positions)
        self.bonus_collected += delta
        bonus_collect_event(
            self,
            positions=b_positions,
            collected_total=self.bonus_collected,
            collected_delta=delta,
        )

    def check_ladder_tier_up(self) -> None:
        """Проверить пересечение порога Progress Ladder, начислить награды."""
        per_tier = self.config.ladder_bonuses_per_tier
        max_tier = self.config.ladder_max_tier
        new_tier = min(self.bonus_collected // per_tier, max_tier)

        while new_tier > self.ladder_tier and self.ladder_tier < max_tier:
            prev = self.ladder_tier
            self.ladder_tier += 1
            reward_spins = self.config.ladder_spins_per_tier
            rewarded_mystery_reels = self.config.ladder_mystery_reels_per_tier

            # +spins
            self.tot_fs += reward_spins

            # Активируем новый Sticky Mystery Reel (выбираем из ещё не активных).
            newly_activated_reels: list[int] = []
            available = [r for r in range(self.config.num_reels) if r not in self.mystery_reels]
            for _ in range(rewarded_mystery_reels):
                if not available:
                    break
                chosen = random.choice(available)
                available.remove(chosen)
                self.mystery_reels.append(chosen)
                newly_activated_reels.append(chosen)

            ladder_tier_up_event(
                self,
                previous_tier=prev,
                new_tier=self.ladder_tier,
                reward_spins=reward_spins,
                rewarded_mystery_reels=len(newly_activated_reels),
            )
            if newly_activated_reels:
                sorted_reels = sorted(newly_activated_reels)
                mystery_reel_activate_event(
                    self,
                    reels=sorted_reels,
                    persistent=True,
                )
                # M4 (REDESIGN_PLAN §2.3 + §2.5.2): отдельное celebration-
                # событие для frontend overlay-анимации. Эмитится
                # **только** при ladder-unlock-е (НЕ при bonus_super
                # starting reel, который не считается «выигранным» в
                # FS-сессии и не должен триггерить congratulation).
                mystery_reel_unlock_event(
                    self,
                    reels=sorted_reels,
                    tier_after=self.ladder_tier,
                    reward_spins=reward_spins,
                )

    def enforce_bonus_symbol_rules(self) -> None:
        """Enforce Bonus symbol placement rules on the current board.

        Spec:
          - max 1 B per reel (column)
          - max 4 B total on board
        """
        replacement_pool = ["L1", "L2", "L3", "L4"]
        changed = False

        for reel in range(self.config.num_reels):
            b_rows = [
                row for row in range(self.config.num_rows[reel])
                if self.board[reel][row].name == "B"
            ]
            if len(b_rows) > 1:
                for row in b_rows[1:]:
                    self.board[reel][row] = self.create_symbol(
                        random.choice(replacement_pool)
                    )
                changed = True

        if changed:
            self.get_special_symbols_on_board()

        b_reels = sorted(
            reel
            for reel in range(self.config.num_reels)
            if any(
                self.board[reel][row].name == "B"
                for row in range(self.config.num_rows[reel])
            )
        )
        max_bonus = self.config.max_bonus_on_board
        if len(b_reels) > max_bonus:
            for reel in b_reels[max_bonus:]:
                for row in range(self.config.num_rows[reel]):
                    if self.board[reel][row].name == "B":
                        self.board[reel][row] = self.create_symbol(
                            random.choice(replacement_pool)
                        )
            self.get_special_symbols_on_board()

    def enforce_one_bonus_per_reel(self) -> None:
        """Backward-compatible alias for enforce_bonus_symbol_rules."""
        self.enforce_bonus_symbol_rules()

    def apply_mystery_reels(self) -> None:
        """Накрыть все cells на активных Sticky Mystery Reels символом M.

        Вызывается ПОСЛЕ draw_board, ДО emit_mystery_reveal. Гарантирует, что
        клиент получает reveal_event с правильным M-state на mystery reels
        (любые B/W/H/L символы из reelstrip скрываются под маской).

        NB: оригинальный draw_board уже эмитнул reveal_event с reelstrip-доской.
        Чтобы клиент видел M, нужно вызывать это ДО первого reveal_event либо
        переопределять reveal-эмит. Мы выбираем второй путь: эмитим повторный
        reveal_event поверх M-state.
        """
        if not self.mystery_reels:
            return
        for reel_idx in self.mystery_reels:
            for row in range(self.config.num_rows[reel_idx]):
                self.board[reel_idx][row] = self.create_symbol("M")
        # Пересобираем индекс спецсимволов на доске (B мог пропасть на mystery reel).
        self.get_special_symbols_on_board()

    def emit_mystery_reveal(self) -> None:
        """Для каждого активного mystery reel ЗАМЕНИТЬ клетки одним символом
        и эмитнуть mystery_reveal_event.

        Все активные mystery reels раскрываются в ОДИН и тот же символ —
        это ключевое правило механики: игрок видит, что все маски скрывали
        одинаковый символ (единый «destiny reveal»).

        Использует weighted random из `mystery_reveal_pool_weights` (см.
        game_config.py). W включён в пул с малым весом, чтобы 5×W был
        достижим в bonus_super — см. MATH_BLOCKERS.md M3.

        Линия-эвалюция (`evaluate_lines_board`) ниже работает с уже раскрытой
        доской — выигрыши на mystery reels считаются корректно.
        """
        if not self.mystery_reels:
            return
        weights_map = self.config.mystery_reveal_pool_weights
        symbols = list(weights_map.keys())
        weights = list(weights_map.values())

        # Один символ для ВСЕХ mystery reels на этом спине.
        revealed_symbol = random.choices(symbols, weights=weights, k=1)[0]

        for reel_idx in self.mystery_reels:
            positions = [
                {"reel": reel_idx, "row": row}
                for row in range(self.config.num_rows[reel_idx])
            ]
            # Подмена символов на доске: M → revealed_symbol.
            # NB: для W это означает, что ВСЕ cells mystery reels становятся Wild.
            # Wild substitution на линиях обрабатывается стандартным Lines.get_lines.
            # Wild multiplier (×2..×50 в FS) приходит из assign_mult_property
            # в game_override (на создание символа в create_symbol).
            for p in positions:
                self.board[p["reel"]][p["row"]] = self.create_symbol(revealed_symbol)
            mystery_reveal_event(
                self,
                revealed_symbol=revealed_symbol,
                positions=positions,
            )
        # После всех замен — обновляем индекс спецсимволов.
        self.get_special_symbols_on_board()
