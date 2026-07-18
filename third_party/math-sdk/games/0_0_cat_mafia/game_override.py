"""Cat Mafia state overrides — paw / SW / XOR / target pick / bullets / shoot."""

import random

from game_executables import GameExecutables
from src.calculations.statistics import get_random_outcome
from src.calculations.lines import Lines
from src.events.events import reveal_event, fs_trigger_event
from game_cluster import generate_cluster_board_names
from game_events import (
    paw_coin_resolve_event,
    super_wild_expand_event,
    free_spin_target_pick_event,
    bullet_collect_event,
    target_shoot_round_event,
)
from game_features import (
    find_paws,
    find_super_wilds,
    sw_positions_in_wins,
    resolve_xor,
    build_paw_resolve,
    expand_sw_columns,
    pick_fs_targets,
    collect_bullets,
    run_target_shoot,
)


class GameStateOverride(GameExecutables):

    def reset_book(self):
        super().reset_book()
        self.fs_trigger_bonus_count = 0
        self.fs_profile: str | None = None  # bonus_normal | bonus_super
        self.drum_count = 0
        self.fs_main_total = 0
        self.fs_extra_phase = False
        self.chosen_fs = 0
        self.target_pick = None

    def assign_special_sym_function(self):
        self.special_symbol_functions = {
            "SW": [self.assign_sw_mult_property],
        }

    def assign_sw_mult_property(self, symbol) -> None:
        weights = self.config.sw_mult_weights
        # Prefer distribution mult_values when in FS if present.
        conditions = self.get_current_distribution_conditions()
        mult_map = conditions.get("mult_values", {}).get(self.gametype)
        if mult_map:
            weights = mult_map
        multiplier_value = get_random_outcome(weights)
        symbol.assign_attribute({"multiplier": int(multiplier_value)})

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
        conditions = self.get_current_distribution_conditions()
        if conditions.get("cluster_board") or self.criteria == "0_cluster":
            if self.draw_cluster_board(emit_event=emit_event):
                return

        super().draw_board(emit_event=False, trigger_symbol=trigger_symbol)
        self.enforce_bonus_symbol_rules()
        self.enforce_feature_symbol_rules()
        if emit_event:
            reveal_event(self)

    def draw_cluster_board(self, emit_event: bool = True) -> bool:
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
            self.top_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
            self.bottom_symbols = [
                self.create_symbol(random.choice(pool)) for _ in range(self.config.num_reels)
            ]
        if emit_event:
            reveal_event(self)
        return True

    def enforce_bonus_symbol_rules(self) -> None:
        """Max 1 B per reel; cap total B on board."""
        max_b = getattr(self.config, "max_bonus_on_board", 5)
        seen_reels = set()
        total = 0
        for reel, col in enumerate(self.board):
            for row, cell in enumerate(col):
                if cell.name != "B":
                    continue
                if reel in seen_reels or total >= max_b:
                    self.board[reel][row] = self.create_symbol("L1")
                else:
                    seen_reels.add(reel)
                    total += 1
        self.get_special_symbols_on_board()

    def enforce_feature_symbol_rules(self) -> None:
        """Base: no BT. FS: no P. Cap drum bullets already via collect."""
        if self.gametype == self.config.basegame_type:
            for reel, col in enumerate(self.board):
                for row, cell in enumerate(col):
                    if cell.name == "BT":
                        self.board[reel][row] = self.create_symbol("L2")
        else:
            for reel, col in enumerate(self.board):
                for row, cell in enumerate(col):
                    if cell.name == "P":
                        self.board[reel][row] = self.create_symbol("BT" if not self.fs_extra_phase else "L2")
        self.get_special_symbols_on_board()

    def is_super_bonus(self) -> bool:
        if self.fs_profile == "bonus_super":
            return True
        conditions = self.get_current_distribution_conditions()
        return bool(conditions.get("super_bonus"))

    def apply_fs_profile_from_trigger(self) -> None:
        """3× B → normal, 4+ B → super; buy modes override."""
        betmode = self.get_current_betmode().get_name()
        count = self.count_special_symbols("scatter")
        self.fs_trigger_bonus_count = count
        if betmode == "bonus_super" or self.get_current_distribution_conditions().get("super_bonus"):
            self.fs_profile = "bonus_super"
        elif betmode == "bonus_normal":
            self.fs_profile = "bonus_normal"
        else:
            self.fs_profile = "bonus_super" if count >= 4 else "bonus_normal"

    def emit_free_spin_target_pick(self) -> None:
        targets, chosen_index, awarded = pick_fs_targets(self.config)
        self.target_pick = {
            "targets": targets,
            "chosenIndex": chosen_index,
            "awardedFs": awarded,
        }
        self.chosen_fs = awarded
        free_spin_target_pick_event(self, targets, chosen_index, awarded)

    def update_freespin_amount(self, scatter_key: str = "scatter") -> None:
        """FS count from target pick (not scatter table)."""
        if self.chosen_fs <= 0:
            # Fallback if pick somehow skipped
            self.chosen_fs = 10
        self.tot_fs = int(self.chosen_fs)
        self.fs_main_total = int(self.chosen_fs)
        if self.gametype == self.config.basegame_type:
            basegame_trigger, freegame_trigger = True, False
        else:
            basegame_trigger, freegame_trigger = False, True
        fs_trigger_event(self, basegame_trigger=basegame_trigger, freegame_trigger=freegame_trigger)

    # ---- Base / FS feature resolve ----

    def evaluate_lines_board(self):
        """Standard lines eval + emit."""
        self.win_data = Lines.get_lines(
            self.board,
            self.config,
            global_multiplier=self.global_multiplier,
        )
        Lines.record_lines_wins(self)
        self.win_manager.update_spinwin(self.win_data["totalWin"])
        Lines.emit_linewin_events(self)

    def resolve_base_spin_features(self) -> None:
        """After line eval: XOR paw OR superWildExpand."""
        paws = find_paws(self.board)
        sw_hits = find_super_wilds(self.board)
        sw_in_win = bool(sw_positions_in_wins(sw_hits, self.win_data))
        want_paw = bool(paws)
        want_sw = bool(sw_hits) and sw_in_win
        want_paw, want_sw = resolve_xor(want_paw, want_sw)

        if want_sw:
            self._apply_super_wild_expand(sw_hits, re_eval=True)
        elif want_paw:
            self._apply_paw_resolve()

    def resolve_fs_spin_features(self) -> None:
        """FS: SW by mode; bullets on main FS only."""
        if self.is_super_bonus():
            # Board already pre-expanded; apply productMult + emit for client.
            self._apply_super_product_after_preexpand()
        else:
            sw_hits = find_super_wilds(self.board)
            if sw_hits:
                self._apply_super_wild_expand(sw_hits, re_eval=True)

        if not self.fs_extra_phase:
            bullets, new_drum = collect_bullets(
                self.board, self.drum_count, self.config.drum_max
            )
            if bullets:
                self.drum_count = new_drum
                bullet_collect_event(self, bullets, self.drum_count)

    def apply_super_sw_pre_expand(self) -> list[dict]:
        """Super Bonus: SW columns open on land (before line eval). Returns expands meta."""
        sw_hits = find_super_wilds(self.board)
        if not sw_hits:
            self._pending_sw_expands = []
            self._pending_sw_product = 1
            return []
        expands, product = expand_sw_columns(self.board, self.create_symbol, sw_hits)
        self._pending_sw_expands = expands
        self._pending_sw_product = product
        return expands

    def _apply_super_product_after_preexpand(self) -> None:
        expands = getattr(self, "_pending_sw_expands", []) or []
        product = int(getattr(self, "_pending_sw_product", 1) or 1)
        if not expands:
            return
        if product > 1 and self.win_manager.spin_win > 0:
            from src.events.events import set_win_event, set_total_event

            self.win_manager.set_spin_win(round(self.win_manager.spin_win * product, 2))
            set_win_event(self)
            set_total_event(self)
        super_wild_expand_event(self, expands, product)
        self._pending_sw_expands = []
        self._pending_sw_product = 1

    def _apply_super_wild_expand(self, sw_hits, re_eval: bool = True) -> None:
        expands, product = expand_sw_columns(self.board, self.create_symbol, sw_hits)
        if not expands:
            return
        if re_eval:
            from src.events.events import set_win_event, set_total_event

            self.win_data = Lines.get_lines(
                self.board,
                self.config,
                global_multiplier=self.global_multiplier,
            )
            new_total = round(float(self.win_data["totalWin"]) * product, 2)
            self.win_manager.set_spin_win(new_total)
            if new_total > 0:
                Lines.record_lines_wins(self)
                set_win_event(self)
            set_total_event(self)

        super_wild_expand_event(self, expands, product)

    def _apply_paw_resolve(self) -> None:
        paws, rows, total = build_paw_resolve(self.board, bet=1.0)
        if not paws:
            return
        paw_coin_resolve_event(self, paws, rows, total)
        if total > 0:
            from src.events.events import set_total_event

            self.win_manager.update_spinwin(total)
            set_total_event(self)

    def run_target_shoot_round(self) -> None:
        if self.fs_extra_phase:
            return
        if self.drum_count <= 0:
            # No bullets — still mark extra phase so we never shoot twice.
            self.fs_extra_phase = True
            return
        shots, extra = run_target_shoot(
            self.drum_count,
            self.config.shoot_reward_weights,
            target_count=9,
        )
        target_shoot_round_event(self, shots, extra)
        self.drum_count = 0
        self.fs_extra_phase = True
        if extra > 0:
            self.tot_fs += int(extra)
